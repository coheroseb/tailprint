import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import { Tailprint } from '../src/sdk/index.js';

describe('Official Tailprint TypeScript SDK Suite', () => {
  let app: FastifyInstance;
  let client: Tailprint;
  let serverPort: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as any;
    serverPort = address.port;

    client = new Tailprint({
      apiKey: 'sec_live_dev_test_key_12345',
      baseUrl: `http://127.0.0.1:${serverPort}`,
    });
  });

  afterAll(async () => {
    await app.close();
    await browserService.close();
  });

  it('renders a vector PDF via client.renderPdf()', async () => {
    const pdfBuffer = await client.renderPdf({
      html: '<div class="p-8 bg-slate-900 text-white"><h1 class="text-2xl font-bold">SDK Rendered Document</h1></div>',
      format: 'A4',
      smart_pagination: true,
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('merges multiple PDF buffers via client.mergePdfs()', async () => {
    const doc1 = await client.renderPdf({ html: '<h1>Page One</h1>' });
    const doc2 = await client.renderPdf({ html: '<h1>Page Two</h1>' });

    const merged = (await client.mergePdfs([doc1, doc2], {
      output_filename: 'sdk-merged.pdf',
    })) as Buffer;

    expect(Buffer.isBuffer(merged)).toBe(true);
    expect(merged.toString('utf-8', 0, 5)).toBe('%PDF-');
    expect(merged.length).toBeGreaterThan(doc1.length);
  });

  it('stamps a watermark on a PDF via client.stampPdf()', async () => {
    const doc = await client.renderPdf({ html: '<h1>Contract Draft</h1>' });
    const stamped = (await client.stampPdf(doc, 'CONFIDENTIAL')) as Buffer;

    expect(Buffer.isBuffer(stamped)).toBe(true);
    expect(stamped.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  it('validates a generated Factur-X invoice via client.validateEInvoice()', async () => {
    const einvoice = await client.generateEInvoice({
      invoiceNumber: 'INV-SDK-001',
      currency: 'EUR',
      seller: {
        name: 'TechNord ApS',
        vatId: 'DK12345678',
        country: 'DK',
      },
      buyer: {
        name: 'EuroCloud AG',
        vatId: 'DE987654321',
        country: 'DE',
      },
      lineItems: [{ name: 'Software License', quantity: 1, unitPrice: 500, vatRate: 25 }],
      paymentIban: 'DK001234567890',
    });

    const report = await client.validateEInvoice({ pdf: einvoice });

    expect(report.isValid).toBe(true);
    expect(report.hasEmbeddedXml).toBe(true);
    expect(report.xmlFilename).toBe('factur-x.xml');
    expect(report.invoiceDetails?.invoiceNumber).toBe('INV-SDK-001');
    expect(report.invoiceDetails?.totals?.grandTotalAmount).toBe(625);
  });

  it('submits and polls async render job via client.renderPdfAsync() & client.waitForJob()', async () => {
    const jobAccepted = await client.renderPdfAsync({
      html: '<h1>Async SDK Doc</h1>',
      format: 'A4',
    });

    expect(jobAccepted.success).toBe(true);
    expect(jobAccepted.job_id).toMatch(/^job_render_/);

    const completed = await client.waitForJob(jobAccepted.job_id, {
      pollIntervalMs: 200,
      timeoutMs: 15000,
    });

    expect(completed.status).toBe('completed');
    expect(completed.results.length).toBe(1);
    expect(completed.results[0].download_url).toMatch(/\/d\/f_/);
  });

  it('executes batch rendering with merging via client.renderBatch()', async () => {
    const batchAccepted = await client.renderBatch({
      items: [
        { html: '<h1>Batch 1</h1>', filename: 'page-1.pdf' },
        { html: '<h1>Batch 2</h1>', filename: 'page-2.pdf' },
      ],
      merge_output: true,
      merged_filename: 'all-pages.pdf',
    });

    expect(batchAccepted.success).toBe(true);
    expect(batchAccepted.job_id).toMatch(/^job_batch_/);

    const completed = await client.waitForJob(batchAccepted.job_id, {
      pollIntervalMs: 250,
      timeoutMs: 20000,
    });

    expect(completed.status).toBe('completed');
    expect(completed.progress.completed).toBe(2);
    expect(completed.merged_output).toBeDefined();
    expect(completed.merged_output?.filename).toBe('all-pages.pdf');
  });

  it('retrieves real-time usage via client.getUsage()', async () => {
    const usage = await client.getUsage();
    expect(usage.monthly_limit).toBeGreaterThan(0);
    expect(typeof usage.current_usage).toBe('number');
    expect(typeof usage.remaining).toBe('number');
    expect(usage.status).toBe('active');
  });
});
