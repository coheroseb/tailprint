# Tailprint — Document & Visual Infrastructure for Modern Apps & AI Agents

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)
[![Production](https://img.shields.io/badge/Production-tailprint.com-emerald.svg)](https://tailprint.com)
[![Docs](https://img.shields.io/badge/API_Docs-Scalar-indigo.svg)](https://tailprint.com/docs)

**Tailprint** ([tailprint.com](https://tailprint.com)) is a unified, developer-first programmable output engine and Model Context Protocol (MCP) server. It turns Tailwind HTML, data, and AI prompts into pixel-perfect vector **PDFs**, legally compliant **European Factur-X / ZUGFeRD e-invoices**, dynamic **Open Graph cards**, and marketing visuals in under 500ms.

Organized into three core suites:
1. **Document & Compliance Suite:** Vector PDFs, Smart Pagination Shield, Factur-X/ZUGFeRD e-invoicing, and complete PDF operations (merge, split, fill, watermark, compress).
2. **Visual & Media Engine:** Live Template Studio IDE, Open Graph social banners with SHA-256 caching, 3D device mockups, dynamic charts, and LinkedIn carousels.
3. **AI & Agent Infrastructure:** 22 spec-compliant MCP tools for Claude Desktop, Cursor, and Windsurf, plus an intelligent web-to-markdown scraper and zero-retention GDPR mode.

---

## ⚡ Highlights

- **Tailwind-Native:** Built-in Tailwind CSS JIT compilation—no build step, PostCSS config, or bundling required.
- **European E-Invoicing (Factur-X / ZUGFeRD / EN 16931):** Generates legally compliant hybrid PDF/A-3 invoices with embedded CrossIndustryInvoice XML.
- **Model Context Protocol (MCP):** Connects natively to **Claude Desktop**, **Cursor**, **Windsurf**, and autonomous AI agents exposing **22 production tools** via Remote SSE or Stdio CLI.
- **Sub-800ms Playwright Engine:** Pre-warmed Chromium instances with isolated browser contexts and strict concurrency throttling (`p-limit`).
- **Interactive Live Studio & Free Tools:** Real-time Tailwind editor at [tailprint.com/studio](https://tailprint.com/studio), LinkedIn Carousel maker, and 3D Device Mockups.
- **Free Developer Sandbox:** 100 free monthly renders with zero credit card required.
- **SHA-256 Deduplication Caching:** Instant cache hits (`X-Cache: HIT`) for repeated image renders.
- **Zero-Retention Mode:** Complete in-memory ephemeral rendering with `no_store: true`.
- **SSRF & Network Sandboxing:** Automatically blocks local and private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, etc.).

---

## 🤖 Model Context Protocol (MCP) Setup

Tailprint provides an official, 100% spec-compliant MCP server exposing **22 Native Tools** enabling AI coding assistants and autonomous agents to generate documents, charts, mockups, diagrams, and scrape web pages on command.

### 22 Native Tools Catalog
| Tool | Category | Returns | Description |
|---|---|---|---|
| `render_pdf` | Documents | PDF Link + Base64 | Renders Tailwind HTML or URL to vector PDF with custom headers/footers. |
| `render_image` | Open Graph | Inline PNG + CDN Link | High-res PNG/JPEG social cards with instant SHA-256 caching. |
| `generate_einvoice` | Compliance / EU | Hybrid PDF + XML | EU EN 16931 / Factur-X / ZUGFeRD compliant hybrid e-invoice. |
| `scrape_markdown` | AI Ingestion | Clean Markdown | Scrapes public URL, stripping cookie walls and ads (90%+ token savings). |
| `render_chart` | Data Visuals | Inline PNG + CDN Link | High-DPI bar, line, radar, doughnut, and pie charts with Chart.js. |
| `generate_qr` | Utilities | Inline PNG + CDN Link | Mathematically verified scan-ready QR codes and barcodes. |
| `render_device_mockup` | Marketing | Inline PNG + CDN Link | Wraps any URL into a MacBook Pro + floating iPhone 16 studio canvas. |
| `stamp_pdf` | Security | PDF Link + Base64 | Stamps diagonal watermarks (e.g. CONFIDENTIAL, DRAFT). |
| `compare_snapshots` | QA / Testing | Inline PNG + CDN Link | 3-panel visual regression diff heatmap highlighting layout shifts. |
| `render_carousel` | Social Media | LinkedIn PDF + PNG Cover | Multi-slide 1080x1350 px portrait carousels for LinkedIn and Instagram. |
| `merge_pdfs` | Document Ops | PDF Link + Base64 | Merges two or more PDFs into a single unified vector PDF. |
| `split_pdf` | Document Ops | PDF Link + Base64 | Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10"). |
| `fill_pdf_form` | Document Ops | PDF Link + Base64 | Fills interactive AcroForms with fields/checkboxes and flattening. |
| `compress_pdf` | Document Ops | PDF Link + Base64 | Compacts and shrinks PDF file size via stream object bundling. |
| `render_mermaid` | Diagrams | PNG / PDF / SVG | Renders Mermaid diagrams (flowcharts, sequence, ER diagrams). |
| `render_presentation` | Keynotes | 16:9 PDF + Preview | Converts Markdown slides into widescreen 16:9 presentation PDFs. |
| `generate_social_card` | Open Graph | Inline PNG + CDN Link | High-converting 1200x630 social banners without raw HTML. |
| `extract_tables_from_url` | AI Ingestion | JSON + Markdown | Scrapes and extracts all `<table>` elements into structured data. |
| `audit_webpage` | QA & Audit | Markdown Report | Technical SEO, accessibility, and DOM audit with score (0-100). |
| `render_template` | Automation | PDF / PNG + CDN Link | Renders pre-built Tailwind templates with data substitution. |
| `list_templates` | Automation | JSON Catalog | Lists all available templates in the Tailprint catalog. |
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
| **Starter** | **$14 / mo** | **2,500 renders** | Ideal for solo developers, indie projects, and small stores. |
| **Pro (Most Popular)** | **$39 / mo** | **20,000 renders** | Prioritized Chromium queue, SHA-256 caching, agency ready. |
| **Business / Scale** | **$99 / mo** | **75,000 renders** | High throughput pool reservation, multi-key team access. |
| **Enterprise** | **$199+ / mo** | **100,000+ renders** | Dedicated browser instances, 99.9% uptime SLA, Slack channel. |

---

## 🚀 API Quickstart

### 1. Claim a Free API Key (No Credit Card)
```bash
curl -X POST https://tailprint.com/v1/auth/claim-free-key \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### 2. Render HTML to PDF
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

### 3. Render Open Graph Social Image
```bash
curl -X POST https://tailprint.com/v1/render/image \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<div class=\"w-full h-full flex flex-col justify-center items-center bg-gradient-to-tr from-indigo-900 to-purple-950 text-white\"><h1 class=\"text-5xl font-black\">Hello Tailprint</h1></div>",
    "width": 1200,
    "height": 630,
    "type": "png"
  }' \
  --output og-card.png
```

### 4. Generate Factur-X / PEPPOL European E-Invoice
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

### 5. Scrape Web Page to LLM-Clean Markdown
```bash
curl -X POST https://tailprint.com/v1/scrape/markdown \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://techcrunch.com/2026/02/10/example-article",
    "strip_images": true
  }'
```

---

## 🛠️ Interactive Web Studio & Free Tools
- **Interactive Template Studio:** [tailprint.com/studio](https://tailprint.com/studio) — Live split-pane editor with Smart Pagination Shield.
- **LinkedIn Carousel Maker:** [tailprint.com/tools/carousel](https://tailprint.com/tools/carousel) — Turn markdown into 1080x1350 multi-page PDF document posts.
- **Factur-X & PEPPOL Generator:** [tailprint.com/tools/factur-x](https://tailprint.com/tools/factur-x) — Hybrid PDF/A-3 generator with embedded CII XML.
- **Visual Regression Diff:** [tailprint.com/tools/visual-diff](https://tailprint.com/tools/visual-diff) — Pixelmatch layout diff heatmap comparing two URLs.
- **Device Mockup Generator:** [tailprint.com/tools/mockup](https://tailprint.com/tools/mockup) — 3D MacBook Pro + iPhone presentation scene maker.

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
