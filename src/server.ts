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
import { pdfOperationsRoutes } from './routes/pdfOperations.js';
import { webhookRoutes } from './routes/webhooks.js';
import { templateRoutes } from './routes/templates.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { scrapeRoutes } from './routes/scrape.js';
import { mcpRoutes } from './routes/mcp.js';
import { usageRoutes } from './routes/usage.js';
import { toolsRoutes } from './routes/tools.js';
import { studioRoutes } from './routes/studio.js';
import { guidesRoutes } from './routes/guides.js';
import { showcaseRoutes } from './routes/showcase.js';
import { adminRoutes } from './routes/admin.js';
import { browserService, RenderTimeoutError } from './services/browser.js';
import { redisService } from './services/redis.js';
import { analyticsService } from './services/analytics.js';
import { growthAgentService } from './services/growthAgent.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    trustProxy: true,
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
        title: 'Tailprint PDF & E-Invoicing API',
        version: '1.1.1',
        description: `Tailprint is the high-performance **Tailwind-Native HTML-to-PDF Engine, EU Factur-X E-Invoicing API & Model Context Protocol (MCP) Server** ([tailprint.com](https://tailprint.com)).

Convert raw HTML styled with arbitrary Tailwind CSS utility classes into pixel-perfect vector PDFs with **Smart Pagination Shield**, generate legally compliant European **Factur-X / ZUGFeRD (EN 16931)** hybrid e-invoices, and automate PDF operations (merge, split, form-fill, stamp, compress) in under 500ms.

---

### 📚 Table of Contents & Developer Guides
1. [Authentication & API Keys](#section/authentication)
2. [Quickstart: cURL, TypeScript & Python](#section/quickstart)
3. [Guide: Tailwind CSS for Print & Vector PDF](#section/tailwind-pdf-guide)
4. [Guide: European E-Invoicing (Factur-X / ZUGFeRD / EN 16931)](#section/einvoice-guide)
5. [Model Context Protocol (MCP) — 11 Native PDF & Document Tools](#section/mcp-reference)
6. [Interactive PDF Studio & Factur-X Generator](#section/developer-tools)
7. [Zero Data Retention & Enterprise Security](#section/privacy-security)
8. [Quotas, Rate Limits & Error Handling](#section/quotas-errors)

---

<a id="section/authentication"></a>
### 🔑 Authentication & API Keys

All production endpoints under \`/v1/...\` require an API key passed in the standard \`Authorization\` header:
\`\`\`http
Authorization: Bearer sec_live_...
\`\`\`

#### Claim a Free Developer Key (100 PDF renders/month)
You can instantly provision an API key with zero credit card required via our free auth endpoint:
\`\`\`bash
curl -X POST https://tailprint.com/v1/auth/claim-free-key \\
  -H "Content-Type: application/json" \\
  -d '{"email": "developer@example.com"}'
\`\`\`
Or visit [tailprint.com/#pricing](https://tailprint.com/#pricing) to choose a plan or access your [Customer Dashboard](https://tailprint.com/dashboard).

---

<a id="section/quickstart"></a>
### 🚀 Quickstart: Your First PDF Render in 30 Seconds

#### cURL
\`\`\`bash
curl -X POST https://tailprint.com/v1/render/pdf \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "html": "<div class=\\"p-12 bg-slate-900 text-white font-sans\\"><h1 class=\\"text-3xl font-bold text-indigo-400\\">Invoice #1042</h1><p class=\\"text-slate-400 mt-2\\">Sub-500ms Tailwind PDF generation.</p></div>",
    "format": "A4",
    "smart_pagination": true
  }' \\
  --output invoice.pdf
\`\`\`

#### TypeScript / Node.js (Official SDK & Native Fetch)
\`\`\`bash
npm install tailprint
\`\`\`

\`\`\`typescript
import { Tailprint } from 'tailprint';
import fs from 'node:fs/promises';

const tailprint = new Tailprint({ apiKey: 'sec_live_...' });

// 1. Render Tailwind HTML to Vector PDF
const pdfBuffer = await tailprint.renderPdf({
  html: \`
    <div class="max-w-2xl mx-auto p-8 bg-white border border-slate-200 rounded-2xl shadow-xl">
      <h1 class="text-2xl font-black text-slate-900">Certificate of Completion</h1>
      <p class="text-sm text-slate-500 mt-1">Issued to Alexander Wright</p>
    </div>
  \`,
  format: 'A4',
  landscape: true,
  smart_pagination: true,
});
await fs.writeFile('certificate.pdf', pdfBuffer);

// 2. Or automate PDF operations in 1 line
const merged = await tailprint.mergePdfs([pdfBuffer, termsBuffer]);
const watermarked = await tailprint.stampPdf(merged, 'CONFIDENTIAL');
\`\`\`

#### Python
\`\`\`python
import requests

response = requests.post(
    'https://tailprint.com/v1/render/pdf',
    headers={
        'Authorization': 'Bearer sec_live_...',
        'Content-Type': 'application/json',
    },
    json={
        'html': '<div class="p-8 text-xl font-bold text-indigo-600">Tailprint in Python</div>',
        'format': 'A4',
    },
)

with open('output.pdf', 'wb') as f:
    f.write(response.content)
\`\`\`

---

<a id="section/tailwind-pdf-guide"></a>
### 🎨 Guide: Tailwind CSS for Print & Vector PDF

Tailprint compiles Tailwind CSS via pre-warmed headless Chromium with full JIT (Just-In-Time) evaluation. You can use any modern Tailwind classes, arbitrary values, flexbox, CSS grid, and Google fonts.

#### 1. Arbitrary Values & Exact Layouts
When building print documents, use Tailwind arbitrary values for exact millimeter or pixel sizing:
- Widths/Heights: \`w-[420px]\`, \`h-[120mm]\`, \`max-w-[794px]\` (standard A4 width at 96 DPI)
- Typography: \`text-[13px]\`, \`leading-[1.6]\`, \`tracking-[-0.02em]\`
- Colors: \`bg-[#0f172a]\`, \`text-[#4f46e5]\`, \`border-[#e2e8f0]\`

#### 2. Smart Pagination Shield & Page Breaks
To prevent awkward page splits across invoice tables, cards, or signature blocks:
- Use Tailwind break utilities: \`break-inside-avoid\`, \`break-before-page\`, \`break-after-page\`.
- Enable \`"smart_pagination": true\` in your API payload. Tailprint injects a custom CSS printing shield that repeats \`<thead>\` table headers across pages and guarantees table rows stay intact.

\`\`\`html
<!-- Keep table rows or signature blocks together -->
<div class="break-inside-avoid p-6 bg-slate-50 rounded-xl border border-slate-200">
  <h3 class="font-bold text-slate-800">Authorization Sign-off</h3>
  <div class="mt-8 border-b border-slate-300 w-48"></div>
</div>
\`\`\`

#### 3. Dynamic Headers & Footers with Page Numbers
Tailprint supports custom HTML header and footer templates. Chromium automatically populates the following dynamic CSS classes:
- \`<span class="pageNumber"></span>\` — Current page index
- \`<span class="totalPages"></span>\` — Total document page count
- \`<span class="date"></span>\` — Current formatted date
- \`<span class="title"></span>\` — Document title

\`\`\`json
{
  "html": "<main class=\\"p-10\\">Multi-page report content...</main>",
  "header_html": "<div style=\\"font-size: 9px; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; font-family: sans-serif;\\"><span>Tailprint Executive Report</span><span>Confidential</span></div>",
  "footer_html": "<div style=\\"font-size: 9px; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; font-family: sans-serif;\\"><span>Generated automatically</span><span>Page <span class=\\"pageNumber\\"></span> of <span class=\\"totalPages\\"></span></span></div>",
  "margin": { "top": "40px", "bottom": "40px", "left": "20px", "right": "20px" }
}
\`\`\`

---

<a id="section/einvoice-guide"></a>
### 🇪🇺 Guide: European E-Invoicing (Factur-X / ZUGFeRD / EN 16931)

European B2B electronic invoice mandates require businesses across the EU (including Germany, France, Italy, Poland, and Denmark) to issue legally compliant structured e-invoices.

Tailprint includes native support for **Hybrid PDF/A-3 E-Invoicing**:
- **Human-Readable:** A print-ready visual vector PDF invoice with custom branding.
- **Machine-Readable:** An embedded \`factur-x.xml\` / \`zugferd-invoice.xml\` complying with European Norm **EN 16931** and UN/CEFACT CrossIndustryInvoice (CII).
- **ERP Integration:** Compatible with SAP, DATEV, Dynamics 365, Chorus Pro, Dinero, Billy, and PEPPOL Access Points.

#### Generating an E-Invoice via API
Call \`POST /v1/render/einvoice\` with structured supplier, customer, and line item details:
\`\`\`bash
curl -X POST https://tailprint.com/v1/render/einvoice \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoiceNumber": "INV-2026-0042",
    "issueDate": "2026-11-12",
    "dueDate": "2026-12-12",
    "currency": "EUR",
    "profile": "BASIC",
    "seller": {
      "name": "Acme Solutions Ltd",
      "vatId": "DK12345678",
      "street": "Commercial Street 12",
      "city": "Copenhagen",
      "country": "DK"
    },
    "buyer": {
      "name": "Global Logistics GmbH",
      "vatId": "DE987654321",
      "street": "Alexanderplatz 4",
      "city": "Berlin",
      "country": "DE"
    },
    "lineItems": [
      {
        "name": "Cloud Infrastructure Consulting",
        "quantity": 10,
        "unitPrice": 150.00,
        "vatRate": 25.0
      }
    ],
    "paymentIban": "DK50004403328109",
    "paymentBic": "DABADKKK",
    "store": true
  }'
\`\`\`
The resulting PDF contains the XML embedded directly in the PDF file catalog (\`/EmbeddedFiles\`), meaning any accounting robot can parse the XML while any human can view and print the invoice.

---

<a id="section/mcp-reference"></a>
### 🤖 Model Context Protocol (MCP) — 11 Native PDF & Document Tools

Tailprint exposes a production-grade, 100% spec-compliant Model Context Protocol server featuring **11 Native Document & PDF Tools** across local stdio and remote Server-Sent Events (SSE):

| MCP Tool | Category | Returns | Purpose |
|---|---|---|---|
| \`render_pdf\` | Documents | PDF Link + Base64 | Renders Tailwind HTML or public URL into vector PDF with headers/footers & encryption. |
| \`generate_einvoice\` | Compliance / EU | Hybrid PDF + Factur-X XML | Generates EU-compliant hybrid e-invoices (Factur-X / ZUGFeRD / EN 16931) with embedded CII XML. |
| \`render_template\` | Automation | PDF + CDN Link | Directly renders pre-built Tailwind document templates with JSON variable substitution. |
| \`list_templates\` | Automation | JSON Catalog | Lists all available document templates in the Tailprint catalog. |
| \`get_template_source\` | Automation | HTML Source | Retrieves full template HTML source code for LLM inspection and customization. |
| \`merge_pdfs\` | Document Ops | PDF Link + Base64 | Merges two or more PDF documents into a single unified vector PDF. |
| \`split_pdf\` | Document Ops | PDF Link + Base64 | Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10") from a PDF into a new PDF. |
| \`fill_pdf_form\` | Document Ops | PDF Link + Base64 | Fills interactive AcroForms with text, numbers, or checkboxes, with optional flattening. |
| \`compress_pdf\` | Document Ops | PDF Link + Base64 | Compacts and shrinks PDF file size by bundling objects into compressed streams. |
| \`stamp_pdf\` | Security | PDF Link + Base64 | Stamps diagonal watermarks (e.g. CONFIDENTIAL, DRAFT) across all PDF pages. |
| \`render_presentation\` | Presentations | 16:9 PDF + Preview | Converts Markdown slides (separated by "---") into widescreen 16:9 presentation PDFs. |

#### Connecting Claude Desktop
Add this configuration to your Claude Desktop config file:
- **macOS:** \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- **Windows:** \`%APPDATA%\\Claude\\claude_desktop_config.json\`

\`\`\`json
{
  "mcpServers": {
    "tailprint": {
      "command": "npx",
      "args": ["-y", "tailprint"],
      "env": {
        "TAILPRINT_API_KEY": "sec_live_your_key_here"
      }
    }
  }
}
\`\`\`

#### Connecting Cursor IDE & Windsurf
1. Open **Settings** ➔ **Features** ➔ **MCP Servers** (or \`~/.codeium/windsurf/mcp_config.json\`).
2. Add new MCP server:
   - **Type:** \`sse\`
   - **URL:** \`https://tailprint.com/v1/mcp/sse?api_key=sec_live_your_key_here\`

---

<a id="section/developer-tools"></a>
### 🛠️ Interactive PDF Studio & Factur-X Generator

Tailprint provides visual browser tools backed by our PDF API:
- **Interactive PDF Studio:** [\`tailprint.com/studio\`](https://tailprint.com/studio) — Live Tailwind HTML editor with instant split-pane PDF preview and Smart Pagination Shield.
- **Factur-X & PEPPOL Generator:** [\`tailprint.com/tools/factur-x\`](https://tailprint.com/tools/factur-x) & \`POST /v1/tools/factur-x\` — Interactive generator for EU compliant hybrid e-invoices.

---

<a id="section/privacy-security"></a>
### 🔒 Zero Data Retention & Enterprise Security

Tailprint is engineered for mission-critical enterprise environments handling sensitive financial, medical, or confidential documents:
- **Zero Retention Mode:** Set \`"no_store": true\` in any render request. Tailprint renders the document completely in-memory, disables caching, streams the binary output to your client, and immediately purges all buffers.
- **Ephemeral Storage:** When \`"store": true\` is requested, documents are stored with an explicit TTL (\`expires_in\`, default: 24h) and served over encrypted CDN links at \`/d/:fileId\`.
- **SSRF Network Protection:** Headless Chromium sandboxes strictly disallow requests to private IP ranges, loopback addresses (\`127.0.0.1\`, \`localhost\`), and cloud metadata services (\`169.254.169.254\`).

---

<a id="section/quotas-errors"></a>
### ⚡ Quotas, Rate Limits & Error Handling

Monitor your monthly consumption and billing period in real-time via \`GET /v1/usage\`:
\`\`\`bash
curl -X GET https://tailprint.com/v1/usage \\
  -H "Authorization: Bearer sec_live_..."
\`\`\`

#### Standard Status Codes
- \`200 OK\`: Request completed successfully. Returns binary PDF or JSON response.
- \`400 Bad Request\`: Invalid JSON schema or conflicting parameters (e.g., specifying both \`no_store\` and \`store\`).
- \`401 Unauthorized\`: Missing, expired, or inactive API key.
- \`429 Too Many Requests\`: Monthly quota limit exhausted or playground rate limit reached. Upgrading plan unlocks higher concurrency.
- \`500 Internal Error\`: Headless browser rendering error.
- \`504 Gateway Timeout\`: Page render exceeded max timeout (default: 30,000ms).`,
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

  // 5. Non-blocking Founder Analytics & Telemetry Hook
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      const forwarded = request.headers['x-forwarded-for'];
      const clientIp =
        (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
        request.ip ||
        '0.0.0.0';

      analyticsService.trackHttpRequest({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        ip: clientIp,
        userAgent: String(request.headers['user-agent'] || ''),
        referer: typeof request.headers['referer'] === 'string' ? request.headers['referer'] : undefined,
        headers: request.headers as Record<string, any>,
        latencyMs: reply.elapsedTime || 0,
      });
    } catch {
      // Never block response lifecycle
    }
  });

  // 6. Register application routes
  await fastify.register(templateRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(renderRoutes);
  await fastify.register(pdfOperationsRoutes);
  await fastify.register(scrapeRoutes);
  await fastify.register(mcpRoutes);
  await fastify.register(usageRoutes);
  await fastify.register(toolsRoutes);
  await fastify.register(studioRoutes);
  await fastify.register(guidesRoutes);
  await fastify.register(showcaseRoutes);
  await fastify.register(adminRoutes);
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

  // Graceful browser & telemetry shutdown
  fastify.addHook('onClose', async () => {
    await analyticsService.flush();
    await browserService.close();
  });

  return fastify;
}

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  const start = async () => {
    try {
      await analyticsService.init();
      const app = await buildApp();

      // Pre-warm Chromium pool in the background
      browserService.init().catch((err) => {
        app.log.warn({ err }, 'Failed to pre-warm Chromium browser during boot');
      });

      // Start autonomous Growth Agent background loop (initial run after 30s, then every 3 hours)
      setTimeout(() => {
        growthAgentService.runAutopilotCycle().catch((err) => {
          app.log.warn({ err }, '[GrowthAgent] Autonomous background cycle error');
        });
      }, 30000);

      setInterval(() => {
        growthAgentService.runAutopilotCycle().catch((err) => {
          app.log.warn({ err }, '[GrowthAgent] Periodic autonomous cycle error');
        });
      }, 3 * 60 * 60 * 1000);

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
