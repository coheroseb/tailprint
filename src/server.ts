import Fastify, { type FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import scalarFastifyApiReference from '@scalar/fastify-api-reference';
import fastifyRawBody from 'fastify-raw-body';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import { renderRoutes } from './routes/render.js';
import { webhookRoutes } from './routes/webhooks.js';
import { templateRoutes } from './routes/templates.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { scrapeRoutes } from './routes/scrape.js';
import { mcpRoutes } from './routes/mcp.js';
import { usageRoutes } from './routes/usage.js';
import { toolsRoutes } from './routes/tools.js';
import { browserService, RenderTimeoutError } from './services/browser.js';
import { redisService } from './services/redis.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: env.NODE_ENV !== 'test' ? {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    } : false,
  });

  // 1. Zod type provider integration
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // 2. Raw body plugin (for Stripe signature validation)
  await fastify.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // 3. Swagger OpenAPI 3.1 specification
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Tailprint API',
        version: '1.0.0',
        description:
          'Tailprint is the high-performance Tailwind-Native Render & PDF Engine + AI Web Scraper (https://tailprint.com).\n\n' +
          'Convert HTML styled with Tailwind CSS into pixel-perfect PDF documents and Open Graph preview images. Scrape any public URL into token-efficient Markdown for LLMs with 90%+ context savings.\n\n' +
          '### Authentication\n' +
          'All requests to `/v1/...` require an API key passed in the Authorization header:\n' +
          '```http\n' +
          'Authorization: Bearer sec_live_...\n' +
          '```\n' +
          'To obtain an API key or manage your plan, visit [tailprint.com/#pricing](https://tailprint.com/#pricing) or access your [Customer Dashboard](https://tailprint.com/dashboard).\n\n' +
          '---\n\n' +
          '### 🤖 Model Context Protocol (MCP) Reference\n' +
          'Tailprint provides a production-grade, 100% compliant Model Context Protocol server exposing **13 Native Tools** across local stdio and remote Server-Sent Events (SSE):\n\n' +
          '| MCP Tool | Category | Returns | Purpose |\n' +
          '|---|---|---|---|\n' +
          '| `render_pdf` | Documents | PDF Link + Base64 | Renders Tailwind HTML or public URL into vector PDF with headers/footers & encryption. |\n' +
          '| `render_image` | Open Graph | Inline PNG + CDN Link | Renders Open Graph social preview cards from Tailwind CSS. |\n' +
          '| `render_chart` | Data Visuals | Inline PNG + CDN Link | High-DPI bar, line, radar, doughnut, and pie charts with Chart.js. |\n' +
          '| `generate_qr` | Utilities | Inline PNG + CDN Link | Mathematically verified scan-ready QR codes and barcodes. |\n' +
          '| `render_device_mockup` | Marketing | Inline PNG + CDN Link | Wraps any URL into a MacBook Pro + floating iPhone 16 studio mockup canvas. |\n' +
          '| `stamp_pdf` | Security | PDF Link + Base64 | Stamps diagonal watermarks (CONFIDENTIAL, DRAFT, FORTROLIGT) across all PDF pages. |\n' +
          '| `compare_snapshots` | QA / Testing | Inline PNG + CDN Link | 3-panel visual regression diff heatmap highlighting layout shifts with neon-pink overlay. |\n' +
          '| `render_carousel` | Social Media | LinkedIn PDF + PNG Cover | Multi-slide 1080x1350 px portrait carousels for LinkedIn and Instagram. |\n' +
          '| `generate_einvoice` | Compliance / EU | Hybrid PDF + Factur-X XML | Generates EU-compliant hybrid e-invoices (Factur-X / ZUGFeRD / EN 16931) with embedded CII XML. |\n' +
          '| `scrape_markdown` | AI Ingestion | Clean Markdown | Scrapes any web URL, stripping cookie walls and ads with 90%+ token savings. |\n' +
          '| `render_template` | Automation | PDF / PNG + CDN Link | Directly renders 8 pre-built Tailwind templates with data substitution. |\n' +
          '| `list_templates` | Automation | JSON Catalog | Lists all available templates in the Tailprint catalog. |\n' +
          '| `get_template_source` | Automation | HTML Source | Retrieves full template source code for LLM inspection and customization. |\n\n' +
          '#### Connecting Claude Desktop\n' +
          'Add this configuration to `~/Library/Application Support/Claude/claude_desktop_config.json`:\n' +
          '```json\n' +
          '{\n' +
          '  "mcpServers": {\n' +
          '    "tailprint": {\n' +
          '      "command": "npx",\n' +
          '      "args": ["-y", "tailprint"],\n' +
          '      "env": {\n' +
          '        "TAILPRINT_API_KEY": "sec_live_your_key_here"\n' +
          '      }\n' +
          '    }\n' +
          '  }\n' +
          '}\n' +
          '```\n\n' +
          '#### Remote SSE Endpoint\n' +
          'Connect remote AI runtimes directly to `GET https://tailprint.com/v1/mcp/sse?api_key=sec_live_...`.',
        contact: {
          name: 'Tailprint Support',
          url: 'https://tailprint.com',
          email: 'support@tailprint.com',
        },
      },
      servers: [
        {
          url: 'https://tailprint.com',
          description: 'Production Server (HTTPS)',
        },
        {
          url: 'https://api.tailprint.com',
          description: 'Production API Subdomain (HTTPS)',
        },
        {
          url: `http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}`,
          description: 'Local Development Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key',
            description: 'Provide your API key in the format: Bearer sec_live_...',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  // 4. Scalar interactive documentation on /docs with dark mode
  await fastify.register(scalarFastifyApiReference, {
    routePrefix: '/docs',
    configuration: {
      theme: 'purple',
      darkMode: true,
      metaData: {
        title: 'Tailprint API Reference',
        description: 'Official API documentation and interactive test console for Tailprint (https://tailprint.com)',
      },
    },
  });

  // Health check endpoint
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Service Health Check',
        description: 'Returns health status and connected subsystems status.',
      },
    },
    async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        redisFallback: redisService.isMemoryFallback,
        uptime: process.uptime(),
      };
    }
  );

  // 5. Register application routes
  await fastify.register(templateRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(renderRoutes);
  await fastify.register(scrapeRoutes);
  await fastify.register(mcpRoutes);
  await fastify.register(usageRoutes);
  await fastify.register(toolsRoutes);
  await fastify.register(webhookRoutes);

  // 6. Centralized Error Handler
  fastify.setErrorHandler((error: any, request, reply) => {
    request.log.error({ err: error }, 'Request processing error');

    // Handle Strict Playwright Timeout
    if (error instanceof RenderTimeoutError || error?.name === 'RenderTimeoutError') {
      return reply.code(504).send({
        statusCode: 504,
        error: 'Gateway Timeout',
        message: error?.message || `Render processing exceeded strict timeout limit of ${env.RENDER_TIMEOUT_MS}ms`,
      });
    }

    // Handle Zod Validation Errors
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed for request input',
        details: error.validation,
      });
    }

    // Pass through explicit Fastify HTTP error status
    const statusCode = error?.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;

    return reply.code(statusCode).send({
      statusCode,
      error: error?.name || 'Internal Server Error',
      message: error?.message || 'An unexpected error occurred during rendering',
    });
  });

  // Graceful browser shutdown
  fastify.addHook('onClose', async () => {
    await browserService.close();
  });

  return fastify;
}

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  const start = async () => {
    try {
      const app = await buildApp();

      // Pre-warm Chromium pool in the background
      browserService.init().catch((err) => {
        app.log.warn({ err }, 'Failed to pre-warm Chromium browser during boot');
      });

      await app.listen({ port: env.PORT, host: env.HOST });
      app.log.info(`🚀 Tailprint running on http://${env.HOST}:${env.PORT}`);
      app.log.info(`📖 Scalar API Documentation available at http://${env.HOST}:${env.PORT}/docs`);
    } catch (err) {
      console.error('Fatal startup error:', err);
      process.exit(1);
    }
  };

  start();
}
