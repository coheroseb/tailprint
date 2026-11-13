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

  it('splices multiple parent PDFs via CRISPR-PDF (POST /v1/pdf/splice), resolves conflicting alleles, excises Cas9 knockouts, applies point mutations, and produces a queryable Offspring Cortex', async () => {
    // 1. Render Parent 1 (Mutual NDA)
    const p1Res = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: '<div class="p-8"><h1>Mutual NDA Agreement</h1><h2>Confidentiality Scope</h2><p>All source code and cryptographic keys remain confidential for 5 years.</p><h2>Legacy Non-Compete Restriction</h2><p>Recipient shall not build competing OCR tools in Scandinavia.</p></div>',
        neural_implant: true,
        embed_data: {
          counterparty: 'Nordisk Cloud ApS',
          discount_rate: '10%',
          payment_terms: 'Net 45 Days',
        },
        neural_context: {
          ip_ownership: 'All pre-existing IP remains with the disclosing party.',
        },
      },
    });
    expect(p1Res.statusCode).toBe(200);

    // 2. Render Parent 2 (Enterprise Cloud Proposal with conflicting discount_rate & payment_terms)
    const p2Res = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: { authorization: authHeader },
      payload: {
        html: '<div class="p-8"><h1>Enterprise Cloud Proposal</h1><h2>Volume Commitment</h2><p>Includes 2,500,000 monthly vector PDF renders at EUR 4,800/month.</p></div>',
        neural_implant: true,
        embed_data: {
          annual_contract_value: 'EUR 57,600',
          discount_rate: '18%',
          payment_terms: 'Net 14 Days',
        },
        neural_context: {
          sla_uptime_guarantee: '99.99% monthly uptime with 15% service credit remedies.',
        },
      },
    });
    expect(p2Res.statusCode).toBe(200);

    // 3. Splice Parent 1 + Parent 2 via POST /v1/pdf/splice with Cas9 knockout + point mutation
    const spliceRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/splice',
      headers: { authorization: authHeader },
      payload: {
        pdfs: [
          { pdf: p1Res.rawPayload.toString('base64'), label: 'Parent 1: Mutual NDA' },
          { pdf: p2Res.rawPayload.toString('base64'), label: 'Parent 2: Cloud Proposal' },
        ],
        title: 'Master Spliced Enterprise Agreement',
        phenotype: 'executive-indigo',
        knockout_terms: ['Legacy Non-Compete'],
        mutations: {
          discount_rate: '25% (Executive Board Mutation)',
        },
        return_report: true,
      },
    });

    expect(spliceRes.statusCode).toBe(200);
    const spliceBody = spliceRes.json();
    expect(spliceBody.status).toBe('spliced');
    expect(spliceBody.doc_id).toMatch(/^doc_/);
    expect(spliceBody.report.parents.length).toBe(2);
    expect(spliceBody.report.conflicts_resolved.length).toBeGreaterThanOrEqual(2);
    expect(spliceBody.report.knockout_exons_excised).toBeGreaterThanOrEqual(1);
    expect(spliceBody.report.spliced_proteome.discount_rate).toBe('25% (Executive Board Mutation)');
    expect(spliceBody.report.spliced_proteome.payment_terms).toBe('Net 14 Days');

    // 4. Ask the Offspring PDF's fused Multi-Parent Neural Cortex a question spanning both parents!
    const askOffspringRes = await app.inject({
      method: 'POST',
      url: '/v1/pdf/ask',
      payload: {
        pdf: spliceBody.pdf_base64,
        question: 'What is the SLA uptime guarantee and discount rate?',
      },
    });
    expect(askOffspringRes.statusCode).toBe(200);
    const askOffspringBody = askOffspringRes.json();
    expect(askOffspringBody.cryptographically_verified).toBe(true);
    expect(askOffspringBody.answer).toMatch(/99\.99%|25%/i);

    // 5. Verify /splice interactive lab page loads cleanly with valid inline JS
    const splicePageRes = await app.inject({
      method: 'GET',
      url: '/splice',
    });
    expect(splicePageRes.statusCode).toBe(200);
    expect(splicePageRes.body).toContain('CRISPR-PDF');
    const spliceScripts = [
      ...splicePageRes.body.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    expect(spliceScripts.length).toBeGreaterThan(0);
    for (const match of spliceScripts) {
      expect(() => new vm.Script(match[1])).not.toThrow();
    }

    // 6. Verify GET /v1/mcp/tools exposes splice_pdfs, sequence_pdf_genome, ask_pdf, and verify_pdf
    const mcpToolsRes = await app.inject({
      method: 'GET',
      url: '/v1/mcp/tools',
    });
    expect(mcpToolsRes.statusCode).toBe(200);
    const mcpCatalog = mcpToolsRes.json();
    expect(mcpCatalog.totalTools).toBe(15);
    const toolNames = mcpCatalog.tools.map((t: any) => t.name);
    expect(toolNames).toContain('splice_pdfs');
    expect(toolNames).toContain('sequence_pdf_genome');
    expect(toolNames).toContain('ask_pdf');
    expect(toolNames).toContain('verify_pdf');
  });
});
