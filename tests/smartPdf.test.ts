import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import vm from 'node:vm';
import { PDFDocument, rgb } from 'pdf-lib';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import { HOSTED_TEMPLATES } from '../src/config/hostedTemplates.js';

describe('Dual-Brain PDFs (Zero-OCR) & Cryptographic Proof-of-Origin', () => {
  let app: FastifyInstance;
  const authHeader = 'Bearer sec_live_dev_test_key_12345';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await browserService.close();
  });

  it('automatically embeds Dual-Brain JSON manifest on template_id renders and extracts in 0ms via POST /v1/pdf/extract', async () => {
    const invoiceTemplate = HOSTED_TEMPLATES.find((t) => t.id === 'invoice-modern')!;
    const customData = {
      ...invoiceTemplate.example,
      invoice_number: 'INV-DUAL-BRAIN-001',
    };

    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        template_id: 'invoice-modern',
        data: customData,
      },
    });

    expect(renderRes.statusCode).toBe(200);
    const docId = renderRes.headers['x-tailprint-doc-id'] as string;
    expect(docId).toMatch(/^doc_[a-f0-9]{16}$/);
    expect(renderRes.headers['x-tailprint-ai-ready']).toBe('true');

    // Extract structured JSON in 0ms without OCR
    const pdfBase64 = renderRes.rawPayload.toString('base64');
    const extractRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/extract',
      payload: { pdf: `data:application/pdf;base64,${pdfBase64}` },
    });

    expect(extractRes.statusCode).toBe(200);
    const report = extractRes.json();
    expect(report.valid).toBe(true);
    expect(report.ai_ready).toBe(true);
    expect(report.tampered).toBe(false);
    expect(report.doc_id).toBe(docId);
    expect(report.template_id).toBe('invoice-modern');
    expect(report.data).toBeTruthy();
    expect(report.data.invoice_number).toBe('INV-DUAL-BRAIN-001');
    expect(report.data.seller.name).toBe(invoiceTemplate.example.seller.name);
  });

  it('embeds arbitrary structured JSON via embed_data on raw HTML renders', async () => {
    const embeddedPayload = {
      document_type: 'saas_agreement',
      contract_id: 'CTR-2026-9981',
      annual_value_eur: 48500,
      auto_renew: true,
      parties: ['Tailprint ApS', 'Nordic FinTech Group'],
    };

    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: '<div class="p-10 font-sans"><h1 class="text-2xl font-bold">Master SaaS Agreement #CTR-2026-9981</h1></div>',
        embed_data: embeddedPayload,
      },
    });

    expect(renderRes.statusCode).toBe(200);
    expect(renderRes.headers['x-tailprint-ai-ready']).toBe('true');

    const extractRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/extract',
      payload: { pdf: renderRes.rawPayload.toString('base64') },
    });

    expect(extractRes.statusCode).toBe(200);
    const report = extractRes.json();
    expect(report.valid).toBe(true);
    expect(report.ai_ready).toBe(true);
    expect(report.data).toEqual(embeddedPayload);
  });

  it('cryptographically signs a PDF (sign: true, verify_seal: true), registers proof in ledger, and verifies authenticity', async () => {
    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: '<div class="p-12 font-sans"><h1>Board Resolution #2026-04</h1><p>Approved unanimously.</p></div>',
        sign: true,
        verify_seal: true,
        embed_data: {
          resolution_id: 'BR-2026-04',
          approved: true,
        },
      },
    });

    expect(renderRes.statusCode).toBe(200);
    const docId = renderRes.headers['x-tailprint-doc-id'] as string;
    const sigHeader = renderRes.headers['x-tailprint-signature'] as string;
    expect(docId).toMatch(/^doc_[a-f0-9]{16}$/);
    expect(sigHeader).toMatch(/^sha256=[a-f0-9]{64}$/);

    // 1. Public Ledger Lookup by docId (GET /v1/pdf/verify/:docId)
    const ledgerRes = await app.inject({
      method: 'GET',
      url: `/v1/pdf/verify/${docId}`,
    });
    expect(ledgerRes.statusCode).toBe(200);
    const ledger = ledgerRes.json();
    expect(ledger.found).toBe(true);
    expect(ledger.doc_id).toBe(docId);
    expect(ledger.signed).toBe(true);
    expect(ledger.ai_ready).toBe(true);
    expect(ledger.data_keys).toEqual(['resolution_id', 'approved']);

    // 2. Full Cryptographic & Content Stream Verification (POST /v1/pdf/verify)
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/verify',
      payload: { pdf: renderRes.rawPayload.toString('base64') },
    });
    expect(verifyRes.statusCode).toBe(200);
    const report = verifyRes.json();
    expect(report.valid).toBe(true);
    expect(report.signed).toBe(true);
    expect(report.tampered).toBe(false);
    expect(report.signature_valid).toBe(true);
    expect(report.content_intact).toBe(true);
    expect(report.ledger_verified).toBe(true);
    expect(report.data).toEqual({
      resolution_id: 'BR-2026-04',
      approved: true,
    });
  });

  it('detects tampering when a signed PDF has visual content or pages modified after issuance', async () => {
    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: '<div class="p-12 font-sans"><h1>Wire Transfer Instruction: EUR 10,000</h1></div>',
        sign: true,
        embed_data: { amount_eur: 10000, iban: 'DK5000400440116243' },
      },
    });

    expect(renderRes.statusCode).toBe(200);

    // Tamper with the signed PDF by drawing unauthorized content on page 1
    const pdfDoc = await PDFDocument.load(renderRes.rawPayload);
    const firstPage = pdfDoc.getPages()[0];
    firstPage.drawText('ALTERED AMOUNT: EUR 990,000', {
      x: 50,
      y: 400,
      size: 18,
      color: rgb(1, 0, 0),
    });
    const tamperedBytes = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/verify',
      payload: { pdf: tamperedBytes.toString('base64') },
    });

    expect(verifyRes.statusCode).toBe(200);
    const report = verifyRes.json();
    expect(report.valid).toBe(false);
    expect(report.signed).toBe(true);
    expect(report.tampered).toBe(true);
    expect(report.content_intact).toBe(false);
    expect(report.reasons.join(' ')).toMatch(/fingerprint mismatch|modified after issuance/i);
  });

  it('renders the public interactive Verifier & Dual-Brain Inspector UI at GET /verify', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/verify/doc_1234567890abcdef',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Verify &amp; Inspect');
    expect(res.body).toContain('doc_1234567890abcdef');

    const inlineScripts = [
      ...res.body.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    expect(inlineScripts.length).toBeGreaterThan(0);
    for (const match of inlineScripts) {
      expect(() => new vm.Script(match[1])).not.toThrow();
    }
  });

  it('compiles a Neural-Implant PDF (64-D Int8 vectors + pre-render DOM bounding boxes + subconscious latent memory + clickable PDF Link annotation) and answers questions in sub-milliseconds via POST /v1/pdf/ask', async () => {
    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: `
          <div class="p-10 font-sans">
            <h1>Enterprise Cloud Proposal #PROP-2026-77</h1>
            <p>Prepared for Danske Bank A/S with payment due by 2026-12-15.</p>
            <table>
              <thead>
                <tr><th>Service</th><th>Qty</th><th>Amount</th></tr>
              </thead>
              <tbody>
                <tr><td>Dedicated GPU Render Cluster</td><td>2</td><td>EUR 14,500.00</td></tr>
              </tbody>
            </table>
          </div>
        `,
        neural_implant: true,
        neural_persona: 'Senior Solutions Architect for Tailprint Cloud',
        neural_context: {
          early_payment_discount: '3% kontantrabat ved betaling inden 7 dage, eller 15% rabat ved årsaftale.',
          gdpr_and_hosting: 'Al data behandles i EU (Frankfurt & Falkenstein) under ISO-27001 og underskrevet GDPR databehandleraftale.',
          sla_uptime: '99.99% garanteret oppetid med finansiel kompensation.',
        },
      },
    });

    expect(renderRes.statusCode).toBe(200);
    expect(renderRes.headers['x-tailprint-neural-implant']).toBe('true');
    const docId = renderRes.headers['x-tailprint-doc-id'] as string;
    const brainUrl = renderRes.headers['x-tailprint-brain-url'] as string;
    expect(brainUrl).toContain(`/brain/${docId}`);
    expect(Number(renderRes.headers['x-tailprint-cortex-synapses'])).toBeGreaterThanOrEqual(5);

    // Verify that Page 1 has an interactive ISO-32000 /Link annotation pointing to /brain/:docId
    const loadedDoc = await PDFDocument.load(renderRes.rawPayload);
    const annots = loadedDoc.getPages()[0].node.Annots();
    expect(annots).toBeTruthy();
    expect(annots!.size()).toBeGreaterThanOrEqual(1);

    // 1. Ask about unprinted Subconscious Latent Memory (GDPR & discounts) directly against the PDF bytes!
    const askLatentRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/ask',
      payload: {
        pdf: renderRes.rawPayload.toString('base64'),
        question: 'What discount do we get for early payment, and where is data hosted under GDPR?',
      },
    });

    expect(askLatentRes.statusCode).toBe(200);
    const latentAns = askLatentRes.json();
    expect(latentAns.cryptographically_verified).toBe(true);
    expect(latentAns.primary_source_layer).toBe('latent_memory');
    expect(latentAns.answer).toMatch(/kontantrabat|Frankfurt|GDPR/i);
    expect(latentAns.citations.length).toBeGreaterThan(0);

    // 2. Ask about Visual DOM Content (table row & amount) and verify physical bounding-box coordinates are returned!
    const askVisualRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/ask',
      payload: {
        doc_id: docId,
        question: 'What is the amount for the Dedicated GPU Render Cluster?',
      },
    });

    expect(askVisualRes.statusCode).toBe(200);
    const visualAns = askVisualRes.json();
    expect(visualAns.answer).toContain('14,500.00');
    const visualCitation = visualAns.citations.find((c: any) => c.layer === 'visual_dom');
    expect(visualCitation).toBeTruthy();
    expect(visualCitation.bbox).toBeTruthy();
    expect(visualCitation.bbox.page).toBe(1);
    expect(visualCitation.bbox.w_pt).toBeGreaterThan(10);

    // 3. Verify GET /brain/:docId renders the Interactive Split-Screen Neural Reader with valid JS
    const brainPageRes = await app.inject({
      method: 'GET',
      url: `/brain/${docId}`,
    });
    expect(brainPageRes.statusCode).toBe(200);
    expect(brainPageRes.body).toContain('Neural-Implant PDF');
    const brainScripts = [
      ...brainPageRes.body.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    expect(brainScripts.length).toBeGreaterThan(0);
    for (const match of brainScripts) {
      expect(() => new vm.Script(match[1])).not.toThrow();
    }

    // 4. Verify POST /v1/pdf/cortex extracts starter suggested_questions & synapses for white-label frontends
    const cortexRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/cortex',
      payload: { pdf: renderRes.rawPayload.toString('base64') },
    });
    expect(cortexRes.statusCode).toBe(200);
    const cortexJson = cortexRes.json();
    expect(cortexJson.doc_id).toBe(docId);
    expect(Array.isArray(cortexJson.suggested_questions)).toBe(true);
    expect(cortexJson.suggested_questions.length).toBeGreaterThan(0);
  });

  it('supports White-Label Neural-Implant PDFs (neural_custom_url, neural_badge_label, and headless neural_badge: false)', async () => {
    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: '<div><h1>White-Label Invoice #WL-99</h1><p>Total due: 49,000 DKK</p></div>',
        neural_implant: true,
        neural_custom_url: 'https://portal.kundedomæne.dk/faktura/{{doc_id}}',
        neural_badge_label: 'KUNDEDOMÆNE AI • SPØRG FAKTURAEN',
        verify_custom_url: 'https://portal.kundedomæne.dk/verify/{{doc_id}}',
      },
    });

    expect(renderRes.statusCode).toBe(200);
    const docId = renderRes.headers['x-tailprint-doc-id'] as string;
    expect(renderRes.headers['x-tailprint-brain-url']).toBe(
      `https://portal.kundedomæne.dk/faktura/${docId}`
    );
    expect(renderRes.headers['x-tailprint-verify-url']).toBe(
      `https://portal.kundedomæne.dk/verify/${docId}`
    );
  });

  it('supports Neural-Implant, Latent Context, and Proof-of-Origin directly from /studio and POST /v1/tools/studio/render-pdf', async () => {
    const studioPage = await app.inject({
      method: 'GET',
      url: '/studio',
    });
    expect(studioPage.statusCode).toBe(200);
    expect(studioPage.body).toContain('Neural-Implant');
    const studioScripts = [
      ...studioPage.body.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    expect(studioScripts.length).toBeGreaterThan(0);
    for (const match of studioScripts) {
      expect(() => new vm.Script(match[1])).not.toThrow();
    }

    const studioRender = await app.inject({
      method: 'POST',
      url: '/v1/tools/studio/render-pdf',
      payload: {
        html: '<div class="p-8"><h1>Studio Neural Invoice #ST-101</h1><p>Total: €2,900.00</p></div>',
        format: 'A4',
        landscape: false,
        smart_pagination: true,
        neural_implant: true,
        neural_persona: 'Studio Test Concierge',
        neural_context: { studio_discount: '5% early bird discount' },
        sign: true,
        verify_seal: true,
      },
    });

    expect(studioRender.statusCode).toBe(200);
    expect(studioRender.headers['x-tailprint-neural-implant']).toBe('true');
    const docId = studioRender.headers['x-tailprint-doc-id'] as string;
    expect(docId).toMatch(/^doc_/);
    expect(studioRender.headers['x-tailprint-brain-url']).toBe(`/brain/${docId}`);
    expect(studioRender.headers['x-tailprint-verify-url']).toBe(`/verify/${docId}`);
  });

  it('supports placing a single <div data-neural-button></div> anywhere in HTML and rewrites its PDF /Link annotation to the final brainUrl', async () => {
    const renderRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: `
          <div class="p-10">
            <div class="flex justify-between items-center">
              <h1>Custom Button Placement Invoice #CB-2026</h1>
              <div data-neural-button></div>
            </div>
            <p>Payment amount: 18,400 DKK due within 14 days.</p>
          </div>
        `,
        neural_custom_url: 'https://chat.mitdomæne.dk/ask/{{doc_id}}',
      },
    });

    expect(renderRes.statusCode).toBe(200);
    expect(renderRes.headers['x-tailprint-neural-implant']).toBe('true');
    const docId = renderRes.headers['x-tailprint-doc-id'] as string;
    const expectedUrl = `https://chat.mitdomæne.dk/ask/${docId}`;
    expect(renderRes.headers['x-tailprint-brain-url']).toBe(expectedUrl);

    const loadedDoc = await PDFDocument.load(renderRes.rawPayload);
    const annots = loadedDoc.getPages()[0].node.Annots();
    expect(annots).toBeTruthy();
    // Exactly 1 /Link annotation from the user's <div data-neural-button></div> (no duplicate bottom-left badge)
    expect(annots!.size()).toBe(1);
  });

  it('supports Time-Limited Isotope PDFs with selective <span data-isotope> decay, AES-256-GCM Dual-Brain lock, SCRAM Kill Switch (POST /v1/pdf/expire), and deadline extension', async () => {
    // 1. Render a stored Time-Limited Isotope PDF with <span data-isotope="14d" data-decayed="[TILBUD UDLØBET]">
    const storeRes = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: `
          <div class="p-10 font-sans">
            <h1>Enterprise Kundetilbud #ISO-2026</h1>
            <p>Kampagnepris: <span data-isotope="14d" data-decayed="[TILBUD UDLØBET — KONTAKT SALG]">85.000 DKK ekskl. moms</span></p>
            <div data-expire-button></div>
          </div>
        `,
        store: true,
        embed_data: {
          quote_id: 'ISO-2026',
          special_price_dkk: 85000,
          discount_code: 'VIP-25-OFF',
        },
        neural_implant: true,
        neural_context: {
          internal_margin: 'Kampagneprisen på 85.000 DKK gælder kun indtil udløbsdatoen.',
        },
        expire_message: 'Tilbuddet #ISO-2026 er udløbet.',
      },
    });

    expect(storeRes.statusCode).toBe(200);
    const storedBody = storeRes.json();
    expect(storedBody.success).toBe(true);
    expect(storedBody.isotope).toBe(true);
    expect(storedBody.docId).toMatch(/^doc_/);
    expect(storedBody.fileId).toMatch(/\.pdf$/);

    const docId = storedBody.docId as string;
    const fileId = storedBody.fileId as string;

    // 2. Fetch the hosted PDF while ACTIVE -> should return X-Tailprint-Isotope-Status: active
    const activeDownload = await app.inject({
      method: 'GET',
      url: `/d/${fileId}`,
    });
    expect(activeDownload.statusCode).toBe(200);
    expect(activeDownload.headers['x-tailprint-isotope-status']).toBe('active');
    const activePdfBuffer = activeDownload.rawPayload;

    // 3. Verify the active PDF via POST /v1/pdf/verify -> should be valid: true, expired: false, and decrypt Dual-Brain data!
    const verifyActiveRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/verify',
      payload: { pdf: activePdfBuffer.toString('base64') },
    });
    expect(verifyActiveRes.statusCode).toBe(200);
    const activeReport = verifyActiveRes.json();
    expect(activeReport.valid).toBe(true);
    expect(activeReport.isotope).toBe(true);
    expect(activeReport.expired).toBe(false);
    expect(activeReport.data).toEqual({
      quote_id: 'ISO-2026',
      special_price_dkk: 85000,
      discount_code: 'VIP-25-OFF',
    });

    // 4. Trigger Remote SCRAM Kill Switch (POST /v1/pdf/expire with action: "expire_now")
    const scramRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/expire',
      payload: {
        doc_id: docId,
        action: 'expire_now',
        expire_message: 'Tilbuddet blev tilbagekaldt af salgsafdelingen.',
      },
    });
    expect(scramRes.statusCode).toBe(200);
    const scramJson = scramRes.json();
    expect(scramJson.expired).toBe(true);
    expect(scramJson.revoked).toBe(true);

    // 5. Fetch the SAME hosted URL (/d/:fileId) -> now seamlessly serves the pre-compiled Decayed PDF!
    const decayedDownload = await app.inject({
      method: 'GET',
      url: `/d/${fileId}`,
    });
    expect(decayedDownload.statusCode).toBe(200);
    expect(decayedDownload.headers['x-tailprint-isotope-status']).toBe('decayed');
    expect(Buffer.compare(activePdfBuffer, decayedDownload.rawPayload)).not.toBe(0);

    // 6. Verify that EVEN the previously downloaded activePdfBuffer now reports expired: true and withholds Dual-Brain JSON!
    const verifyAfterExpireRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/verify',
      payload: { pdf: activePdfBuffer.toString('base64') },
    });
    expect(verifyAfterExpireRes.statusCode).toBe(200);
    const expiredReport = verifyAfterExpireRes.json();
    expect(expiredReport.valid).toBe(false);
    expect(expiredReport.expired).toBe(true);
    expect(expiredReport.revoked).toBe(true);
    expect(expiredReport.data).toBeNull();

    // 7. Verify that POST /v1/pdf/ask refuses to answer questions on an expired/revoked Isotope PDF
    const askExpiredRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/ask',
      payload: {
        doc_id: docId,
        question: 'Hvad er kampagneprisen?',
      },
    });
    expect(askExpiredRes.statusCode).toBe(400);
    const askExpiredJson = askExpiredRes.json();
    expect(askExpiredJson.message).toMatch(/EXPIRED|REVOKED|tilbagekaldt/i);

    // 8. Extend the document's lifetime by +7d (POST /v1/pdf/expire with action: "extend") -> reactivates the document!
    const extendRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/expire',
      payload: {
        doc_id: docId,
        action: 'extend',
        extend_by: '7d',
      },
    });
    expect(extendRes.statusCode).toBe(200);
    const extendJson = extendRes.json();
    expect(extendJson.expired).toBe(false);
    expect(extendJson.revoked).toBe(false);
    expect(extendJson.remaining_seconds).toBeGreaterThan(86400);

    // 9. Confirm /d/:fileId is active again and /v1/pdf/verify decrypts data again!
    const reactivatedDownload = await app.inject({
      method: 'GET',
      url: `/d/${fileId}`,
    });
    expect(reactivatedDownload.headers['x-tailprint-isotope-status']).toBe('active');

    const verifyReactivatedRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/verify',
      payload: { pdf: activePdfBuffer.toString('base64') },
    });
    expect(verifyReactivatedRes.json().valid).toBe(true);
    expect(verifyReactivatedRes.json().data.special_price_dkk).toBe(85000);
  });
});
