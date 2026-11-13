import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import { HOSTED_TEMPLATES } from '../src/config/hostedTemplates.js';
import { resolveTemplateRequest, TemplateInputError } from '../src/services/templateEngine.js';

describe('Hosted templates (template_id + data)', () => {
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

  describe('template engine', () => {
    it('every template renders from its own example data', () => {
      expect(HOSTED_TEMPLATES.length).toBeGreaterThanOrEqual(4);
      for (const template of HOSTED_TEMPLATES) {
        const resolved = resolveTemplateRequest({ template_id: template.id, data: template.example as any });
        expect(resolved.html, template.id).toBeTruthy();
        expect(resolved.html!.length, template.id).toBeGreaterThan(200);
        expect(resolved.data).toBeUndefined();
      }
    });

    it('returns requests without template_id unchanged', () => {
      const input = { html: '<p>hi</p>' };
      expect(resolveTemplateRequest(input)).toBe(input);
    });

    it('computes invoice totals, tax per rate and discount server-side', () => {
      const { html } = resolveTemplateRequest({
        template_id: 'invoice-modern',
        data: {
          invoice_number: 'T-1',
          issue_date: '2026-01-31',
          currency: 'USD',
          locale: 'en-US',
          seller: { name: 'Seller' },
          buyer: { name: 'Buyer' },
          items: [
            { description: 'A', quantity: 2, unit_price: 100 },
            { description: 'B', quantity: 1, unit_price: 50, tax_rate: 0 },
          ],
          tax_rate: 25,
          discount: 50,
        },
      });
      // subtotal 250, discount 50, taxable base 200 * 80% factor => tax on 200 net lines: 200 * 0.8 * 25% = 40
      expect(html).toContain('$250.00');
      expect(html).toContain('-$50.00');
      expect(html).toContain('$40.00');
      expect(html).toContain('$240.00');
      expect(html).toContain('January 31, 2026');
    });

    it('escapes user data to prevent HTML injection', () => {
      const { html } = resolveTemplateRequest({
        template_id: 'certificate-classic',
        data: { recipient_name: '<script>alert(1)</script>', description: '"quoted" & <b>bold</b>' },
      });
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('supports translated labels on invoices', () => {
      const { html } = resolveTemplateRequest({
        template_id: 'invoice-modern',
        data: {
          invoice_number: 'F-1',
          issue_date: '2026-11-13',
          seller: { name: 'S' },
          buyer: { name: 'B' },
          items: [{ description: 'Ydelse', unit_price: 10 }],
          labels: { invoice: 'Faktura', total: 'I alt' },
        },
      });
      expect(html).toContain('Faktura');
      expect(html).toContain('I alt');
    });

    it('rejects unknown templates and lists the available ones', () => {
      expect(() => resolveTemplateRequest({ template_id: 'nope' })).toThrow(TemplateInputError);
      expect(() => resolveTemplateRequest({ template_id: 'nope' })).toThrow(/invoice-modern/);
    });

    it('rejects invalid data with field-level messages', () => {
      expect(() =>
        resolveTemplateRequest({
          template_id: 'invoice-modern',
          data: { invoice_number: 'X', issue_date: '2026-01-01', seller: {}, buyer: { name: 'B' }, items: [] },
        })
      ).toThrow(/seller\.name/);
    });

    it('rejects invalid accent colors that could break out of CSS', () => {
      expect(() =>
        resolveTemplateRequest({
          template_id: 'certificate-classic',
          data: { recipient_name: 'A', accent_color: 'red;background:url(//evil)' },
        })
      ).toThrow(/accent_color/);
    });
  });

  describe('catalog endpoints', () => {
    it('GET /v1/templates lists hosted templates without an API key', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/templates' });
      expect(res.statusCode).toBe(200);
      const ids = res.json().templates.map((t: any) => t.id);
      expect(ids).toEqual(expect.arrayContaining(['invoice-modern', 'receipt-minimal', 'certificate-classic', 'report-executive']));
    });

    it('GET /v1/templates/:id returns example data and a ready-to-send request', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/templates/invoice-modern' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.example_data.invoice_number).toBeTruthy();
      expect(body.example_request.template_id).toBe('invoice-modern');
    });

    it('GET /v1/templates/:id returns 404 for unknown templates', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/templates/unknown' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /v1/render/pdf with template_id', () => {
    it('renders a valid PDF from template_id + data', async () => {
      const template = HOSTED_TEMPLATES.find((t) => t.id === 'invoice-modern')!;
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: authHeader },
        payload: { template_id: 'invoice-modern', data: template.example },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['x-tailprint-template']).toBe('invoice-modern');
      expect(res.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('renders every template to a PDF', async () => {
      for (const template of HOSTED_TEMPLATES) {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/render/pdf',
          headers: { authorization: authHeader },
          payload: { template_id: template.id, data: template.example },
        });
        expect(res.statusCode, template.id).toBe(200);
        expect(res.rawPayload.subarray(0, 4).toString(), template.id).toBe('%PDF');
      }
    });

    it('returns 400 for unknown template_id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: authHeader },
        payload: { template_id: 'does-not-exist', data: {} },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('Unknown template_id');
    });

    it('returns 400 with field paths for invalid data', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: authHeader },
        payload: { template_id: 'invoice-modern', data: { invoice_number: 'X' } },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/issue_date|seller|buyer|items/);
    });

    it('returns 400 when template_id is combined with html', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: authHeader },
        payload: { template_id: 'invoice-modern', html: '<p>x</p>', data: {} },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when data is sent without template_id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: authHeader },
        payload: { html: '<p>x</p>', data: { a: 1 } },
      });
      expect(res.statusCode).toBe(400);
    });

    it('still accepts plain html requests', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: authHeader },
        payload: { html: '<h1 class="text-2xl">Plain</h1>' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-tailprint-template']).toBeUndefined();
    });
  });

  describe('POST /v1/render/batch with template items', () => {
    it('reports the failing item index for invalid template data', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/batch',
        headers: { authorization: authHeader },
        payload: {
          items: [
            { html: '<p>ok</p>' },
            { template_id: 'invoice-modern', data: { invoice_number: 'only-this' } },
          ],
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('items[1]');
    });

    it('accepts a batch mixing html and template items', async () => {
      const template = HOSTED_TEMPLATES.find((t) => t.id === 'receipt-minimal')!;
      const res = await app.inject({
        method: 'POST',
        url: '/v1/render/batch',
        headers: { authorization: authHeader },
        payload: {
          items: [
            { html: '<p>plain</p>' },
            { template_id: 'receipt-minimal', data: template.example, filename: 'receipt.pdf' },
          ],
        },
      });
      expect(res.statusCode).toBe(202);
      expect(res.json().job_id).toBeTruthy();
    });
  });
});
