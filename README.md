# Tailprint — Tailwind-Native Render & PDF Engine + AI Web Scraper

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)
[![Production](https://img.shields.io/badge/Production-tailprint.com-emerald.svg)](https://tailprint.com)
[![Docs](https://img.shields.io/badge/API_Docs-Scalar-indigo.svg)](https://tailprint.com/docs)

**Tailprint** ([tailprint.com](https://tailprint.com)) is a high-performance, developer-first rendering engine and Model Context Protocol (MCP) server. It accepts raw HTML styled with arbitrary **Tailwind CSS** utility classes and compiles print-ready, pixel-perfect vector **PDFs** or high-resolution **Open Graph images** in under 800ms.

It also features an intelligent **LLM Web Scraper** that strips ads, trackers, and navigation boilerplate using Mozilla Readability, returning token-efficient structured Markdown.

---

## ⚡ Highlights

- **Tailwind-Native:** Built-in Tailwind CSS JIT compilation—no build step, PostCSS config, or bundling required.
- **Model Context Protocol (MCP):** Connects natively to **Claude Desktop**, **Cursor**, **Windsurf**, and autonomous AI agents via Remote SSE or Stdio CLI.
- **Sub-800ms Playwright Engine:** Pre-warmed Chromium instances with isolated browser contexts and strict concurrency throttling (`p-limit`).
- **Interactive Live Playground:** Test markup in real-time in the browser at [tailprint.com](https://tailprint.com).
- **Free Developer Sandbox:** 100 free monthly renders with zero credit card required.
- **SHA-256 Deduplication Caching:** Instant cache hits (`X-Cache: HIT`) for repeated image renders.
- **SSRF & Network Sandboxing:** Automatically blocks local and private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, etc.).

---

## 🤖 Model Context Protocol (MCP) Setup

Tailprint provides an official MCP server enabling AI coding assistants and agents to generate documents and scrape web pages on command.

### Capabilities & Tools
1. `render_pdf`: Generates vector PDFs from raw HTML + Tailwind CSS (invoices, certificates, summaries).
2. `render_image`: Renders 1200x630 social preview cards (PNG/JPEG) with automatic caching.
3. `scrape_markdown`: Scrapes any public URL, strips web noise, and returns clean Markdown with token metrics.

### 1. Claude Desktop Setup
Add this to your Claude Desktop configuration file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tailprint": {
      "url": "https://tailprint.com/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer YOUR_TAILPRINT_API_KEY"
      }
    }
  }
}
```
*(Get a free key at [tailprint.com](https://tailprint.com) with 100 renders/month, no credit card required).*

### 2. Cursor IDE Setup
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

### 4. Scrape Web Page to LLM-Clean Markdown
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
