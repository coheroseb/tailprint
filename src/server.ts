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
import { studioRoutes } from './routes/studio.js';
import { guidesRoutes } from './routes/guides.js';
import { adminRoutes } from './routes/admin.js';
import { browserService, RenderTimeoutError } from './services/browser.js';
import { redisService } from './services/redis.js';
import { analyticsService } from './services/analytics.js';

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
        title: 'Tailprint API',
        version: '1.0.1',
        description: `Tailprint is the high-performance **Tailwind-Native Render & PDF Engine + Model Context Protocol (MCP) Server** ([tailprint.com](https://tailprint.com)).

Convert raw HTML styled with arbitrary Tailwind CSS utility classes into pixel-perfect vector PDFs, 1200×630 Open Graph preview images, EU-compliant Factur-X e-invoices, and scrape web pages into token-efficient Markdown for LLMs with 90%+ context savings.

---

### 📚 Table of Contents & Developer Guides
1. [Authentication & API Keys](#section/authentication)
2. [Quickstart: cURL, TypeScript & Python](#section/quickstart)
3. [Guide: Tailwind CSS for Print & Vector PDF](#section/tailwind-pdf-guide)
4. [Guide: European E-Invoicing (Factur-X / ZUGFeRD / EN 16931)](#section/einvoice-guide)
5. [Guide: High-Resolution Open Graph & Social Banners](#section/opengraph-guide)
6. [Guide: AI Web Scraping & Markdown Extraction](#section/scraper-guide)
7. [Model Context Protocol (MCP) — 22 Native Tools](#section/mcp-reference)
8. [Developer Tools & Creative Studio](#section/developer-tools)
9. [Zero Data Retention & Enterprise Security](#section/privacy-security)
10. [Quotas, Rate Limits & Error Handling](#section/quotas-errors)

---

<a id="section/authentication"></a>
### 🔑 Authentication & API Keys

All production endpoints under \`/v1/...\` require an API key passed in the standard \`Authorization\` header:
\`\`\`http
Authorization: Bearer sec_live_...
\`\`\`

#### Claim a Free Developer Key (100 renders/month)
You can instantly provision an API key with zero credit card required via our free auth endpoint:
\`\`\`bash
curl -X POST https://tailprint.com/v1/auth/claim-free-key \\
  -H "Content-Type: application/json" \\
  -d '{"email": "developer@example.com"}'
\`\`\`
Or visit [tailprint.com/#pricing](https://tailprint.com/#pricing) to choose a plan or access your [Customer Dashboard](https://tailprint.com/dashboard).

---

<a id="section/quickstart"></a>
### 🚀 Quickstart: Your First Render in 30 Seconds

#### cURL
\`\`\`bash
curl -X POST https://tailprint.com/v1/render/pdf \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "html": "<div class=\\"p-12 bg-slate-900 text-white font-sans\\"><h1 class=\\"text-3xl font-bold text-indigo-400\\">Invoice #1042</h1><p class=\\"text-slate-400 mt-2\\">Sub-800ms Tailwind PDF generation.</p></div>",
    "format": "A4",
    "smart_pagination": true
  }' \\
  --output invoice.pdf
\`\`\`

#### TypeScript / Node.js
\`\`\`typescript
import fs from 'node:fs/promises';

const response = await fetch('https://tailprint.com/v1/render/pdf', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sec_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    html: \`
      <div class="max-w-2xl mx-auto p-8 bg-white border border-slate-200 rounded-2xl shadow-xl">
        <h1 class="text-2xl font-black text-slate-900">Certificate of Completion</h1>
        <p class="text-sm text-slate-500 mt-1">Issued to Alexander Wright</p>
      </div>
    \`,
    format: 'A4',
    landscape: true,
  }),
});

const pdfBuffer = Buffer.from(await response.arrayBuffer());
await fs.writeFile('certificate.pdf', pdfBuffer);
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
- Enable \`"smart_pagination": true\` in your API payload. Tailprint injects a custom CSS printing shield that guarantees tables and cards stay intact.

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

Starting 2026, European B2B electronic invoice mandates require businesses across the EU (including Germany, France, Italy, Poland, and Denmark) to issue legally compliant structured e-invoices.

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

<a id="section/opengraph-guide"></a>
### 🖼️ Guide: High-Resolution Open Graph & Social Banners

Use \`POST /v1/render/image\` to generate high-resolution social preview cards (1200×630 px) with automatic SHA-256 caching.
- Repeated requests with identical HTML or URL return instant \`X-Cache: HIT\` in under 50ms.
- Set \`store: true\` to receive an ephemeral or permanent CDN URL suitable for \`<meta property="og:image" content="...">\`.

\`\`\`bash
curl -X POST https://tailprint.com/v1/render/image \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "html": "<div class=\\"w-full h-full flex flex-col justify-between p-16 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white\\"><span class=\\"text-indigo-400 font-mono font-bold tracking-widest text-sm uppercase\\">Tailprint Release</span><h1 class=\\"text-6xl font-black leading-tight\\">High-Performance Vector PDF Engine</h1><div class=\\"flex items-center space-x-4\\"><div class=\\"w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold\\">TP</div><span class=\\"text-slate-400 font-medium text-lg\\">tailprint.com</span></div></div>",
    "width": 1200,
    "height": 630,
    "type": "png",
    "store": true
  }'
\`\`\`

---

<a id="section/scraper-guide"></a>
### 🌐 Guide: AI Web Scraping & Markdown Extraction

LLMs waste millions of tokens parsing noisy HTML, cookie consent banners, header bars, and tracking scripts. \`POST /v1/scrape/markdown\` converts any public webpage into clean GitHub Flavored Markdown (GFM):
- Strips ads, navigation menus, modals, and tracking pixels using Mozilla Readability.
- Evaluates client-rendered JavaScript (SPAs, React, Next.js).
- Saves **90%+ context window tokens** compared to raw HTML.
- Built-in Redis 24h caching (\`X-Cache: HIT\`).

\`\`\`bash
curl -X POST https://tailprint.com/v1/scrape/markdown \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://techcrunch.com/2026/02/10/example-article",
    "strip_images": true
  }'
\`\`\`

---

<a id="section/mcp-reference"></a>
### 🤖 Model Context Protocol (MCP) — 22 Native Tools

Tailprint exposes a production-grade, 100% spec-compliant Model Context Protocol server featuring **22 Native Tools** across local stdio and remote Server-Sent Events (SSE):

| MCP Tool | Category | Returns | Purpose |
|---|---|---|---|
| \`render_pdf\` | Documents | PDF Link + Base64 | Renders Tailwind HTML or public URL into vector PDF with headers/footers & encryption. |
| \`render_image\` | Open Graph | Inline PNG + CDN Link | Renders Open Graph social preview cards from Tailwind CSS with SHA-256 caching. |
| \`render_chart\` | Data Visuals | Inline PNG + CDN Link | High-DPI bar, line, radar, doughnut, and pie charts with Chart.js. |
| \`generate_qr\` | Utilities | Inline PNG + CDN Link | Mathematically verified scan-ready QR codes and barcodes. |
| \`render_device_mockup\` | Marketing | Inline PNG + CDN Link | Wraps any URL into a MacBook Pro + floating iPhone 16 studio mockup canvas. |
| \`stamp_pdf\` | Security | PDF Link + Base64 | Stamps diagonal watermarks (e.g. CONFIDENTIAL, DRAFT) across all PDF pages. |
| \`compare_snapshots\` | QA / Testing | Inline PNG + CDN Link | 3-panel visual regression diff heatmap highlighting layout shifts with neon-pink overlay. |
| \`render_carousel\` | Social Media | LinkedIn PDF + PNG Cover | Multi-slide 1080x1350 px portrait carousels for LinkedIn and Instagram. |
| \`generate_einvoice\` | Compliance / EU | Hybrid PDF + Factur-X XML | Generates EU-compliant hybrid e-invoices (Factur-X / ZUGFeRD / EN 16931) with embedded CII XML. |
| \`scrape_markdown\` | AI Ingestion | Clean Markdown | Scrapes any web URL, stripping cookie walls and ads with 90%+ token savings. |
| \`render_template\` | Automation | PDF / PNG + CDN Link | Directly renders 8 pre-built Tailwind templates with data substitution. |
| \`list_templates\` | Automation | JSON Catalog | Lists all available templates in the Tailprint catalog. |
| \`get_template_source\` | Automation | HTML Source | Retrieves full template source code for LLM inspection and customization. |
| \`merge_pdfs\` | Document Ops | PDF Link + Base64 | Merges two or more PDF documents into a single unified vector PDF. |
| \`split_pdf\` | Document Ops | PDF Link + Base64 | Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10") from a PDF into a new PDF. |
| \`fill_pdf_form\` | Document Ops | PDF Link + Base64 | Fills interactive AcroForms with text, numbers, or checkboxes, with optional flattening. |
| \`compress_pdf\` | Document Ops | PDF Link + Base64 | Compacts and shrinks PDF file size by bundling objects into compressed streams. |
| \`render_mermaid\` | Diagrams | PNG / PDF / SVG | Renders Mermaid diagram syntax (flowcharts, sequence, ER diagrams) into high-res images or PDFs. |
| \`render_presentation\` | Keynotes | 16:9 PDF + Preview | Converts Markdown slides (separated by "---") into widescreen 16:9 presentation PDFs. |
| \`generate_social_card\` | Open Graph | Inline PNG + CDN Link | High-converting 1200x630 OpenGraph / Twitter social card generator without raw HTML. |
| \`extract_tables_from_url\` | AI Ingestion | JSON + Markdown | Scrapes and extracts all HTML tables from any URL into structured JSON and Markdown tables. |
| \`audit_webpage\` | QA & Audit | Markdown Audit Report | Technical SEO, accessibility, and DOM audit of any public URL with a health score (0-100). |

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
### 🛠️ Developer Tools & Creative Studio

Tailprint provides both visual web tools and matching API endpoints:
- **Interactive Template Studio:** [\`tailprint.com/studio\`](https://tailprint.com/studio) — Live Tailwind HTML editor with instant split-pane PDF preview and Smart Pagination Shield.
- **LinkedIn Carousel Maker:** [\`tailprint.com/tools/carousel\`](https://tailprint.com/tools/carousel) & \`POST /v1/tools/carousel\` — Markdown to 1080×1350 multi-page PDF document posts.
- **Factur-X & PEPPOL Generator:** [\`tailprint.com/tools/factur-x\`](https://tailprint.com/tools/factur-x) & \`POST /v1/tools/factur-x\` — Interactive generator for EU compliant e-invoices.
- **Visual Regression Diff:** [\`tailprint.com/tools/visual-diff\`](https://tailprint.com/tools/visual-diff) & \`POST /v1/tools/visual-diff\` — Pixelmatch layout diff heatmap comparing two URLs.
- **Device Mockup Generator:** [\`tailprint.com/tools/mockup\`](https://tailprint.com/tools/mockup) & \`POST /v1/tools/mockup\` — 3D MacBook Pro + iPhone presentation scene maker.

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
- \`200 OK\`: Request completed successfully. Returns binary PDF/PNG or JSON response.
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
  await fastify.register(scrapeRoutes);
  await fastify.register(mcpRoutes);
  await fastify.register(usageRoutes);
  await fastify.register(toolsRoutes);
  await fastify.register(studioRoutes);
  await fastify.register(guidesRoutes);
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
