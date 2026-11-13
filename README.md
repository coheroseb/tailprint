# Tailprint — Developer-First PDF & Document Engine, TypeScript SDK & MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)
[![Production](https://img.shields.io/badge/Production-tailprint.com-emerald.svg)](https://tailprint.com)
[![Docs](https://img.shields.io/badge/API_Docs-Scalar-indigo.svg)](https://tailprint.com/docs)
[![npm version](https://img.shields.io/npm/v/tailprint.svg)](https://www.npmjs.com/package/tailprint)

**Tailprint** ([tailprint.com](https://tailprint.com)) is the developer-first programmable PDF and document engine. It turns Tailwind HTML, dynamic JSON data, and AI prompts into pixel-perfect vector **PDFs**, legally compliant **European Factur-X / ZUGFeRD hybrid e-invoices**, and provides complete PDF manipulation operations (merge, split, fill forms, watermark, compress, validate).

Organized into two core pillars:
1. **Document & Compliance Suite:** Vector HTML-to-PDF, Smart Pagination Shield, EU Factur-X / ZUGFeRD e-invoicing (generation & validation), and REST PDF operations (merge, split, fill AcroForms, stamp watermarks, stream compression).
2. **AI & Developer Infrastructure:** Zero-dependency isomorphic TypeScript SDK (`npm install tailprint`) and Model Context Protocol (MCP) server for Claude Desktop, Cursor, and Windsurf (`npx tailprint`), with zero-retention GDPR privacy mode.

---

## ⚡ Highlights

- **Tailwind-Native:** Built-in Tailwind CSS JIT compilation—no build step, PostCSS config, or bundling required.
- **European E-Invoicing (Factur-X / ZUGFeRD / EN 16931):** Generates legally compliant hybrid PDF/A-3 invoices with embedded CrossIndustryInvoice XML and validates invoices against EN 16931 standards.
- **Complete PDF Operations:** Merge multiple PDFs, split page ranges, fill interactive AcroForm fields, compress file size, and stamp watermarks/page numbers.
- **Official TypeScript / Node.js SDK:** Isomorphic, zero external runtime dependencies, native `fetch` support for Node.js, Next.js, Bun, Deno, and Cloudflare Workers.
- **Model Context Protocol (MCP):** Connects natively to **Claude Desktop**, **Cursor**, **Windsurf**, and autonomous AI agents exposing **11 document & PDF tools** via Stdio or Remote SSE.
- **Sub-800ms Playwright Engine:** Pre-warmed Chromium instances with isolated browser contexts and strict concurrency throttling (`p-limit`).
- **Smart Pagination Shield:** Prevents orphaned lines, awkward page breaks, and split table rows across document pages.
- **Zero-Retention Mode:** Complete in-memory ephemeral rendering with `no_store: true`.
- **SSRF & Network Sandboxing:** Automatically blocks local and private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, etc.).

---

## 📦 Official TypeScript / Node.js SDK

Tailprint provides an official zero-dependency isomorphic SDK for Node.js, Next.js, Bun, Deno, and Cloudflare Workers:

```bash
npm install tailprint
```

### SDK Quickstart

```typescript
import { Tailprint } from 'tailprint';

const tp = new Tailprint({
  apiKey: process.env.TAILPRINT_API_KEY, // Or pass directly
});

// 1. Render Tailwind HTML to vector PDF
const { buffer } = await tp.renderPdf({
  html: `
    <div class="p-12 bg-slate-900 text-white font-sans">
      <h1 class="text-3xl font-bold text-indigo-400">Quarterly Report</h1>
      <p class="text-slate-400 mt-2">Rendered with Tailwind CSS & Playwright.</p>
    </div>
  `,
  format: 'A4',
});

// 2. Merge multiple PDFs
const merged = await tp.mergePdfs({
  pdfs: [bufferA, bufferB],
});

// 3. Stamp Watermark / Page Numbers
const stamped = await tp.stampPdf({
  pdf: buffer,
  text: 'CONFIDENTIAL',
  opacity: 0.2,
  diagonal: true,
});

// 5. Asynchronous Rendering & Webhook Delivery
const job = await tp.renderPdfAsync({
  html: '<h1>Heavy 100-page Annual Report</h1>',
  webhook_url: 'https://my-app.com/api/webhooks/pdf',
});
// Or poll until finished:
const completedJob = await tp.waitForJob(job.job_id);
console.log('PDF Ready at:', completedJob.results[0].download_url);

// 6. Concurrent Batch Rendering with Automatic Merging
const batchJob = await tp.renderBatch({
  items: [
    { html: '<h1>Invoice #101</h1>', filename: 'inv-101.pdf' },
    { html: '<h1>Invoice #102</h1>', filename: 'inv-102.pdf' },
  ],
  merge_output: true,
  merged_filename: 'all-invoices.pdf',
  webhook_url: 'https://my-app.com/api/webhooks/pdf',
});
console.log('Batch Queued:', batchJob.job_id);
```

---

## 🤖 Model Context Protocol (MCP) Setup

Tailprint provides an official, 100% spec-compliant MCP server exposing **11 Document & PDF Tools** enabling AI coding assistants and autonomous agents to generate and inspect documents on command.

### 11 Document & PDF Tools Catalog
| Tool | Category | Returns | Description |
|---|---|---|---|
| `render_pdf` | Documents | PDF Link + Base64 | Renders Tailwind HTML or URL to vector PDF with custom headers/footers. |
| `generate_einvoice` | Compliance / EU | Hybrid PDF + XML | EU EN 16931 / Factur-X / ZUGFeRD compliant hybrid e-invoice. |
| `merge_pdfs` | Document Ops | PDF Link + Base64 | Merges two or more PDFs into a single unified vector PDF. |
| `split_pdf` | Document Ops | PDF Link + Base64 | Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10"). |
| `fill_pdf_form` | Document Ops | PDF Link + Base64 | Fills interactive AcroForms with fields/checkboxes and flattening. |
| `compress_pdf` | Document Ops | PDF Link + Base64 | Compacts and shrinks PDF file size via stream object bundling. |
| `stamp_pdf` | Security | PDF Link + Base64 | Stamps diagonal watermarks (e.g. CONFIDENTIAL, DRAFT) or page numbers. |
| `render_presentation` | Keynotes | 16:9 PDF + Preview | Converts Markdown slides into widescreen 16:9 presentation PDFs. |
| `render_template` | Automation | PDF Link + Base64 | Renders pre-built Tailwind templates with dynamic data substitution. |
| `list_templates` | Automation | JSON Catalog | Lists all available templates in the Tailprint document catalog. |
| `get_template_source` | Automation | HTML Source | Retrieves full template source code for LLM inspection. |

### 1. Claude Desktop Setup
Add this to your Claude Desktop configuration file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tailprint": {
      "command": "npx",
      "args": ["-y", "tailprint"],
      "env": {
        "TAILPRINT_API_KEY": "YOUR_TAILPRINT_API_KEY"
      }
    }
  }
}
```

### 2. Cursor IDE & Windsurf Setup
In Cursor:
1. Open **Settings** ➔ **Features** ➔ **MCP Servers**.
2. Click **Add New MCP Server**.
3. Name: `tailprint`
4. Type: `sse`
5. URL: `https://tailprint.com/v1/mcp/sse?api_key=YOUR_TAILPRINT_API_KEY`

---

## 💰 Pricing & Plans

| Tier | Price | Monthly Limit | Features |
| :--- | :--- | :--- | :--- |
| **Developer Free** | **$0** | **100 renders** | No credit card required. Full Tailwind support, MCP access. |
| **Starter** | **$19 / mo** | **3,000 renders** | Ideal for solo developers, indie projects, and small stores. |
| **Pro (Most Popular)** | **$49 / mo** | **25,000 renders** | Prioritized Chromium queue, EU Factur-X hybrid e-invoicing. |
| **Business / Scale** | **$119 / mo** | **100,000 renders** | Elevated concurrency pool reservation, multi-key team access. |
| **Enterprise** | **$299 / mo** | **250,000+ renders** | Dedicated browser instances, 99.9% uptime SLA, Slack channel. |

---

## 🚀 REST API Quickstart

### 1. Claim a Free API Key (No Credit Card)
```bash
curl -X POST https://tailprint.com/v1/auth/claim-free-key \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### 2. Render HTML to Vector PDF
```bash
curl -X POST https://tailprint.com/v1/render/pdf \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<div class=\"p-12 bg-slate-900 text-white font-sans\"><h1 class=\"text-3xl font-bold text-indigo-400\">Invoice #1042</h1><p class=\"text-slate-400 mt-2\">Styled dynamically with Tailwind CSS.</p></div>",
    "format": "A4",
    "landscape": false
  }' \
  --output invoice.pdf
```

### 3. Generate Factur-X / PEPPOL European E-Invoice
```bash
curl -X POST https://tailprint.com/v1/render/einvoice \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-2026-0042",
    "currency": "EUR",
    "seller": { "name": "Acme Nordic ApS", "country": "DK", "vatId": "DK12345678" },
    "buyer": { "name": "Global Logistics GmbH", "country": "DE", "vatId": "DE987654321" },
    "lineItems": [{ "name": "Consulting Services", "quantity": 10, "unitPrice": 150.00, "vatRate": 25 }],
    "store": true
  }'
```

### 4. Validate Factur-X / ZUGFeRD E-Invoice
```bash
curl -X POST https://tailprint.com/v1/pdf/validate-einvoice \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "pdf": "https://example.com/invoice.pdf"
  }'
```

### 5. Merge Multiple PDFs
```bash
curl -X POST https://tailprint.com/v1/pdf/merge \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "pdfs": ["https://example.com/cover.pdf", "https://example.com/report.pdf"]
  }' \
  --output merged.pdf
```

### 6. Stamp Watermark
```bash
curl -X POST https://tailprint.com/v1/pdf/stamp \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "pdf": "https://example.com/contract.pdf",
    "text": "CONFIDENTIAL",
    "opacity": 0.2,
    "diagonal": true
  }' \
  --output stamped.pdf
```

### 7. Asynchronous Batch Rendering & Webhook
```bash
curl -X POST https://tailprint.com/v1/render/batch \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "html": "<h1>Invoice #101</h1>", "filename": "inv-101.pdf" },
      { "html": "<h1>Invoice #102</h1>", "filename": "inv-102.pdf" }
    ],
    "merge_output": true,
    "merged_filename": "all-invoices.pdf",
    "webhook_url": "https://my-app.com/api/webhooks/pdf"
  }'
```

### 8. Poll Job Status
```bash
curl https://tailprint.com/v1/jobs/job_batch_0123456789abcdef
```

---

## 🛠️ Interactive Web Studio & Free Tools
- **Interactive Template Studio:** [tailprint.com/studio](https://tailprint.com/studio) — Live split-pane editor with Smart Pagination Shield.
- **Factur-X & PEPPOL Generator:** [tailprint.com/tools/factur-x](https://tailprint.com/tools/factur-x) — Hybrid PDF/A-3 generator with embedded CII XML.
- **Factur-X E-Invoice Validator:** [tailprint.com/tools/factur-x](https://tailprint.com/tools/factur-x) — Drag-and-drop validation tool checking EN 16931 compliance and totals.
- **Document Template Gallery:** [tailprint.com/templates](https://tailprint.com/templates) — 13 pre-styled Tailwind templates (Invoices, Reports, Receipts, Resumes).

---

## 🛠 Local Development & Self-Hosting

### Requirements
- Node.js 20+
- Playwright Chromium (`npx playwright install chromium`)
- Upstash Redis or local Redis (optional, includes in-memory dev fallback)

### Installation
```bash
# Clone the repository
git clone https://github.com/coheroseb/tailprint.git
cd tailprint

# Install dependencies
npm install
npx playwright install chromium

# Copy environment variables
cp .env.example .env

# Run development server with hot-reload
npm run dev

# Run unit & integration test suite
npm test
```

### Docker
```bash
docker compose up -d --build
```

---

## 📄 License

MIT © [Tailprint](https://tailprint.com)
