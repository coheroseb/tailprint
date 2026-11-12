# Tailprint Model Context Protocol (MCP) Guide (22 Tools)

> Official guide for integrating Tailprint's MCP server with Claude Desktop, Cursor IDE, Windsurf, Google Antigravity, and autonomous agent frameworks.

---

## 🤖 Overview

Tailprint provides a 100% spec-compliant Model Context Protocol (MCP) server exposing **22 native tools**. The server can be connected via two methods:
1. **Local stdio (CLI):** Run via `npx -y tailprint`
2. **Remote Cloud SSE (Server-Sent Events):** Connect directly to `https://tailprint.com/v1/mcp/sse?api_key=sec_live_...`

---

## ⚙️ Client Configurations

### 1. Claude Desktop
Config file location:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
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
```

### 2. Cursor IDE
1. Open **Settings** ➔ **Features** ➔ **MCP Servers**
2. Click **Add New MCP Server**
3. Configure the fields:
   - **Name:** `tailprint`
   - **Type:** `sse`
   - **URL:** `https://tailprint.com/v1/mcp/sse?api_key=sec_live_your_key_here`

### 3. Windsurf
Edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "tailprint": {
      "serverUrl": "https://tailprint.com/v1/mcp/sse?api_key=sec_live_your_key_here"
    }
  }
}
```

---

## 📋 The 22 Native MCP Tools Catalog

### Document & PDF Generation
1. `render_pdf`: Generates print-ready vector PDFs from Tailwind HTML or URLs with headers, footers, margins, and encryption.
2. `render_template`: Renders pre-designed Tailwind templates (invoices, certificates, reports, resumes) with dynamic variable injection.
3. `list_templates`: Returns a catalog of available document templates.
4. `get_template_source`: Retrieves the full Tailwind HTML source code of a template for inspection or modification by an AI agent.

### Compliance & European E-Invoicing
5. `generate_einvoice`: Generates legally compliant hybrid electronic invoices (Factur-X / ZUGFeRD 2.2 / EN 16931) with embedded CrossIndustryInvoice XML.

### PDF Operations & Utilities
6. `merge_pdfs`: Merges two or more PDF documents (base64 or public URLs) into a single unified vector PDF.
7. `split_pdf`: Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10") from an existing PDF into a new PDF.
8. `fill_pdf_form`: Fills interactive PDF forms (AcroForms) with text, numbers, or checkboxes, with optional flattening.
9. `compress_pdf`: Compacts and shrinks PDF file size via stream object bundling and structure optimization.
10. `stamp_pdf`: Applies diagonal watermarks or status stamps (e.g. "CONFIDENTIAL", "DRAFT") across all PDF pages.

### Graphics & Open Graph Images
11. `render_image`: Renders 1200×630 Open Graph preview images (PNG/JPEG) with SHA-256 deduplication caching.
12. `generate_social_card`: Generates 1200×630 social preview banners with typography, badges, and gradients without raw HTML.
13. `render_carousel`: Generates multi-slide 1080×1350 portrait carousels for LinkedIn (PDF) and Instagram (PNG) from Markdown.
14. `render_device_mockup`: Wraps any web URL into a photorealistic 3D MacBook Pro + iPhone presentation scene.

### Data Visualization & Diagrams
15. `render_chart`: Renders high-DPI data visualizations (bar, line, pie, radar, polar) via Chart.js with inline chat display.
16. `render_mermaid`: Renders Mermaid diagram definitions (flowcharts, sequence, ER diagrams, architecture) to PNG, SVG, or PDF.
17. `render_presentation`: Converts Markdown slides (separated by `---`) into widescreen 16:9 presentation PDFs (1920×1080).
18. `generate_qr`: Generates scannable QR codes and barcodes for URLs, Wi-Fi credentials, payment links, and vCards.

### AI Ingestion & Web Scraping
19. `scrape_markdown`: Scrapes public URLs, strips ads and navigation with Mozilla Readability, and returns clean GFM Markdown with 90%+ token savings.
20. `extract_tables_from_url`: Extracts all HTML `<table>` elements from a URL into structured JSON arrays and Markdown tables.

### Quality Assurance & Auditing
21. `compare_snapshots`: Runs pixel-by-pixel visual regression tests between two URLs or HTML snippets, returning a diff heatmap.
22. `audit_webpage`: Performs automated technical audits (SEO, accessibility, and DOM metrics) with a 0-100 score and action items.

---

## 💡 Practical AI Agent Prompts

### E-Invoice (Factur-X)
> *"Generate a Factur-X electronic invoice to Acme Corp for 20 hours of cloud consulting at 150 EUR/hour with 25% VAT and my bank IBAN."*

### Multi-Page Vector PDF Report
> *"Using this quarterly dataset, generate a modern 2-page executive PDF report in A4 format with a Chart.js bar chart and clean page breaks."*

### Social Card & LinkedIn Carousel
> *"Convert this technical blog post into a 5-slide LinkedIn carousel in dark mode, and produce a matching 1200x630 Open Graph card."*

### PDF Operations & Watermarking
> *"Merge this project proposal PDF with our master services agreement PDF, and apply a diagonal 'CONFIDENTIAL' watermark to all pages."*
