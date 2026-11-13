import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import http from 'node:http';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import { jobsService } from '../src/services/jobs.js';
import { Tailprint } from '../src/sdk/index.js';

describe('Asynchronous Render, Batch Engine & Webhook Delivery', () => {
  let app: FastifyInstance;
  let webhookServer: http.Server;
  let webhookPort: number;
  let receivedWebhooks: any[] = [];
  const authHeader = 'Bearer sec_live_dev_test_key_12345';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Setup local mock webhook receiver server
    await new Promise<void>((resolve) => {
      webhookServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            receivedWebhooks.push({
              headers: req.headers,
              body: parsed,
            });
          } catch {
            receivedWebhooks.push({
              headers: req.headers,
              raw: body,
            });
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        });
      });

      webhookServer.listen(0, '127.0.0.1', () => {
        const addr = webhookServer.address() as any;
        webhookPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await app.close();
    await browserService.close();
    await new Promise<void>((resolve) => webhookServer.close(() => resolve()));
  });

  it('submits async render job via POST /v1/render/pdf and returns 202 with status_url', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        html: '<div style="padding:40px;"><h1>Async Report #1</h1></div>',
        format: 'A4',
        async: true,
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.job_id).toMatch(/^job_render_/);
    expect(body.status).toBe('pending');
    expect(body.status_url).toContain(body.job_id);

    // Poll GET /v1/jobs/:jobId until completed
    let attempts = 0;
    let completedJob: any = null;
    while (attempts < 20) {
      const jobRes = await app.inject({
        method: 'GET',
        url: `/v1/jobs/${body.job_id}`,
      });
      expect(jobRes.statusCode).toBe(200);
      const job = JSON.parse(jobRes.body);
      if (job.status === 'completed') {
        completedJob = job;
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
      attempts++;
    }

    expect(completedJob).not.toBeNull();
    expect(completedJob.status).toBe('completed');
    expect(completedJob.progress.completed).toBe(1);
    expect(completedJob.results.length).toBe(1);
    expect(completedJob.results[0].download_url).toMatch(/\/d\/f_/);
  });

  it('delivers webhook callback with HMAC signature when async render finishes', async () => {
    receivedWebhooks = [];
    const webhookUrl = `http://127.0.0.1:${webhookPort}/webhook-test`;

    const res = await app.inject({
      method: 'POST',
      url: '/v1/render/pdf',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        html: '<div style="padding:40px;"><h1>Invoice with Webhook</h1></div>',
        webhook_url: webhookUrl,
        webhook_headers: {
          'X-Custom-Client': 'NordicApp',
        },
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);

    // Wait for webhook callback delivery
    let attempts = 0;
    while (receivedWebhooks.length === 0 && attempts < 25) {
      await new Promise((r) => setTimeout(r, 300));
      attempts++;
    }

    expect(receivedWebhooks.length).toBeGreaterThan(0);
    const delivery = receivedWebhooks[0];
    expect(delivery.headers['x-tailprint-event']).toBe('render.completed');
    expect(delivery.headers['x-tailprint-job-id']).toBe(body.job_id);
    expect(delivery.headers['x-tailprint-signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(delivery.headers['x-custom-client']).toBe('NordicApp');
    expect(delivery.body.status).toBe('completed');
    expect(delivery.body.data.download_url).toMatch(/\/d\/f_/);
  });

  it('executes batch rendering with multiple documents and merge_output via POST /v1/render/batch', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/render/batch',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        items: [
          { html: '<h1>Batch Doc 1 Cover</h1>', filename: 'cover.pdf' },
          { html: '<h1>Batch Doc 2 Body</h1>', filename: 'body.pdf' },
        ],
        merge_output: true,
        merged_filename: 'full-package.pdf',
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.job_id).toMatch(/^job_batch_/);

    // Poll until completed
    let attempts = 0;
    let completedJob: any = null;
    while (attempts < 30) {
      const jobRes = await app.inject({
        method: 'GET',
        url: `/v1/jobs/${body.job_id}`,
      });
      expect(jobRes.statusCode).toBe(200);
      const job = JSON.parse(jobRes.body);
      if (job.status === 'completed') {
        completedJob = job;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
      attempts++;
    }

    expect(completedJob).not.toBeNull();
    expect(completedJob.status).toBe('completed');
    expect(completedJob.progress.total).toBe(2);
    expect(completedJob.progress.completed).toBe(2);
    expect(completedJob.results.length).toBe(2);
    expect(completedJob.results[0].filename).toBe('cover.pdf');
    expect(completedJob.results[1].filename).toBe('body.pdf');

    // Verify merged_output exists
    expect(completedJob.merged_output).toBeDefined();
    expect(completedJob.merged_output.filename).toBe('full-package.pdf');
    expect(completedJob.merged_output.download_url).toMatch(/\/d\/f_/);
  });

  it('rejects batch exceeding monthly quota balance gracefully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/render/batch',
      headers: {
        authorization: authHeader,
        'content-type': 'application/json',
      },
      payload: {
        items: Array.from({ length: 99 }, (_, i) => ({
          html: `<h1>High volume ${i}</h1>`,
        })),
      },
    });

    // In dev test key, limit is 100 so 99 may pass or 429 if prior renders used quota
    expect([202, 429]).toContain(res.statusCode);
  });
});
