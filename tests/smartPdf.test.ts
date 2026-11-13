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
});
