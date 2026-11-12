# Tailprint Developer Guides & Best Practices (Vejledninger)

> Complete technical guides, tutorials, and architectural best practices for building with Tailprint ([tailprint.com](https://tailprint.com)).

---

## 📑 Indholdsfortegnelse / Table of Contents
1. [Hurtigstart (Quickstart)](#1-hurtigstart-quickstart)
2. [Vejledning: Tailwind CSS til Print & Vector PDF](#2-vejledning-tailwind-css-til-print--vector-pdf)
3. [Vejledning: Europæisk E-Fakturering (Factur-X / ZUGFeRD / EN 16931)](#3-vejledning-europæisk-e-fakturering-factur-x--zugferd--en-16931)
4. [Vejledning: High-Res Open Graph & Social Cards](#4-vejledning-high-res-open-graph--social-cards)
5. [Vejledning: AI Web Scraping til LLM & RAG Context](#5-vejledning-ai-web-scraping-til-llm--rag-context)
6. [Vejledning: Zero Retention & Enterprise Datasikkerhed](#6-vejledning-zero-retention--enterprise-datasikkerhed)
7. [Vejledning: Interaktive Værktøjer & Template Studio](#7-vejledning-interaktive-værktøjer--template-studio)
8. [Fejlhåndtering, Quotas & Rate Limits](#8-fejlhåndtering-quotas--rate-limits)

---

## 1. Hurtigstart (Quickstart)

Tailprint genererer print-klare vektor-PDF'er, 1200×630 Open Graph billeder og EU-godkendte e-fakturaer direkte ud fra vilkårlig HTML stylet med **Tailwind CSS**.

### Autentificering
Alle kald til `/v1/...` kræver en API-nøgle sendt i `Authorization`-headeren:
```http
Authorization: Bearer sec_live_...
```
Hent en gratis udviklernøgle (100 renders/mdr. uden kreditkort):
```bash
curl -X POST https://tailprint.com/v1/auth/claim-free-key \
  -H "Content-Type: application/json" \
  -d '{"email": "udvikler@virksomhed.dk"}'
```

### Eksempel: Generér dit første dokument (cURL)
```bash
curl -X POST https://tailprint.com/v1/render/pdf \
  -H "Authorization: Bearer sec_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<div class=\"p-12 bg-slate-900 text-white font-sans\"><h1 class=\"text-3xl font-black text-indigo-400\">Faktura #2026-01</h1><p class=\"text-slate-400 mt-2\">Genereret med Tailwind CSS på under 800ms.</p></div>",
    "format": "A4",
    "smart_pagination": true
  }' \
  --output faktura.pdf
```

---

## 2. Vejledning: Tailwind CSS til Print & Vector PDF

Tailprint bruger en isoleret, forvarmet headless Chromium motor med fuld Just-In-Time (JIT) Tailwind CSS kompilering. Det betyder, at du kan bruge vilkårlige Tailwind klasser (`w-[420px]`, `text-[13px]`, `bg-[#0f172a]`), flexbox, grid og moderne gradienter.

### Vilkårlige værdier til millimeterspecifikation
Når du designer printdokumenter, anbefales det at anvende faste Tailwind arbitrary values:
- **A4 bredde:** `max-w-[794px]` eller `w-[210mm]`
- **Margener & paddings:** `p-[20mm]`, `space-y-[6mm]`
- **Typografi:** `text-[13px]`, `leading-[1.5]`, `tracking-[-0.01em]`

### Smart Pagination Shield (Sideskift uden fejl)
Et af de største problemer ved HTML-til-PDF konvertering er, at tabeller, signaturblokke eller infobokse bliver delt uhensigtsmæssigt midt på en linje på tværs af et sideskift.

1. **Undgå opdeling af elementer:**
   Tilføj `break-inside-avoid` på elementer, som altid skal holdes samlet på én side:
   ```html
   <div class="break-inside-avoid p-6 bg-slate-50 border border-slate-200 rounded-xl">
     <h4 class="font-bold text-slate-800">Underskrift & Godkendelse</h4>
     <div class="mt-8 border-b border-slate-400 w-64"></div>
   </div>
   ```

2. **Tvungent sideskift:**
   Brug `break-before-page` eller `break-after-page` for at starte et nyt kapitel på en frisk side:
   ```html
   <section class="break-before-page">
     <h2 class="text-2xl font-bold">Kapitel 2: Økonomisk Oversigt</h2>
   </section>
   ```

3. **Aktivér automatisk Smart Pagination:**
   Sæt `"smart_pagination": true` i dit render payload. Tailprint injicerer automatisk skræddersyede `@media print` regler, der beskytter `<tr>`, `table`, cards og billeder mod sideskift.

### Dynamiske sidehoveder og sidefødder (Headers/Footers)
Chromium understøtter dynamiske tokens i `header_html` og `footer_html`:
- `<span class="pageNumber"></span>` — Nuværende sidenummer
- `<span class="totalPages"></span>` — Samlet sideantal
- `<span class="date"></span>` — Dags dato
- `<span class="title"></span>` — Dokumenttitel

**Bemærk:** Sidehoved- og sidefodsskabeloner skal have eksplicit inline CSS fontstørrelse (f.eks. `font-size: 9px; width: 100%; display: flex; justify-content: space-between;`), og du skal reservere tilstrækkelig margin (f.eks. `"margin": { "top": "40px", "bottom": "40px" }`).

---

## 3. Vejledning: Europæisk E-Fakturering (Factur-X / ZUGFeRD / EN 16931)

EU-direktiv 2014/55/EU og nationale lovkrav for B2B e-fakturering i Danmark, Tyskland, Frankrig, Italien og Polen stiller krav om elektronisk strukturerede fakturaer.

### Hvad er en hybrid faktura?
En hybrid e-faktura (Factur-X / ZUGFeRD 2.2) består af:
1. **Visuel PDF (PDF/A-3):** En layoutmæssig PDF, som et menneske kan åbne, læse og printe i enhver PDF-læser.
2. **Indlejret XML (CrossIndustryInvoice):** En standardiseret XML-fil (`factur-x.xml`) indlejret direkte i PDF'ens filkatalog (`/EmbeddedFiles`).

Når en virksomheds ERP-system (f.eks. SAP, DATEV, Dinero, Billy, Dynamics 365) modtager filen, udtrækker det automatisk XML'en for øjeblikkelig bogføring, uden behov for skrøbelig OCR scanning.

### Kald via API
Endpoint: `POST /v1/render/einvoice`
```json
{
  "invoiceNumber": "INV-2026-0042",
  "issueDate": "2026-11-12",
  "dueDate": "2026-12-12",
  "currency": "EUR",
  "profile": "BASIC",
  "seller": {
    "name": "Nordic Tech Solutions ApS",
    "vatId": "DK12345678",
    "street": "Strøget 45",
    "city": "København",
    "country": "DK"
  },
  "buyer": {
    "name": "Deutsche Logistik AG",
    "vatId": "DE987654321",
    "street": "Friedrichstraße 100",
    "city": "Berlin",
    "country": "DE"
  },
  "lineItems": [
    {
      "name": "Senior Cloud Architecture (40 timer)",
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

## 4. Vejledning: High-Res Open Graph & Social Cards

Brug `POST /v1/render/image` til at generere sociale delingsbilleder (1200×630 px) til LinkedIn, Twitter/X, Facebook og Slack.

### SHA-256 Caching
- Tailprint hasher HTML, CSS og parametre med SHA-256.
- Gentagne kald med samme indhold returnerer lynhurtigt et cachet billede (`X-Cache: HIT`) på under 50ms.
- Sæt `"store": true` for at modtage en fast CDN-adresse til brug i `<meta property="og:image" content="...">`.

---

## 5. Vejledning: AI Web Scraping til LLM & RAG Context

Når LLM'er (f.eks. Claude, Gemini, OpenAI) skal læse offentlige hjemmesider, indeholder rå HTML typisk 80-95% overflødig støj: cookie-bannere, menulinjer, trackere og annoncer.

Endpoint: `POST /v1/scrape/markdown`
- Renser siden med **Mozilla Readability** for at udtrække hovedartiklen.
- Konverterer til rent **GitHub Flavored Markdown (GFM)**.
- Sparer **90%+ tokens** i dit context window.
- Evaluering af dynamisk JavaScript (SPAs, React, Next.js).
- 24-timers Redis-caching.

---

## 6. Vejledning: Zero Retention & Enterprise Datasikkerhed

Tailprint er bygget til virksomheder med strenge krav til GDPR, HIPAA og fortrolighed:
- **Zero Retention Mode (`"no_store": true`):** Dokumentet genereres udelukkende i RAM, gemmes aldrig på disk, logges ikke, og slettes øjeblikkeligt efter streaming til klienten. Responsen indeholder headeren `X-Tailprint-Zero-Retention: active`.
- **Kryptering med adgangskode:** Tilføj `"password": "dit-hemmelige-kodeord"` under `POST /v1/render/pdf` for at kryptere PDF'en med AES-256.
- **SSRF Sandboxing:** Chromium sandbox blokerer automatisk for adgang til interne netværk (`127.0.0.1`, `localhost`, `10.0.0.0/8`, metadata endpoints `169.254.169.254`).

---

## 7. Vejledning: Interaktive Værktøjer & Template Studio

Tailprint tilbyder både webbrugerflader og tilhørende API-endpoints:
- **Interactive Template Studio:** [`tailprint.com/studio`](https://tailprint.com/studio) — Redigér Tailwind HTML live med øjeblikkelig PDF-forhåndsvisning.
- **LinkedIn Carousel Maker:** [`tailprint.com/tools/carousel`](https://tailprint.com/tools/carousel) & `POST /v1/tools/carousel` — Omdan Markdown til 1080×1350 portræt-karruseller.
- **Factur-X & PEPPOL Generator:** [`tailprint.com/tools/factur-x`](https://tailprint.com/tools/factur-x) & `POST /v1/tools/factur-x` — Generér EU-kompatible e-fakturaer online.
- **Visual Regression Diff:** [`tailprint.com/tools/visual-diff`](https://tailprint.com/tools/visual-diff) & `POST /v1/tools/visual-diff` — Pixelmatch diff heatmap til QA og regressionstest.
- **Device Mockup Generator:** [`tailprint.com/tools/mockup`](https://tailprint.com/tools/mockup) & `POST /v1/tools/mockup` — 3D MacBook Pro + iPhone præsentationsscener.

---

## 8. Fejlhåndtering, Quotas & Rate Limits

Kontroller forbrug i realtid via `GET /v1/usage`:
```bash
curl -X GET https://tailprint.com/v1/usage \
  -H "Authorization: Bearer sec_live_..."
```

### HTTP Statuskoder
- `200 OK`: Succes. Returnerer PDF/PNG binær stream eller JSON.
- `400 Bad Request`: Ugyldig body eller modstridende parametre (`store: true` sammen med `no_store: true`).
- `401 Unauthorized`: Manglende eller ugyldig API-nøgle.
- `429 Too Many Requests`: Månedlig kvote opbrugt eller rate limit nået.
- `500 Internal Server Error`: Fejl i browser rendering.
- `504 Gateway Timeout`: Rendering overskred timeout (30 sekunder).
