import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  RenderPdfRequestSchema,
  RenderImageRequestSchema,
  ErrorResponseSchema,
} from '../schemas/render.js';
import { browserService } from '../services/browser.js';
import { redisService } from '../services/redis.js';
import { storageService } from '../services/storage.js';

export const renderRoutes: FastifyPluginAsyncZod = async (fastify) => {
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
        message: `Monthly quota exceeded (${quota.currentUsage}/${quota.limit} renders). Please upgrade your plan.`,
      });
      return null;
    }

    return { token, apiKey, quota };
  }

  // Canonical POST /v1/render/pdf (Documented in OpenAPI / Scalar)
  fastify.post(
    '/v1/render/pdf',
    {
      schema: {
        tags: ['Rendering'],
        summary: 'Render HTML with Tailwind to PDF',
        description: 'Converts provided HTML containing Tailwind CSS classes into a high-fidelity PDF document.',
        security: [{ bearerAuth: [] }],
        body: RenderPdfRequestSchema,
        response: {
          200: z.any().describe('Binary PDF stream (application/pdf)'),
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

      const pdfBuffer = await browserService.renderPdf(request.body);

      if (request.body.store) {
        const stored = await storageService.saveFile(pdfBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'document.pdf',
          expiresIn: request.body.expires_in,
        });

        return reply
          .code(200)
          .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
          .send({
            success: true,
            hostedUrl: stored.hostedUrl,
            fileId: stored.fileId,
            filename: stored.filename,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            expiresAt: stored.expiresAt,
          });
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'inline; filename="rendered.pdf"')
        .header('Content-Length', String(pdfBuffer.length))
        .send(pdfBuffer);
    }
  );

  // Alias POST /render/pdf (Hidden from OpenAPI docs to prevent duplicates)
  fastify.post(
    '/render/pdf',
    {
      schema: {
        hide: true,
        body: RenderPdfRequestSchema,
      },
    },
    async (request, reply) => {
      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      const pdfBuffer = await browserService.renderPdf(request.body);

      if (request.body.store) {
        const stored = await storageService.saveFile(pdfBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'document.pdf',
          expiresIn: request.body.expires_in,
        });

        return reply
          .code(200)
          .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
          .send({
            success: true,
            hostedUrl: stored.hostedUrl,
            fileId: stored.fileId,
            filename: stored.filename,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            expiresAt: stored.expiresAt,
          });
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'inline; filename="rendered.pdf"')
        .header('Content-Length', String(pdfBuffer.length))
        .send(pdfBuffer);
    }
  );

  // Canonical POST /v1/render/image (Documented in OpenAPI / Scalar)
  fastify.post(
    '/v1/render/image',
    {
      schema: {
        tags: ['Rendering'],
        summary: 'Render HTML with Tailwind to Open Graph / Image',
        description: 'Generates an optimized PNG or JPEG image from HTML containing Tailwind CSS classes. Results are hashed and cached.',
        security: [{ bearerAuth: [] }],
        body: RenderImageRequestSchema,
        response: {
          200: z.any().describe('Binary image stream (image/png or image/jpeg)'),
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

      const { html, url, width, height, type, wait_for, delay_ms } = request.body;
      const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png';

      // 1. Generate SHA-256 cache key
      const cacheHash = redisService.generateImageCacheHash({
        html,
        url,
        width,
        height,
        type,
        wait_for,
        delay_ms,
      });

      // 2. Check cache
      const cached = await redisService.getCachedImage(cacheHash);
      if (cached) {
        if (request.body.store) {
          const stored = await storageService.saveFile(cached, {
            mimeType,
            extension: type || 'png',
            filename: `render.${type || 'png'}`,
            expiresIn: request.body.expires_in,
          });

          return reply
            .code(200)
            .header('X-Cache', 'HIT')
            .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
            .send({
              success: true,
              hostedUrl: stored.hostedUrl,
              fileId: stored.fileId,
              filename: stored.filename,
              mimeType: stored.mimeType,
              sizeBytes: stored.sizeBytes,
              expiresAt: stored.expiresAt,
            });
        }

        return reply
          .code(200)
          .header('Content-Type', mimeType)
          .header('X-Cache', 'HIT')
          .header('Content-Length', String(cached.length))
          .send(cached);
      }

      // 3. Render and cache image
      const imageBuffer = await browserService.renderImage(request.body);
      await redisService.setCachedImage(cacheHash, imageBuffer);

      if (request.body.store) {
        const stored = await storageService.saveFile(imageBuffer, {
          mimeType,
          extension: type || 'png',
          filename: `render.${type || 'png'}`,
          expiresIn: request.body.expires_in,
        });

        return reply
          .code(200)
          .header('X-Cache', 'MISS')
          .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
          .send({
            success: true,
            hostedUrl: stored.hostedUrl,
            fileId: stored.fileId,
            filename: stored.filename,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            expiresAt: stored.expiresAt,
          });
      }

      return reply
        .code(200)
        .header('Content-Type', mimeType)
        .header('X-Cache', 'MISS')
        .header('Content-Length', String(imageBuffer.length))
        .send(imageBuffer);
    }
  );

  // Alias POST /render/image (Hidden from OpenAPI docs to prevent duplicates)
  fastify.post(
    '/render/image',
    {
      schema: {
        hide: true,
        body: RenderImageRequestSchema,
      },
    },
    async (request, reply) => {
      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      const { html, url, width, height, type, wait_for, delay_ms } = request.body;
      const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png';

      const cacheHash = redisService.generateImageCacheHash({
        html,
        url,
        width,
        height,
        type,
        wait_for,
        delay_ms,
      });

      const cached = await redisService.getCachedImage(cacheHash);
      if (cached) {
        if (request.body.store) {
          const stored = await storageService.saveFile(cached, {
            mimeType,
            extension: type || 'png',
            filename: `render.${type || 'png'}`,
            expiresIn: request.body.expires_in,
          });

          return reply
            .code(200)
            .header('X-Cache', 'HIT')
            .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
            .send({
              success: true,
              hostedUrl: stored.hostedUrl,
              fileId: stored.fileId,
              filename: stored.filename,
              mimeType: stored.mimeType,
              sizeBytes: stored.sizeBytes,
              expiresAt: stored.expiresAt,
            });
        }

        return reply
          .code(200)
          .header('Content-Type', mimeType)
          .header('X-Cache', 'HIT')
          .header('Content-Length', String(cached.length))
          .send(cached);
      }

      const imageBuffer = await browserService.renderImage(request.body);
      await redisService.setCachedImage(cacheHash, imageBuffer);

      if (request.body.store) {
        const stored = await storageService.saveFile(imageBuffer, {
          mimeType,
          extension: type || 'png',
          filename: `render.${type || 'png'}`,
          expiresIn: request.body.expires_in,
        });

        return reply
          .code(200)
          .header('X-Cache', 'MISS')
          .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
          .send({
            success: true,
            hostedUrl: stored.hostedUrl,
            fileId: stored.fileId,
            filename: stored.filename,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            expiresAt: stored.expiresAt,
          });
      }

      return reply
        .code(200)
        .header('Content-Type', mimeType)
        .header('X-Cache', 'MISS')
        .header('Content-Length', String(imageBuffer.length))
        .send(imageBuffer);
    }
  );

  // Public Hosted Delivery Endpoint: GET /d/:fileId
  fastify.get(
    '/d/:fileId',
    {
      schema: {
        tags: ['Hosted Delivery'],
        summary: 'Access hosted PDF or image document',
        description: 'Serves an ephemeral or hosted document generated with store: true. Cached with immutable CDN headers.',
        params: z.object({
          fileId: z.string().describe('File ID returned from hosted render'),
        }),
        querystring: z.object({
          download: z.coerce.boolean().optional().describe('Force attachment download instead of inline browser display'),
        }),
      },
    },
    async (request, reply) => {
      const { fileId } = request.params as { fileId: string };
      const { download } = (request.query as { download?: boolean }) || {};

      const file = await storageService.getFile(fileId);
      if (!file) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'The requested hosted document does not exist or has expired.',
        });
      }

      const disposition = download ? 'attachment' : 'inline';

      return reply
        .code(200)
        .header('Content-Type', file.metadata.mimeType)
        .header('Content-Length', String(file.buffer.length))
        .header('Content-Disposition', `${disposition}; filename="${file.metadata.filename}"`)
        .header('Cache-Control', 'public, max-age=86400, immutable')
        .header('X-Tailprint-Expires-At', file.metadata.expiresAt)
        .send(file.buffer);
    }
  );

  // Public Interactive Playground Route for the Landing Page
  fastify.post(
    '/v1/render/playground',
    {
      schema: {
        hide: true,
        body: RenderPdfRequestSchema,
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);

      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Playground rate limit exceeded (max 25 renders/hour). Please upgrade to an official plan for unlimited renders.',
        });
      }

      const startTime = Date.now();
      const pdfBuffer = await browserService.renderPdf(request.body);
      const renderDuration = Date.now() - startTime;

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'inline; filename="playground-preview.pdf"')
        .header('X-Render-Time-Ms', String(renderDuration))
        .header('X-Playground-Remaining', String(rateLimit.remaining))
        .send(pdfBuffer);
    }
  );
};
