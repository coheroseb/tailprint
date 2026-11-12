import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  ScrapeMarkdownRequestSchema,
  ScrapeMarkdownResponseSchema,
} from '../schemas/scrape.js';
import { ErrorResponseSchema } from '../schemas/render.js';
import { scraperService } from '../services/scraper.js';
import { redisService } from '../services/redis.js';
import { env } from '../config/env.js';

export const scrapeRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Helper to authenticate Bearer token and check monthly quota
  async function authenticateAndCheckQuota(request: any, reply: any) {
    const authHeader = request.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (env.NODE_ENV === 'development') {
      token = env.DEV_DEFAULT_API_KEY || 'sec_live_dev_test_key_12345';
    }

    if (!token) {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid Bearer authentication token. Example header: Authorization: Bearer sec_live_dev_test_key_12345',
      });
      return null;
    }

    const apiKey = await redisService.getApiKey(token);
    if (!apiKey) {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid API key provided',
      });
      return null;
    }

    if (apiKey.status !== 'active') {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'API key is inactive or subscription has expired',
      });
      return null;
    }

    const quota = await redisService.incrementAndCheckQuota(token, apiKey.monthly_limit);
    reply.header('X-RateLimit-Limit', String(quota.limit));
    reply.header('X-RateLimit-Remaining', String(quota.remaining));

    if (!quota.allowed) {
      reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Monthly quota exceeded (${quota.currentUsage}/${quota.limit} operations). Please upgrade your plan.`,
      });
      return null;
    }

    return { token, apiKey, quota };
  }

  // Canonical POST /v1/scrape/markdown
  fastify.post(
    '/v1/scrape/markdown',
    {
      schema: {
        tags: ['Scraping & AI'],
        summary: 'Scrape URL and Extract LLM-Ready Markdown',
        description:
          'Fetches any public URL using headless Chromium, evaluates dynamic client-side JS, strips noise/boilerplate via Mozilla Readability, and converts the clean article to structured GFM Markdown for LLMs and RAG.',
        security: [{ bearerAuth: [] }],
        body: ScrapeMarkdownRequestSchema,
        response: {
          200: ScrapeMarkdownResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
          504: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      const { url, strip_images } = request.body;
      const cacheHash = redisService.generateScrapeCacheHash({
        url,
        strip_images,
      });

      // 1. Check Redis Cache (24h TTL)
      const cached = await redisService.getCachedScrape(cacheHash);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.code(200).send({
          ...cached,
          cached: true,
        });
      }

      // 2. Perform live scrape & extraction
      const result = await scraperService.scrapeUrl(request.body);

      // 3. Store in cache
      await redisService.setCachedScrape(cacheHash, result, 86400);

      reply.header('X-Cache', 'MISS');
      return reply.code(200).send({
        ...result,
        cached: false,
      });
    }
  );

  // Alias POST /scrape/markdown (Hidden from OpenAPI docs)
  fastify.post(
    '/scrape/markdown',
    {
      schema: {
        hide: true,
        body: ScrapeMarkdownRequestSchema,
      },
    },
    async (request, reply) => {
      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      const { url, strip_images } = request.body;
      const cacheHash = redisService.generateScrapeCacheHash({
        url,
        strip_images,
      });

      const cached = await redisService.getCachedScrape(cacheHash);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.code(200).send({
          ...cached,
          cached: true,
        });
      }

      const result = await scraperService.scrapeUrl(request.body);
      await redisService.setCachedScrape(cacheHash, result, 86400);

      reply.header('X-Cache', 'MISS');
      return reply.code(200).send({
        ...result,
        cached: false,
      });
    }
  );

  // Public Interactive Scraper Playground for the Landing Page
  fastify.post(
    '/v1/scrape/playground',
    {
      schema: {
        hide: true,
        body: ScrapeMarkdownRequestSchema,
        response: {
          200: ScrapeMarkdownResponseSchema,
          400: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const isExempt = cookieHeader.includes('tailprint_ignore_me=1');
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp, 60, isExempt);

      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Playground rate limit exceeded (max 60 scrapes/hour). Claim 100 free monthly operations or upgrade.',
        });
      }

      const { url, strip_images } = request.body;
      const cacheHash = redisService.generateScrapeCacheHash({
        url,
        strip_images,
      });

      const cached = await redisService.getCachedScrape(cacheHash);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.code(200).send({
          ...cached,
          cached: true,
        });
      }

      try {
        const result = await scraperService.scrapeUrl(request.body);
        await redisService.setCachedScrape(cacheHash, result, 86400);

        reply.header('X-Cache', 'MISS');
        return reply.code(200).send({
          ...result,
          cached: false,
        });
      } catch (err: any) {
        return reply.code(500).send({
          statusCode: 500,
          error: 'Scrape Failed',
          message: err.message || 'Failed to extract content from URL',
        });
      }
    }
  );
};
