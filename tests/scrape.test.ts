import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';
import { env } from '../src/config/env.js';
import { scraperService } from '../src/services/scraper.js';
import { redisService } from '../src/services/redis.js';

describe('LLM-Ready Web Scraper & Markdown API Suite', () => {
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

  describe('DOM Stripping & Markdown Conversion Engine', () => {
    it('converts noisy HTML into clean, token-efficient Markdown with token savings', () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Startup Raises $15M for Autonomous Agents</title>
          <meta name="description" content="A new venture round led by Nordic investors to build European sovereign AI infrastructure." />
          <meta property="article:published_time" content="2026-10-12T14:30:00Z" />
        </head>
        <body>
          <nav><a href="/">Home</a><a href="/pricing">Pricing</a><button>Login</button></nav>
          <aside><div class="cookie-banner">Please accept cookies to track your behavior</div></aside>
          
          <main>
            <article>
              <h1>AI Startup Raises $15M for Autonomous Agents</h1>
              <p class="byline">By Morten Jensen • Published Oct 12, 2026</p>
              
              <p>The company announced today a fresh financing round of $15M to expand its core microservice pipeline across Europe.</p>
              
              <h2>Key Strategic Priorities</h2>
              <ul>
                <li>Automated agent-routing layer</li>
                <li>Edge caching with Upstash Redis</li>
                <li>Zero-cold-start headless rendering</li>
              </ul>

              <img src="https://example.com/huge-chart.png" alt="Funding Growth Chart" />

              <table>
                <thead>
                  <tr><th>Milestone</th><th>Target Quarter</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr><td>Alpha Launch</td><td>Q1 2026</td><td>Completed</td></tr>
                  <tr><td>Public Scale</td><td>Q3 2026</td><td>In Progress</td></tr>
                </tbody>
              </table>
            </article>
          </main>

          <footer>
            <p>© 2026 Noisy Corporation. All tracking cookies reserved.</p>
          </footer>
        </body>
        </html>
      `;

      const result = scraperService.cleanHtmlToMarkdown({
        url: 'https://techcrunch.com/2026/10/12/startup-funding',
        rawHtml: sampleHtml,
        stripImages: true,
      });

      expect(result.title).toContain('AI Startup Raises $15M');
      expect(result.published_at).toBe('2026-10-12T14:30:00Z');
      expect(result.markdown).toContain('# AI Startup Raises $15M for Autonomous Agents');
      expect(result.markdown).toContain('Automated agent-routing layer');
      expect(result.markdown).toContain('| Milestone | Target Quarter | Status |');
      // Verify images are stripped when stripImages is true
      expect(result.markdown).not.toContain('<img');
      expect(result.markdown).not.toContain('https://example.com/huge-chart.png');

      // Verify token metrics
      expect(result.word_count).toBeGreaterThan(30);
      expect(result.estimated_tokens).toBeGreaterThan(30);
      expect(result.raw_content_bytes).toBeGreaterThan(result.markdown_bytes);
      expect(parseFloat(result.token_savings_percent)).toBeGreaterThan(50);
    });
  });

  describe('POST /v1/scrape/markdown API Endpoint', () => {
    it('rejects invalid or missing URL with 400 Bad Request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/scrape/markdown',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          url: 'not-a-valid-url',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Bad Request');
    });

    it('requires Bearer token authentication (401)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/scrape/markdown',
        payload: {
          url: 'https://example.com',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Unauthorized');
    });

    it('scrapes public page and returns structured markdown + token savings', async () => {
      const testUrl = `https://example.com/?t=${Date.now()}`;
      const response = await app.inject({
        method: 'POST',
        url: '/v1/scrape/markdown',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          url: testUrl,
          strip_images: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.url).toContain('example.com');
      expect(data.title).toBeDefined();
      expect(data.markdown).toBeDefined();
      expect(data.markdown.length).toBeGreaterThan(10);
      expect(data.word_count).toBeGreaterThan(5);
      expect(data.token_savings_percent).toBeDefined();
      expect(response.headers['x-cache']).toBe('MISS');

      // Second identical request should return HIT from Redis cache
      const resCached = await app.inject({
        method: 'POST',
        url: '/v1/scrape/markdown',
        headers: {
          authorization: `Bearer ${validDevKey}`,
        },
        payload: {
          url: testUrl,
          strip_images: true,
        },
      });

      expect(resCached.statusCode).toBe(200);
      expect(resCached.headers['x-cache']).toBe('HIT');
      const dataCached = JSON.parse(resCached.body);
      expect(dataCached.cached).toBe(true);
      expect(dataCached.markdown).toBe(data.markdown);
    }, 20000);
  });
});
