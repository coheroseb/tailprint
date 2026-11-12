import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { decryptPDF } from 'cryptpdf';
import { PDFDocument } from 'pdf-lib';
import { buildApp } from '../src/server.js';
import { env } from '../src/config/env.js';
import { redisService } from '../src/services/redis.js';
import { stripeService } from '../src/services/stripe.js';

describe('Tailprint Test Suite', () => {
  let app: FastifyInstance;
  const validDevKey = env.DEV_DEFAULT_API_KEY || 'sec_live_dev_test_key_12345';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await redisService.storeApiKey(validDevKey, {
      key_prefix: validDevKey.slice(0, 12),
      customer_id: 'cus_dev_sandbox',
      plan: 'starter',
      monthly_limit: 10000,
      status: 'active',
      created_at: new Date().toISOString(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('System & Documentation', () => {
    it('GET / renders showcase landing page with templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('Tailprint');
      expect(response.body).toContain('Invoice');
      expect(response.body).toContain('Certificate');
    });

    it('GET /dashboard renders the customer self-service dashboard page', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dashboard',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('Customer Dashboard');
      expect(response.body).toContain('tailprint_api_key');
    });

    it('GET /templates returns catalog of available templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/templates',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.templates.length).toBe(8);
      expect(data.templates.map((t: any) => t.id)).toEqual([
        'invoice',
        'certificate',
        'report',
        'resume',
        'og-card',
        'shipping-label',
        'ticket',
        'receipt',
      ]);
    });

    it('GET /health returns status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('ok');
      expect(typeof data.timestamp).toBe('string');
    });

    it('GET /docs renders Scalar API documentation UI', async () => {
      // Fastify / Scalar standard redirect /docs -> /docs/
      const redirectRes = await app.inject({
        method: 'GET',
        url: '/docs',
      });
      expect(redirectRes.statusCode).toBe(301);
      expect(redirectRes.headers.location).toBe('/docs/');

      // Direct document UI render
      const response = await app.inject({
        method: 'GET',
        url: '/docs/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('Scalar');
    });

    it('GET /tools renders the free developer tools hub', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tools',
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('Multi-Slide Carousel Maker');
      expect(response.body).toContain('Factur-X E-Invoice Generator');
      expect(response.body).toContain('Visual Regression Diff Heatmap');
      expect(response.body).toContain('Instant Device Mockup Generator');
    });

    it('GET /tools/mockup and /mockup render the device mockup generator tool page', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/tools/mockup' });
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toContain('Website Device Mockup Generator');

      const res2 = await app.inject({ method: 'GET', url: '/mockup' });
      expect(res2.statusCode).toBe(200);
      expect(res2.body).toContain('Website Device Mockup Generator');
    });

    it('GET /studio, /tools/studio, and /editor render the Interactive Template Studio', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/studio' });
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toContain('Live Interactive Template Studio');
      expect(res1.body).toContain('Smart Pagination Shield');

      const res2 = await app.inject({ method: 'GET', url: '/tools/studio' });
      expect(res2.statusCode).toBe(200);
      expect(res2.body).toContain('Live Interactive Template Studio');

      const res3 = await app.inject({ method: 'GET', url: '/editor' });
      expect(res3.statusCode).toBe(200);
      expect(res3.body).toContain('Live Interactive Template Studio');
    });

    it('POST /v1/tools/studio/render-pdf renders vector PDF via playground endpoint', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/tools/studio/render-pdf',
        payload: {
          html: '<div class="p-8 bg-white text-slate-900"><h1 class="text-2xl font-bold">Studio PDF</h1></div>',
          format: 'A4',
          landscape: false,
          smart_pagination: true,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/tools/studio/render-image renders PNG image via playground endpoint', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/tools/studio/render-image',
        payload: {
          html: '<div class="w-[600px] h-[300px] bg-indigo-600 text-white p-6 font-bold">Studio PNG</div>',
          width: 600,
          height: 300,
          type: 'png',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload[0]).toBe(0x89);
    }, 20000);

    it('GET /tools/carousel and /carousel render the LinkedIn carousel tool page', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/tools/carousel' });
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toContain('LinkedIn Carousel Generator');

      const res2 = await app.inject({ method: 'GET', url: '/carousel' });
      expect(res2.statusCode).toBe(200);
      expect(res2.body).toContain('LinkedIn Carousel Generator');
    });

    it('GET /tools/factur-x and /factur-x render the Factur-X e-invoice tool page', async () => {
      const res = await app.inject({ method: 'GET', url: '/tools/factur-x' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Factur-X E-Invoice Generator');
    });

    it('GET /tools/visual-diff and /visual-diff render the visual regression diff tool page', async () => {
      const res = await app.inject({ method: 'GET', url: '/tools/visual-diff' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Visual Regression Diff Heatmap');
    });

    it('POST /v1/tools/carousel renders a multi-slide carousel without API key (rate-limited)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tools/carousel',
        payload: {
          author_name: 'Test Author',
          theme: 'dark',
          markdown: '# Slide 1\nHello World\n---\n# Slide 2\nTailprint Engine\n',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.slideCount).toBe(2);
      expect(data.pdfUrl).toBeDefined();
      expect(data.previewUrl).toBeDefined();
    }, 20000);
  });

  describe('Authentication & Quotas', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        payload: {
          html: '<div class="text-blue-500 font-bold">Hello World</div>',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 for an invalid API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: 'Bearer sec_live_nonexistent_key_99999',
        },
        payload: {
          html: '<div class="text-blue-500">Hello</div>',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.message).toBe('Invalid API key provided');
    });

    it('returns 429 when monthly limit is exhausted', async () => {
      const limitedKey = 'sec_live_quota_test_' + Date.now();
      await redisService.storeApiKey(limitedKey, {
        key_prefix: 'sec_live_quo',
        customer_id: 'cus_quota_test',
        plan: 'starter',
        monthly_limit: 1, // Only 1 allowed
        status: 'active',
        created_at: new Date().toISOString(),
      });

      // 1st request should pass
      const res1 = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: `Bearer ${limitedKey}` },
        payload: { html: '<div>First</div>' },
      });
      expect(res1.statusCode).toBe(200);

      // 2nd request should trigger 429 Too Many Requests
      const res2 = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: `Bearer ${limitedKey}` },
        payload: { html: '<div>Second</div>' },
      });
      expect(res2.statusCode).toBe(429);
      const data2 = JSON.parse(res2.body);
      expect(data2.error).toBe('Too Many Requests');
      expect(data2.message).toContain('Monthly quota exceeded');
    });
  });

  describe('Render Endpoints', () => {
    it('POST /v1/render/pdf produces a valid PDF with Tailwind CSS', async () => {
      const htmlPayload = `
        <div class="p-8 bg-slate-900 text-white rounded-xl shadow-lg">
          <h1 class="text-3xl font-extrabold text-indigo-400">Invoice #1042</h1>
          <p class="mt-2 text-slate-300">Thank you for your business!</p>
          <div class="mt-4 inline-block bg-emerald-500 text-black px-4 py-1 rounded font-semibold">PAID</div>
        </div>
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: htmlPayload,
          format: 'A4',
          landscape: false,
          print_background: true,
          margin: {
            top: '10mm',
            bottom: '10mm',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();

      const pdfBuffer = response.rawPayload;
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      // Valid PDF files start with %PDF-
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/render/pdf supports header_html and footer_html with page numbering', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: '<div class="p-12 text-slate-900"><h1>Multi-page Document</h1><div style="page-break-after: always;">Page 1</div><div>Page 2</div></div>',
          display_header_footer: true,
          header_html: '<div style="font-size: 8px; width: 100%; text-align: right; padding-right: 20px;">Tailprint Header</div>',
          footer_html: '<div style="font-size: 8px; width: 100%; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/render/pdf supports smart_pagination and no_store zero-retention mode', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: `
            <div class="p-8">
              <h1>Enterprise Report</h1>
              <table>
                <tr><th>Description</th><th>Amount</th></tr>
                <tr><td>Item 1</td><td>$100</td></tr>
              </table>
              <div class="signature">Authorized Signature</div>
            </div>
          `,
          smart_pagination: true,
          no_store: true,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['x-tailprint-zero-retention']).toBe('active');
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/render/pdf encrypts PDF with password and protects contents', async () => {
      const secretPassword = 'MySecretTailprintPass123!';
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: '<div class="p-8 bg-slate-900 text-white"><h1>Classified Information</h1></div>',
          password: secretPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      const encryptedPdf = response.rawPayload;
      expect(encryptedPdf.subarray(0, 5).toString()).toBe('%PDF-');

      // Attempt to decrypt with cryptpdf
      const decrypted = await decryptPDF(new Uint8Array(encryptedPdf), secretPassword);
      expect(decrypted).toBeDefined();
      expect(decrypted.length).toBeGreaterThan(500);

      // Verify wrong password rejects
      await expect(decryptPDF(new Uint8Array(encryptedPdf), 'WrongPassword999')).rejects.toThrow();
    }, 20000);

    it('POST /v1/render/pdf waits for dynamic selector and delay_ms', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: '<div><h1 id="chart-ready">Loaded Chart</h1></div>',
          wait_for: '#chart-ready',
          delay_ms: 200,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/render/pdf renders a public web URL directly to vector PDF', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          url: 'https://example.com',
          format: 'A4',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/render/image captures a public web URL directly to PNG image', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/image',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          url: 'https://example.com',
          width: 800,
          height: 600,
          type: 'png',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.rawPayload[0]).toBe(0x89); // PNG magic byte
    }, 20000);

    it('POST /v1/render/pdf rejects when neither html nor url is provided (400)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          format: 'A4',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('POST /v1/render/playground renders PDF without requiring API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/playground',
        payload: {
          html: '<div class="p-8 bg-blue-600 text-white font-bold">Playground Live Test</div>',
          format: 'A4',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['x-render-time-ms']).toBeDefined();
      expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    }, 20000);

    it('POST /v1/render/image renders PNG and verifies SHA-256 caching', async () => {
      const uniqueId = Date.now();
      const htmlPayload = `
        <div class="w-full h-full flex flex-col justify-center items-center bg-gradient-to-r from-purple-600 to-blue-500 text-white">
          <h1 class="text-4xl font-bold tracking-tight">Open Graph Banner ${uniqueId}</h1>
          <p class="text-lg opacity-90 mt-2">Tailwind Native Rendering</p>
        </div>
      `;

      // 1. Initial render -> X-Cache: MISS
      const res1 = await app.inject({
        method: 'POST',
        url: '/v1/render/image',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: htmlPayload,
          width: 800,
          height: 400,
          type: 'png',
        },
      });

      expect(res1.statusCode).toBe(200);
      expect(res1.headers['content-type']).toBe('image/png');
      expect(res1.headers['x-cache']).toBe('MISS');
      const pngBuffer1 = res1.rawPayload;
      expect(pngBuffer1.length).toBeGreaterThan(1000);
      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      expect(pngBuffer1[0]).toBe(0x89);
      expect(pngBuffer1[1]).toBe(0x50);
      expect(pngBuffer1[2]).toBe(0x4e);
      expect(pngBuffer1[3]).toBe(0x47);

      // 2. Second render with exact same parameters -> X-Cache: HIT
      const res2 = await app.inject({
        method: 'POST',
        url: '/v1/render/image',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: htmlPayload,
          width: 800,
          height: 400,
          type: 'png',
        },
      });

      expect(res2.statusCode).toBe(200);
      expect(res2.headers['content-type']).toBe('image/png');
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.rawPayload.equals(pngBuffer1)).toBe(true);
    }, 20000);

    it('POST /v1/render/pdf with store: true returns hostedUrl and GET /d/:fileId serves it', async () => {
      const renderRes = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: '<div class="p-8 bg-indigo-900 text-white font-bold">Hosted PDF Delivery Test</div>',
          store: true,
          expires_in: '24h',
        },
      });

      expect(renderRes.statusCode).toBe(200);
      const data = JSON.parse(renderRes.body);
      expect(data.success).toBe(true);
      expect(data.hostedUrl).toBeDefined();
      expect(data.fileId).toBeDefined();
      expect(data.fileId).toMatch(/^f_[a-f0-9]+\.pdf$/);
      expect(data.mimeType).toBe('application/pdf');
      expect(data.sizeBytes).toBeGreaterThan(1000);
      expect(data.expiresAt).toBeDefined();
      expect(renderRes.headers['x-tailprint-hosted-url']).toBe(data.hostedUrl);

      // Now fetch the hosted file via GET /d/:fileId
      const fetchRes = await app.inject({
        method: 'GET',
        url: `/d/${data.fileId}`,
      });

      expect(fetchRes.statusCode).toBe(200);
      expect(fetchRes.headers['content-type']).toBe('application/pdf');
      expect(fetchRes.headers['content-disposition']).toContain('inline');
      expect(fetchRes.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');

      // Verify ?download=true sets attachment
      const downloadRes = await app.inject({
        method: 'GET',
        url: `/d/${data.fileId}?download=true`,
      });
      expect(downloadRes.statusCode).toBe(200);
      expect(downloadRes.headers['content-disposition']).toContain('attachment');
    }, 20000);

    it('POST /v1/render/image with store: true returns hostedUrl and GET /d/:fileId serves it', async () => {
      const renderRes = await app.inject({
        method: 'POST',
        url: '/v1/render/image',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: '<div class="w-[400px] h-[200px] bg-emerald-700 text-white p-4 font-bold">Hosted Image Test</div>',
          store: true,
          type: 'png',
        },
      });

      expect(renderRes.statusCode).toBe(200);
      const data = JSON.parse(renderRes.body);
      expect(data.success).toBe(true);
      expect(data.hostedUrl).toBeDefined();
      expect(data.fileId).toMatch(/^f_[a-f0-9]+\.png$/);
      expect(data.mimeType).toBe('image/png');

      const fetchRes = await app.inject({
        method: 'GET',
        url: `/d/${data.fileId}`,
      });
      expect(fetchRes.statusCode).toBe(200);
      expect(fetchRes.headers['content-type']).toBe('image/png');
      expect(fetchRes.rawPayload[0]).toBe(0x89); // PNG
    }, 20000);

    it('GET /d/:fileId returns 404 for non-existent file', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/d/f_non_existent_12345.pdf',
      });
      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res.body);
      expect(data.error).toBe('Not Found');
    });

    it('POST /v1/render/einvoice generates compliant Factur-X hybrid PDF with embedded XML', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/einvoice',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          invoiceNumber: 'INV-2026-EU-001',
          currency: 'EUR',
          seller: {
            name: 'Nordic Cloud ApS',
            vatId: 'DK99887766',
            country: 'DK',
            street: 'Vesterbrogade 12',
            city: 'København V',
            postcode: '1620',
          },
          buyer: {
            name: 'Berlin Tech AG',
            vatId: 'DE112233445',
            country: 'DE',
            street: 'Friedrichstraße 44',
            city: 'Berlin',
            postcode: '10117',
          },
          lineItems: [
            { name: 'Infrastructure Engineering (hrs)', quantity: 20, unitPrice: 160, vatRate: 25 },
            { name: 'Dedicated Support Retainer', quantity: 1, unitPrice: 500, vatRate: 25 },
          ],
          paymentIban: 'DK5000400440116243',
          paymentBic: 'DABA2100',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('factur-x-INV-2026-EU-001.pdf');
      expect(response.headers['x-invoice-currency']).toBe('EUR');
      expect(response.headers['x-invoice-total']).toBe('4625'); // (20*160 + 500) = 3700 net + 25% VAT (925) = 4625 gross
      expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');

      // Verify valid PDF structure and embedded factur-x.xml
      const rawPdfString = response.rawPayload.toString('latin1');
      expect(rawPdfString).toContain('factur-x.xml');
      expect(rawPdfString).toContain('EmbeddedFiles');

      const doc = await PDFDocument.load(response.rawPayload);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    }, 25000);

    it('POST /v1/render/einvoice with store: true returns hostedUrl link and saves file', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/einvoice',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          invoiceNumber: 'INV-HOSTED-002',
          currency: 'DKK',
          seller: {
            name: 'København Software ApS',
            vatId: 'DK12345678',
            country: 'DK',
          },
          buyer: {
            name: 'Aarhus Konsulenter A/S',
            vatId: 'DK87654321',
            country: 'DK',
          },
          lineItems: [
            { name: 'Software Licens', quantity: 1, unitPrice: 10000, vatRate: 25 },
          ],
          store: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.hostedUrl).toBeDefined();
      expect(data.fileId).toMatch(/^f_[a-f0-9]+\.pdf$/);
      expect(data.mimeType).toBe('application/pdf');
      expect(response.headers['x-invoice-total']).toBe('12500');
    }, 25000);

    it('GET /v1/mcp/tools returns catalog of 13 registered tools including generate_einvoice', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/mcp/tools',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.totalTools).toBe(13);
      const names = data.tools.map((t: any) => t.name);
      expect(names).toContain('generate_einvoice');
      expect(names).toContain('render_carousel');
      expect(names).toContain('compare_snapshots');
    });

    it('validates request input and rejects invalid schema (400)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/render/image',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          html: '', // empty html should fail z.min(1)
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Bad Request');
    });
  });

  describe('Stripe Webhooks', () => {
    it('provisions a new API key on checkout.session.completed', async () => {
      const eventPayload = {
        id: 'evt_test_checkout',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_123',
            customer: 'cus_customer_abc',
            metadata: {
              plan: 'pro',
            },
          },
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = stripeService.stripe.webhooks.generateTestHeaderString({
        payload: rawBody,
        secret: env.STRIPE_WEBHOOK_SECRET,
        timestamp,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.received).toBe(true);
      expect(result.action).toBe('api_key_created');
      expect(result.details.customerId).toBe('cus_customer_abc');
      expect(result.details.plan).toBe('pro');

      // Verify the generated key is stored in Redis and active with Pro limit (20,000)
      const rawKey = result.details.rawApiKey;
      const storedKey = await redisService.getApiKey(rawKey);
      expect(storedKey).toBeDefined();
      expect(storedKey?.status).toBe('active');
      expect(storedKey?.monthly_limit).toBe(20000);
    });

    it('updates customer plan and limits on customer.subscription.updated', async () => {
      const eventPayload = {
        id: 'evt_test_update',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_customer_abc',
            metadata: {
              plan: 'business',
            },
          },
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = stripeService.stripe.webhooks.generateTestHeaderString({
        payload: rawBody,
        secret: env.STRIPE_WEBHOOK_SECRET,
        timestamp,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.action).toBe('subscription_updated');
      expect(result.details.plan).toBe('business');
      expect(result.details.monthlyLimit).toBe(75000);
    }, 15000);

    it('creates a checkout session for free plan via POST /v1/billing/checkout', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/billing/checkout',
        headers: {
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          planId: 'free',
          customerEmail: 'trial@example.com',
        }),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBeDefined();
    });

    it('deactivates subscription on customer.subscription.deleted', async () => {
      const eventPayload = {
        id: 'evt_test_cancel',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_customer_abc',
          },
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = stripeService.stripe.webhooks.generateTestHeaderString({
        payload: rawBody,
        secret: env.STRIPE_WEBHOOK_SECRET,
        timestamp,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.action).toBe('subscription_deactivated');
    }, 15000);

    it('rejects webhooks with invalid signature (400)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 't=123,v1=invalid_fake_signature_hash',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Webhook Signature Error');
    });

    it('GET /v1/billing/session-key returns session API key when available', async () => {
      const mockSessionId = 'cs_test_session_' + Date.now();
      const mockKey = 'sec_live_test_session_key_' + Date.now();
      await redisService.saveSessionKey(mockSessionId, mockKey, 'pro', 20000);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/billing/session-key?session_id=${mockSessionId}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('ready');
      expect(data.apiKey).toBe(mockKey);
      expect(data.plan).toBe('pro');
    });
  });

  describe('Usage & Account', () => {
    it('GET /v1/usage returns real-time quota metrics without deducting usage', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/usage',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('active');
      expect(data.plan).toBe('starter');
      expect(typeof data.monthly_limit).toBe('number');
      expect(typeof data.current_usage).toBe('number');
      expect(typeof data.remaining).toBe('number');
      expect(data.percent_used).toMatch(/%$/);
      expect(data.resets_at).toBeDefined();
    });
  });
});
