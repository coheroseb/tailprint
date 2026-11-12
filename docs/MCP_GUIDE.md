# Tailprint Model Context Protocol (MCP) Guide (22 Tools)

> Official guide for integrating Tailprint's MCP server with Claude Desktop, Cursor IDE, Windsurf, Google Antigravity, and autonomous agent frameworks.

---

## 🤖 Oversigt / Overview

Tailprint stiller en 100% spec-kompatibel Model Context Protocol (MCP) server til rådighed med **22 native tools**. Serveren kan tilgås på to måder:
1. **Lokal stdio (CLI):** Kør via `npx -y tailprint`
2. **Fjern-SSE (Server-Sent Events):** Forbind direkte til `https://tailprint.com/v1/mcp/sse?api_key=sec_live_...`

---

## ⚙️ Klient-konfigurationer / Client Setup

### 1. Claude Desktop
Filplacering:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tailprint": {
      "command": "npx",
      "args": ["-y", "tailprint"],
      "env": {
        "TAILPRINT_API_KEY": "sec_live_din_nøgle_her"
      }
    }
  }
}
```

### 2. Cursor IDE
1. Gå til **Settings** ➔ **Features** ➔ **MCP Servers**
2. Klik **Add New MCP Server**
3. Udfyld felterne:
   - **Name:** `tailprint`
   - **Type:** `sse`
   - **URL:** `https://tailprint.com/v1/mcp/sse?api_key=sec_live_din_nøgle_her`

### 3. Windsurf
Redigér `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "tailprint": {
      "serverUrl": "https://tailprint.com/v1/mcp/sse?api_key=sec_live_din_nøgle_her"
    }
  }
}
```

---

## 📋 De 22 Native MCP Værktøjer / Complete Tools Catalog

### Dokument- & PDF-generering
1. `render_pdf`: Genererer print-klare vektor-PDF'er fra Tailwind HTML eller URL med headers/footers, margener og kryptering.
2. `render_template`: Renderer prædefinerede Tailwind skabeloner (faktura, certifikat, rapport, resume m.fl.) med dynamisk dataindsættelse.
3. `list_templates`: Returnerer et katalog over tilgængelige dokumentskabeloner.
4. `get_template_source`: Henter den fulde Tailwind HTML kildekode for en given skabelon, så en AI agent kan tilpasse den.

### Compliance & Europæisk E-Fakturering
5. `generate_einvoice`: Genererer en juridisk gyldig hybrid e-faktura (Factur-X / ZUGFeRD 2.2 / EN 16931) med indlejret CrossIndustryInvoice XML.

### PDF Operationer & Håndtering
6. `merge_pdfs`: Sammenfletter to eller flere PDF'er (base64 eller URLs) til ét samlet PDF dokument.
7. `split_pdf`: Udtrækker specifikke sider eller sideintervaller (f.eks. "1-3, 5, 8-10") til en ny PDF.
8. `fill_pdf_form`: Udfylder interaktive PDF-formularer (AcroForms) med tekst, tal eller afkrydsningsfelter samt valgfri flattening.
9. `compress_pdf`: Komprimerer og reducerer PDF-filstørrelse via objektstrømsoptimering.
10. `stamp_pdf`: Påfører diagonale vandmærker eller stempler (f.eks. "FORTROLIGT", "DRAFT", "CONFIDENTIAL") på tværs af alle sider.

### Grafik & Open Graph Billeder
11. `render_image`: Renderer 1200×630 Open Graph preview billeder i høj opløsning (PNG/JPEG) med SHA-256 caching.
12. `generate_social_card`: Skaber konverterende 1200×630 sociale bannere med moderne typografi og gradienter uden rå HTML.
13. `render_carousel`: Genererer multi-slide 1080×1350 portræt karruseller til LinkedIn (PDF) og Instagram (PNG) fra Markdown.
14. `render_device_mockup`: Omdanner enhver URL til en 3D MacBook Pro + iPhone præsentationsscene.

### Diagrammer & Data Visualisering
15. `render_chart`: Renderer højopløselige diagrammer (søjle, linje, cirkel, radar, polar) via Chart.js med inline chat-visning.
16. `render_mermaid`: Renderer Mermaid syntaks (flowcharts, sekvensdiagrammer, ER diagrammer, arkitektur) til PNG, SVG eller PDF.
17. `render_presentation`: Konverterer Markdown slides (adskilt med `---`) til 16:9 præsentations-PDF (1920×1080).
18. `generate_qr`: Genererer scanningsklare QR-koder og stregkoder til URLs, WiFi, betalinger og vCards.

### AI Ingestion & Web Scraping
19. `scrape_markdown`: Scraper offentlige URLs, fjerner støj med Mozilla Readability og returnerer ren GFM Markdown med 90%+ tokenbesparelse.
20. `extract_tables_from_url`: Udtrækker alle `<table>` elementer fra en URL til strukturerede JSON arrays og Markdown tabeller.

### Kvalitetssikring & Audit
21. `compare_snapshots`: Laver pixelmatch visuel regressionstest mellem to URLs eller snippets med pink overlay heatmap.
22. `audit_webpage`: Gennemfører teknisk SEO-, tilgængeligheds- og DOM-audit med samlet score (0-100) og anbefalinger.

---

## 💡 Eksempler på AI Agent Prompts

### E-Faktura (Factur-X)
> *"Opret en Factur-X e-faktura til Kunde ApS for 20 timers konsulentarbejde á 1.250 DKK/time med 25% moms og mit IBAN nummer."*

### Vektor-PDF Rapport
> *"Brug disse kvartalstal og generér en moderne 2-siders PDF rapport i A4 format med et Chart.js søjlediagram og sideskift."*

### Social Card & LinkedIn Karrusel
> *"Konverter denne blogpost om mikrotjenester til en 5-slides LinkedIn karrusel i mørkt tema og lav et 1200x630 Open Graph banner."*

### PDF Sammenfletning & Vandmærke
> *"Sammenflet dette tilbud med vores standard handelsbetingelser og stemple alle sider med 'FORTROLIGT'."*
