import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import { eInvoiceService } from '../src/services/eInvoice.js';

describe('PDF Operations & Factur-X Validation REST API', () => {
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

  it('merges multiple PDFs into a single document via POST /v1/pdf/merge', async () => {
    // 1. Generate 2 small PDFs
    const pdf1 = await browserService.renderPdf({
      html: '<h1 style="font-size:32px;">Doc 1 Cover</h1>',
      format: 'A4',
    });
    const pdf2 = await browserService.renderPdf({
      html: '<h1 style="font-size:32px;">Doc 2 Terms</h1>',
      format: 'A4',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/pdf/merge',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        pdfs: [
          `data:application/pdf;base64,${pdf1.toString('base64')}`,
          `data:application/pdf;base64,${pdf2.toString('base64')}`,
        ],
        output_filename: 'combined-contract.pdf',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('combined-contract.pdf');
    expect(res.rawPayload.length).toBeGreaterThan(1000);
  });

  it('splits pages from a PDF via POST /v1/pdf/split', async () => {
    // Generate a 2-page PDF
    const pdf = await browserService.renderPdf({
      html: '<div style="page-break-after:always;">Page 1</div><div>Page 2</div>',
      format: 'A4',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/pdf/split',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        pdf: `data:application/pdf;base64,${pdf.toString('base64')}`,
        pages: '1',
        output_filename: 'first-page-only.pdf',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('first-page-only.pdf');
  });

  it('stamps watermark on a PDF via POST /v1/pdf/stamp', async () => {
    const pdf = await browserService.renderPdf({
      html: '<h1>Confidential Document</h1>',
      format: 'A4',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/pdf/stamp',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        pdf: `data:application/pdf;base64,${pdf.toString('base64')}`,
        watermark_text: 'PROPRIETARY & CONFIDENTIAL',
        color: 'red',
        opacity: 0.25,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('watermarked.pdf');
  });

  it('compresses a PDF via POST /v1/pdf/compress', async () => {
    const pdf = await browserService.renderPdf({
      html: '<h1 class="text-4xl font-bold">Uncompressed Document</h1><p>Testing stream object compression.</p>',
      format: 'A4',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/pdf/compress',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        pdf: `data:application/pdf;base64,${pdf.toString('base64')}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['x-compression-savings']).toBeDefined();
  });

  it('validates a compliant Factur-X hybrid PDF via POST /v1/pdf/validate-einvoice', async () => {
    // 1. Generate an authentic Factur-X hybrid PDF using eInvoiceService
    const generated = await eInvoiceService.generateHybridInvoice({
      invoiceNumber: 'INV-VALIDATE-2026',
      currency: 'EUR',
      seller: {
        name: 'Alpha Tech ApS',
        vatId: 'DK12345678',
        country: 'DK',
        city: 'Copenhagen',
      },
      buyer: {
        name: 'Beta Cloud GmbH',
        vatId: 'DE987654321',
        country: 'DE',
        city: 'Munich',
      },
      lineItems: [
        { name: 'Cloud Infrastructure Hosting', quantity: 1, unitPrice: 200, vatRate: 25 },
        { name: 'DevOps Engineering Support', quantity: 4, unitPrice: 150, vatRate: 25 },
      ],
      paymentIban: 'DK0012345678901234',
    });

    // 2. Validate via API
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pdf/validate-einvoice',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        pdf: `data:application/pdf;base64,${generated.pdfBuffer.toString('base64')}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.isValid).toBe(true);
    expect(body.hasEmbeddedXml).toBe(true);
    expect(body.xmlFilename).toBe('factur-x.xml');
    expect(body.profile).toBe('BASIC');
    expect(body.invoiceDetails).toBeDefined();
    expect(body.invoiceDetails.invoiceNumber).toBe('INV-VALIDATE-2026');
    expect(body.invoiceDetails.currency).toBe('EUR');
    expect(body.invoiceDetails.seller.name).toBe('Alpha Tech ApS');
    expect(body.invoiceDetails.buyer.name).toBe('Beta Cloud GmbH');
    expect(body.invoiceDetails.totals.grandTotalAmount).toBe(1000);
    expect(body.errors.length).toBe(0);
  });

  it('rejects a non-compliant standard PDF with clear diagnostic errors via POST /v1/pdf/validate-einvoice', async () => {
    // Generate a standard PDF without Factur-X XML
    const regularPdf = await browserService.renderPdf({
      html: '<h1>Just a regular brochure</h1>',
      format: 'A4',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/pdf/validate-einvoice',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        pdf: `data:application/pdf;base64,${regularPdf.toString('base64')}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.isValid).toBe(false);
    expect(body.hasEmbeddedXml).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0]).toContain('No embedded Factur-X / ZUGFeRD XML file found');
  });
});
