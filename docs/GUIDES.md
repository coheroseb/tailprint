# Tailprint Developer Guides & Best Practices

> Complete technical guides, tutorials, and architectural best practices for building with Tailprint ([tailprint.com](https://tailprint.com)).

---

## 📑 Table of Contents
1. [Quickstart Guide](#1-quickstart-guide)
2. [Guide: Tailwind CSS for Print & Vector PDF](#2-guide-tailwind-css-for-print--vector-pdf)
3. [Guide: European E-Invoicing (Factur-X / ZUGFeRD / EN 16931)](#3-guide-european-e-invoicing-factur-x--zugferd--en-16931)
4. [Guide: High-Resolution Open Graph & Social Cards](#4-guide-high-resolution-open-graph--social-cards)
5. [Guide: AI Web Scraping for LLM & RAG Context](#5-guide-ai-web-scraping-for-llm--rag-context)
6. [Guide: Zero Retention & Enterprise Security](#6-guide-zero-retention--enterprise-security)
7. [Guide: Interactive Developer Tools & Template Studio](#7-guide-interactive-developer-tools--template-studio)
8. [Error Handling, Quotas & Rate Limits](#8-error-handling-quotas--rate-limits)

---

## 1. Quickstart Guide

Tailprint generates print-ready vector PDFs, 1200×630 Open Graph preview images, and EU-compliant e-invoices directly from raw HTML styled with **Tailwind CSS**.

### Authentication
All requests to `/v1/...` require an API key provided in the `Authorization` header:
```http
Authorization: Bearer sec_live_...
```
Claim a free developer key (100 renders/month, no credit card required):
```bash
curl -X POST https://tailprint.com/v1/auth/claim-free-key \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com"}'
```

### Example: Generate Your First Document (cURL)
```bash
curl -X POST https://tailprint.com/v1/render/pdf \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<div class=\"p-12 bg-slate-900 text-white font-sans\"><h1 class=\"text-3xl font-black text-indigo-400\">Invoice #2026-01</h1><p class=\"text-slate-400 mt-2\">Generated with Tailwind CSS in under 800ms.</p></div>",
    "format": "A4",
    "smart_pagination": true
  }' \
  --output invoice.pdf
```

---

## 2. Guide: Tailwind CSS for Print & Vector PDF

Tailprint uses an isolated, pre-warmed headless Chromium engine with full Just-In-Time (JIT) Tailwind CSS evaluation. You can use arbitrary Tailwind classes (`w-[420px]`, `text-[13px]`, `bg-[#0f172a]`), flexbox, grid, and modern gradients.

### Arbitrary Values for Millimeter Precision
When designing print documents, use Tailwind arbitrary values for exact millimeter or pixel sizing:
- **A4 dimensions:** `max-w-[794px]` or `w-[210mm]`
- **Margins & paddings:** `p-[20mm]`, `space-y-[6mm]`
- **Typography:** `text-[13px]`, `leading-[1.5]`, `tracking-[-0.01em]`

### Smart Pagination Shield (Clean Page Breaks)
A common challenge in HTML-to-PDF rendering is awkward page splits across tables, signature blocks, or cards.

1. **Keep Elements Together:**
   Add `break-inside-avoid` to containers that must never be split across pages:
   ```html
   <div class="break-inside-avoid p-6 bg-slate-50 border border-slate-200 rounded-xl">
     <h4 class="font-bold text-slate-800">Authorized Signature</h4>
     <div class="mt-8 border-b border-slate-400 w-64"></div>
   </div>
   ```

2. **Force Page Breaks:**
   Use `break-before-page` or `break-after-page` to start a section on a new page:
   ```html
   <section class="break-before-page">
     <h2 class="text-2xl font-bold">Section 2: Financial Overview</h2>
   </section>
   ```

3. **Enable Smart Pagination:**
   Set `"smart_pagination": true` in your render payload. Tailprint automatically injects custom `@media print` rules protecting `<tr>`, `table`, cards, and images from splitting awkwardly.

### Dynamic Headers and Footers with Page Numbers
Chromium populates dynamic tokens inside `header_html` and `footer_html`:
- `<span class="pageNumber"></span>` — Current page index
- `<span class="totalPages"></span>` — Total page count
- `<span class="date"></span>` — Current formatted date
- `<span class="title"></span>` — Document title

**Note:** Header and footer templates must include explicit inline CSS font size (e.g. `font-size: 9px; width: 100%; display: flex; justify-content: space-between; font-family: sans-serif;`), and adequate page margins must be reserved (e.g. `"margin": { "top": "40px", "bottom": "40px" }`).

---

## 3. Guide: European E-Invoicing (Factur-X / ZUGFeRD / EN 16931)

EU Directive 2014/55/EU and European B2B e-invoicing mandates require structured electronic invoices across member states.

### What is a Hybrid Invoice?
A hybrid e-invoice (Factur-X / ZUGFeRD 2.2) consists of:
1. **Visual PDF (PDF/A-3):** A formatted vector PDF that humans can open, read, and print in any standard PDF viewer.
2. **Embedded XML (CrossIndustryInvoice):** A standardized XML file (`factur-x.xml`) embedded directly inside the PDF file catalog (`/EmbeddedFiles`).

When received by an ERP or accounting system (such as SAP, DATEV, Dynamics 365, Dinero, or Billy), the XML is parsed automatically for immediate bookkeeping without relying on fragile OCR scanning.

### API Request
Endpoint: `POST /v1/render/einvoice`
```json
{
  "invoiceNumber": "INV-2026-0042",
  "issueDate": "2026-11-12",
  "dueDate": "2026-12-12",
  "currency": "EUR",
  "profile": "BASIC",
  "seller": {
    "name": "Acme Tech Solutions Ltd",
    "vatId": "DK12345678",
    "street": "Commercial Way 45",
    "city": "Copenhagen",
    "country": "DK"
  },
  "buyer": {
    "name": "Global Logistics GmbH",
    "vatId": "DE987654321",
    "street": "Friedrichstrasse 100",
    "city": "Berlin",
    "country": "DE"
  },
  "lineItems": [
    {
      "name": "Senior Cloud Architecture Consulting (40 hours)",
      "quantity": 40,
      "unitPrice": 160.00,
      "vatRate": 25.0
    }
  ],
  "paymentIban": "DK50004403328109",
  "paymentBic": "DABADKKK",
  "store": true
}
```

---

## 4. Guide: High-Resolution Open Graph & Social Cards

Use `POST /v1/render/image` to generate social preview banners (1200×630 px) for LinkedIn, X/Twitter, Facebook, and Slack.

### SHA-256 Deduplication Caching
- Tailprint hashes HTML, CSS, and capture parameters using SHA-256.
- Repeated requests with identical content return cached images (`X-Cache: HIT`) in under 50ms.
- Set `"store": true` to receive an immutable CDN URL suitable for `<meta property="og:image" content="...">`.

---

## 5. Guide: AI Web Scraping for LLM & RAG Context

When LLMs (Claude, Gemini, OpenAI) ingest public web pages, raw HTML contains 80-95% boilerplate clutter: cookie consent banners, navigation bars, trackers, and advertisements.

Endpoint: `POST /v1/scrape/markdown`
- Strips boilerplate with **Mozilla Readability** to extract the core article.
- Converts content into clean **GitHub Flavored Markdown (GFM)**.
- Saves **90%+ tokens** in your context window.
- Evaluates client-rendered JavaScript (SPAs, React, Next.js).
- Built-in 24-hour Redis caching.

---

## 6. Guide: Zero Retention & Enterprise Security

Tailprint is engineered for organizations with strict GDPR, HIPAA, and confidentiality requirements:
- **Zero Retention Mode (`"no_store": true`):** Documents are rendered entirely in memory (RAM), never written to disk or logged, and buffers are purged immediately upon client streaming. The response includes `X-Tailprint-Zero-Retention: active`.
- **Password Encryption:** Add `"password": "your-secure-password"` in `POST /v1/render/pdf` to encrypt the output with AES-256.
- **SSRF Sandboxing:** The Chromium sandbox automatically blocks requests to internal private networks (`127.0.0.1`, `localhost`, `10.0.0.0/8`, metadata endpoints `169.254.169.254`).

---

## 7. Guide: Interactive Developer Tools & Template Studio

Tailprint provides visual web utilities and matching programmatic API endpoints:
- **Interactive Template Studio:** [`tailprint.com/studio`](https://tailprint.com/studio) — Live split-pane Tailwind HTML editor with instant PDF preview and Smart Pagination Shield.
- **LinkedIn Carousel Maker:** [`tailprint.com/tools/carousel`](https://tailprint.com/tools/carousel) & `POST /v1/tools/carousel` — Convert Markdown into 1080×1350 multi-page portrait PDF documents.
- **Factur-X & PEPPOL Generator:** [`tailprint.com/tools/factur-x`](https://tailprint.com/tools/factur-x) & `POST /v1/tools/factur-x` — Create EU-compliant hybrid e-invoices online.
- **Visual Regression Diff:** [`tailprint.com/tools/visual-diff`](https://tailprint.com/tools/visual-diff) & `POST /v1/tools/visual-diff` — Pixelmatch diff heatmap for visual QA and regression audits.
- **Device Mockup Generator:** [`tailprint.com/tools/mockup`](https://tailprint.com/tools/mockup) & `POST /v1/tools/mockup` — 3D MacBook Pro + iPhone presentation scene builder.

---

## 8. Error Handling, Quotas & Rate Limits

Check real-time quota consumption via `GET /v1/usage`:
```bash
curl -X GET https://tailprint.com/v1/usage \
  -H "Authorization: Bearer sec_live_..."
```

### Standard HTTP Status Codes
- `200 OK`: Request succeeded. Returns binary PDF/PNG stream or JSON payload.
- `400 Bad Request`: Invalid payload or conflicting options (`store: true` combined with `no_store: true`).
- `401 Unauthorized`: Missing, expired, or invalid API key.
- `429 Too Many Requests`: Monthly quota exhausted or playground rate limit reached.
- `500 Internal Server Error`: Headless browser rendering failure.
- `504 Gateway Timeout`: Rendering exceeded the execution timeout (30 seconds).
