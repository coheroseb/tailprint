# 🚀 Tailprint MCP Registry Submission Pack

This document contains pre-formatted submission payloads and PR descriptions for submitting Tailprint to all top Model Context Protocol (MCP) directories and marketplaces.

---

## 1. Official Anthropic MCP Registry (`modelcontextprotocol/servers`)
- **Repository:** https://github.com/modelcontextprotocol/servers
- **Action:** Fork repo, add `tailprint` entry or open a PR under directory listings.

### PR Title:
```
Add Tailprint MCP Server (Tailwind-to-PDF, Visual Diff Heatmap & EU Factur-X)
```

### PR Description:
```markdown
### Server Overview
- **Name:** Tailprint
- **Repository:** https://github.com/coheroseb/tailprint
- **Website:** https://tailprint.com
- **License:** MIT
- **Category:** Developer Tools / Document Generation / Quality Assurance

### Capabilities:
Tailprint provides 22 high-performance native MCP tools:
1. `render_pdf`: Vector PDF generation from Tailwind CSS or URLs with Chromium header/footer page numbers and AES-256 encryption.
2. `render_image`: High-res PNG/JPEG social share cards (Open Graph).
3. `compare_snapshots`: Pixel-by-pixel visual regression testing with 3-panel diff heatmap overlay (pixelmatch).
4. `render_carousel`: Multi-slide 1080x1350 px portrait carousels for LinkedIn (PDF) and Instagram (PNG).
5. `generate_einvoice`: European hybrid electronic invoices conforming to Factur-X / ZUGFeRD 2.2 / EN 16931 with embedded `factur-x.xml`.
6. `render_chart`: Chart.js visualization engine (dark/light themes).
7. `generate_qr`: Verified scannable QR matrices.
8. `render_device_mockup`: MacBook Pro + iPhone 16 device mockup studio canvas.
9. `stamp_pdf`: Semi-transparent diagonal watermarking on existing vector PDFs.
10. `scrape_markdown`: Ad/tracker-free web scraping with 90%+ context savings.
11. `merge_pdfs`: Merging multiple vector PDFs into one unified document.
12. `split_pdf`: Splitting or extracting specific pages from PDFs.
13. `fill_pdf_form`: Populating and flattening AcroForms.
14. `compress_pdf`: Compacting and shrinking PDF file sizes.
15. `render_mermaid`: Diagram generation from Mermaid markup (PNG/SVG/PDF).
16. `render_presentation`: Markdown to 16:9 presentation PDF conversion.
17. `generate_social_card`: 1200x630 social card banner creation without HTML.
18. `extract_tables_from_url`: Parsing HTML tables to JSON and Markdown.
19. `audit_webpage`: Automated technical SEO, accessibility, and DOM auditing.
20-22. Template automation: `render_template`, `list_templates`, `get_template_source`.

### Transport Support:
- Local stdio: `npx -y tailprint`
- Remote Cloud SSE: `https://tailprint.com/v1/mcp/sse?api_key=...`
```

---

## 2. Awesome MCP Servers (`punkpeye/awesome-mcp-servers`)
- **Repository:** https://github.com/punkpeye/awesome-mcp-servers
- **File:** `README.md`
- **Section:** Under **Developer Tools** or **Utilities**

### Markdown Row:
```markdown
- [Tailprint](https://github.com/coheroseb/tailprint) 🖨️ - High-performance Tailwind-native PDF & Open Graph image engine, visual regression diff heatmap, LinkedIn carousels, and EU Factur-X hybrid e-invoicing for Claude & Cursor. Supports local stdio and remote cloud SSE.
```

---

## 3. Glama.ai MCP Registry
- **URL:** https://glama.ai/mcp/servers
- **Submission Path:** Click **"Submit Server"** -> Connect GitHub repo `coheroseb/tailprint`.
- **Short Tagline:**
  ```
  Turn prompts into pixel-perfect Tailwind PDFs, visual diff heatmaps, and EU Factur-X e-invoices.
  ```
- **Tags:** `pdf`, `tailwind`, `visual-testing`, `factur-x`, `carousels`, `scraper`

---

## 4. Smithery.ai
- **URL:** https://smithery.ai
- **Submission:** Already configured via `smithery.yaml` in the root repository. Simply paste `https://github.com/coheroseb/tailprint` into Smithery.ai's indexer.

---

## 5. PulseMCP
- **URL:** https://pulsemcp.com/submit
- **Name:** Tailprint
- **URL:** https://tailprint.com
- **GitHub:** https://github.com/coheroseb/tailprint
- **Description:**
  ```
  Tailprint equips AI agents with 22 visual document & testing superpowers: Tailwind-to-PDF rendering, visual regression testing, multi-slide carousels, and automated EU Factur-X e-invoicing.
  ```
