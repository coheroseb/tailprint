import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import { redisService } from '../src/services/redis.js';
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

  describe('Idempotency-Key Header Support', () => {
    it('replays identical PDF response without deducting extra quota', async () => {
      const idempKey = `idem-pdf-${Date.now()}`;
      const payload = {
        html: '<div class="p-8 font-sans"><h1>Idempotent Invoice #101</h1></div>',
      };

      const first = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: authHeader,
          'idempotency-key': idempKey,
        },
        payload,
      });

      expect(first.statusCode).toBe(200);
      expect(first.headers['idempotency-key']).toBe(idempKey);
      expect(first.headers['x-tailprint-idempotent-replay']).toBe('false');
      const remainingAfterFirst = Number(first.headers['x-ratelimit-remaining']);

      const second = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: authHeader,
          'idempotency-key': idempKey,
        },
        payload,
      });

      expect(second.statusCode).toBe(200);
      expect(second.headers['idempotency-key']).toBe(idempKey);
      expect(second.headers['x-tailprint-idempotent-replay']).toBe('true');
      expect(Number(second.headers['x-ratelimit-remaining'])).toBe(remainingAfterFirst);
      expect(second.rawPayload.length).toBe(first.rawPayload.length);
      expect(second.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('returns 409 Conflict when reusing an Idempotency-Key with a different payload', async () => {
      const idempKey = `idem-conflict-${Date.now()}`;

      const first = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: authHeader,
          'idempotency-key': idempKey,
        },
        payload: { html: '<h1>Document A</h1>' },
      });
      expect(first.statusCode).toBe(200);

      const conflict = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: {
          authorization: authHeader,
          'idempotency-key': idempKey,
        },
        payload: { html: '<h1>Document B (Modified)</h1>' },
      });

      expect(conflict.statusCode).toBe(409);
      expect(conflict.json().message).toContain(idempKey);
    });

    it('replays identical batch job_id on retry with same Idempotency-Key', async () => {
      const idempKey = `idem-batch-${Date.now()}`;
      const payload = {
        items: [{ html: '<h1>Batch Item 1</h1>', filename: 'item1.pdf' }],
      };

      const first = await app.inject({
        method: 'POST',
        url: '/v1/render/batch',
        headers: {
          authorization: authHeader,
          'idempotency-key': idempKey,
        },
        payload,
      });
      expect(first.statusCode).toBe(202);

      const second = await app.inject({
        method: 'POST',
        url: '/v1/render/batch',
        headers: {
          authorization: authHeader,
          'idempotency-key': idempKey,
        },
        payload,
      });
      expect(second.statusCode).toBe(202);
      expect(second.headers['x-tailprint-idempotent-replay']).toBe('true');
      expect(second.json().job_id).toBe(first.json().job_id);
    });
  });

  describe('Custom Hosted Templates (Starter+ Plan Required)', () => {
    const freeKeyToken = 'sec_live_free_tier_custom_tpl_test';
    const starterKeyToken = 'sec_live_starter_tier_custom_tpl_test';

    beforeAll(async () => {
      await redisService.storeApiKey(freeKeyToken, {
        key_prefix: freeKeyToken.slice(0, 12),
        customer_id: 'cus_free_custom_tpl_test',
        plan: 'free',
        monthly_limit: 100,
        status: 'active',
        created_at: new Date().toISOString(),
      });

      await redisService.storeApiKey(starterKeyToken, {
        key_prefix: starterKeyToken.slice(0, 12),
        customer_id: 'cus_starter_custom_tpl_test',
        plan: 'starter',
        monthly_limit: 3000,
        status: 'active',
        created_at: new Date().toISOString(),
      });
    });

    it('rejects creating a custom template on the Free plan with 403 Forbidden', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/templates',
        headers: { authorization: `Bearer ${freeKeyToken}` },
        payload: {
          id: 'my-free-template',
          title: 'Free Attempt',
          html: '<h1>Hello {{name}}</h1>',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain('Starter plan or higher');
    });

    it('rejects overwriting a built-in template ID with 400 Bad Request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/templates',
        headers: { authorization: `Bearer ${starterKeyToken}` },
        payload: {
          id: 'invoice-modern',
          title: 'Overwrite Attempt',
          html: '<h1>Nope</h1>',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('reserved for a built-in template');
    });

    it('allows Starter+ customers to create, list, inspect, render, and delete custom Mustache templates', async () => {
      // 1. Create custom template
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/templates',
        headers: { authorization: `Bearer ${starterKeyToken}` },
        payload: {
          id: 'acme-custom-quote',
          title: 'Acme Sales Quote',
          category: 'Sales',
          description: 'Custom quote with line items',
          html: `<div class="p-10 font-sans">
            <h1 class="text-2xl font-bold">{{company_name}}</h1>
            <p class="text-slate-600">Quote for {{customer.name}}</p>
            <ul>{{#items}}<li>{{@number}}. {{name}} — {{price}}</li>{{/items}}</ul>
          </div>`,
          required_fields: ['company_name', 'customer.name'],
          default_data: { company_name: 'Acme Default ApS' },
          example_data: {
            company_name: 'Acme ApS',
            customer: { name: 'Nordic Bio' },
            items: [{ name: 'API License', price: '€49' }],
          },
        },
      });

      expect(createRes.statusCode).toBe(201);
      expect(createRes.json().template.id).toBe('acme-custom-quote');

      // 2. List templates (authenticated includes custom template)
      const listRes = await app.inject({
        method: 'GET',
        url: '/v1/templates',
        headers: { authorization: `Bearer ${starterKeyToken}` },
      });
      expect(listRes.statusCode).toBe(200);
      const customEntry = listRes.json().templates.find((t: any) => t.id === 'acme-custom-quote');
      expect(customEntry).toBeTruthy();
      expect(customEntry.custom).toBe(true);
      expect(customEntry.builtin).toBe(false);

      // 3. Get custom template details
      const getRes = await app.inject({
        method: 'GET',
        url: '/v1/templates/acme-custom-quote',
        headers: { authorization: `Bearer ${starterKeyToken}` },
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().html).toContain('{{company_name}}');

      // 4. Missing required field customer.name returns 400 without consuming quota
      const badRender = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: `Bearer ${starterKeyToken}` },
        payload: {
          template_id: 'acme-custom-quote',
          data: { company_name: 'Acme ApS' },
        },
      });
      expect(badRender.statusCode).toBe(400);
      expect(badRender.json().message).toContain('customer.name: Required');

      // 5. Free plan key attempting to render custom template gets 403 Forbidden
      const freeRenderAttempt = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: `Bearer ${freeKeyToken}` },
        payload: {
          template_id: 'acme-custom-quote',
          data: { company_name: 'Acme ApS', customer: { name: 'Nordic Bio' } },
        },
      });
      expect(freeRenderAttempt.statusCode).toBe(403);

      // 6. Valid Starter+ render produces a valid PDF
      const validRender = await app.inject({
        method: 'POST',
        url: '/v1/render/pdf',
        headers: { authorization: `Bearer ${starterKeyToken}` },
        payload: {
          template_id: 'acme-custom-quote',
          data: {
            customer: { name: 'Nordic Bio <script>alert(1)</script>' },
            items: [
              { name: 'Starter Subscription', price: '€19' },
              { name: 'Custom Templates Addon', price: 'Included' },
            ],
          },
        },
      });
      expect(validRender.statusCode).toBe(200);
      expect(validRender.headers['x-tailprint-template']).toBe('acme-custom-quote');
      expect(validRender.rawPayload.subarray(0, 4).toString()).toBe('%PDF');

      // 7. Delete custom template
      const delRes = await app.inject({
        method: 'DELETE',
        url: '/v1/templates/acme-custom-quote',
        headers: { authorization: `Bearer ${starterKeyToken}` },
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().deleted).toBe('acme-custom-quote');

      const afterDel = await app.inject({
        method: 'GET',
        url: '/v1/templates/acme-custom-quote',
        headers: { authorization: `Bearer ${starterKeyToken}` },
      });
      expect(afterDel.statusCode).toBe(404);
    });
  });
});
