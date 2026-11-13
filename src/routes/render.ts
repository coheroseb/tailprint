import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  RenderPdfRequestSchema,
  RenderImageRequestSchema,
  RenderEInvoiceRequestSchema,
  type RenderEInvoiceOutput,
  HostedFileResponseSchema,
  ErrorResponseSchema,
  AsyncRenderAcceptedResponseSchema,
  RenderBatchRequestSchema,
  JobStatusResponseSchema,
} from '../schemas/render.js';
import { browserService } from '../services/browser.js';
import { redisService } from '../services/redis.js';
import { storageService } from '../services/storage.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { jobsService } from '../services/jobs.js';
import { resolveTemplateRequest, TemplateInputError } from '../services/templateEngine.js';
import { HOSTED_TEMPLATES, getHostedTemplate } from '../config/hostedTemplates.js';

export const renderRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Resolves `template_id` + `data` into HTML. Runs before authentication/quota so that
  // invalid template input is rejected with 400 without consuming a render.
  function resolveTemplate<T extends { template_id?: string; html?: string; url?: string; data?: Record<string, unknown> }>(
    input: T,
    reply: any,
    prefix = ''
  ): T | null {
    try {
      return resolveTemplateRequest(input);
    } catch (err) {
      if (err instanceof TemplateInputError) {
        reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `${prefix}${err.message}`,
        });
        return null;
      }
      throw err;
    }
  }

  // Helper to authenticate Bearer token and check monthly quota
  async function authenticateAndCheckQuota(request: any, reply: any, units: number = 1) {
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
        message: 'Missing or invalid Bearer authentication token. Example header: Authorization: Bearer YOUR_API_KEY',
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

    const quota = await redisService.incrementAndCheckQuota(token, apiKey.monthly_limit, units);
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
          202: AsyncRenderAcceptedResponseSchema.describe('Asynchronous render job accepted and processing in background'),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
          504: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resolvedBody = resolveTemplate(request.body, reply);
      if (!resolvedBody) return;
      request.body = resolvedBody;
      if (resolvedBody.template_id) reply.header('X-Tailprint-Template', resolvedBody.template_id);

      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      if (request.body.no_store && request.body.store) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: "Cannot specify 'store: true' when 'no_store: true' is requested.",
        });
      }

      // Asynchronous background rendering with optional webhook callback
      if (request.body.async || request.body.webhook_url) {
        const job = await jobsService.createJob({
          type: 'render_pdf',
          customerId: auth.apiKey.customer_id,
          apiKeyToken: auth.token,
          webhookUrl: request.body.webhook_url,
          webhookHeaders: request.body.webhook_headers,
          totalItems: 1,
        });

        // Fire-and-forget background processing
        jobsService.processRenderPdfJob(job.job_id, request.body, auth.token).catch((err) => {
          console.error(`[JobsService] Background render failed for ${job.job_id}:`, err);
        });

        return reply.code(202).send({
          success: true,
          job_id: job.job_id,
          status: 'pending',
          message: 'Asynchronous render job queued successfully. Poll GET /v1/jobs/:jobId or listen for webhook delivery.',
          status_url: `${env.APP_URL}/v1/jobs/${job.job_id}`,
          webhook_url: request.body.webhook_url,
          created_at: job.created_at,
        });
      }

      if (request.body.no_store) {
        reply.header('X-Tailprint-Zero-Retention', 'active');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

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

  // POST /v1/render/batch (Batch PDF Rendering)
  fastify.post(
    '/v1/render/batch',
    {
      schema: {
        tags: ['Rendering'],
        summary: 'Asynchronous Batch PDF Rendering',
        description:
          'Submits up to 100 documents for concurrent background rendering with optional multi-document merging and webhook callback notifications.',
        security: [{ bearerAuth: [] }],
        body: RenderBatchRequestSchema,
        response: {
          202: AsyncRenderAcceptedResponseSchema.describe('Batch job successfully accepted and processing'),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resolvedItems: typeof request.body.items = [];
      for (let index = 0; index < request.body.items.length; index++) {
        const resolvedItem = resolveTemplate(request.body.items[index], reply, `items[${index}]: `);
        if (!resolvedItem) return;
        resolvedItems.push(resolvedItem);
      }
      request.body.items = resolvedItems;

      const itemsCount = request.body.items.length;
      const auth = await authenticateAndCheckQuota(request, reply, itemsCount);
      if (!auth) return;

      const job = await jobsService.createJob({
        type: 'batch_pdf',
        customerId: auth.apiKey.customer_id,
        apiKeyToken: auth.token,
        webhookUrl: request.body.webhook_url,
        webhookHeaders: request.body.webhook_headers,
        totalItems: itemsCount,
      });

      // Fire-and-forget background processing
      jobsService.processBatchJob(job.job_id, request.body, auth.token).catch((err) => {
        console.error(`[JobsService] Background batch failed for ${job.job_id}:`, err);
      });

      return reply.code(202).send({
        success: true,
        job_id: job.job_id,
        status: 'pending',
        message: `Batch of ${itemsCount} documents queued. Poll GET /v1/jobs/${job.job_id} or listen for webhook delivery.`,
        status_url: `${env.APP_URL}/v1/jobs/${job.job_id}`,
        webhook_url: request.body.webhook_url,
        created_at: job.created_at,
      });
    }
  );

  // GET /v1/jobs/:jobId (Poll asynchronous job status and results)
  fastify.get(
    '/v1/jobs/:jobId',
    {
      schema: {
        tags: ['Rendering'],
        summary: 'Get Asynchronous Job Status & Results',
        description:
          'Retrieves the live processing state, completed document links, and webhook delivery status of a render or batch job.',
        params: z.object({
          jobId: z.string().describe('Unique job ID (e.g. job_render_... or job_batch_...)'),
        }),
        response: {
          200: JobStatusResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const job = await jobsService.getJob(request.params.jobId);
      if (!job) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Job with ID "${request.params.jobId}" was not found or has expired.`,
        });
      }

      return reply.code(200).send(job);
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
      const resolvedBody = resolveTemplate(request.body, reply);
      if (!resolvedBody) return;
      request.body = resolvedBody;
      if (resolvedBody.template_id) reply.header('X-Tailprint-Template', resolvedBody.template_id);

      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      if (request.body.no_store && request.body.store) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: "Cannot specify 'store: true' when 'no_store: true' is requested.",
        });
      }

      if (request.body.no_store) {
        reply.header('X-Tailprint-Zero-Retention', 'active');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

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

  // Canonical POST /v1/render/image (Hidden from public PDF OpenAPI docs)
  fastify.post(
    '/v1/render/image',
    {
      schema: {
        hide: true,
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

      if (request.body.no_store && request.body.store) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: "Cannot specify 'store: true' when 'no_store: true' is requested.",
        });
      }

      if (request.body.no_store) {
        reply.header('X-Tailprint-Zero-Retention', 'active');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

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

      // 2. Check cache (only if zero-retention is not requested)
      if (!request.body.no_store) {
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
      }

      // 3. Render and cache image
      const imageBuffer = await browserService.renderImage(request.body);
      if (!request.body.no_store) {
        await redisService.setCachedImage(cacheHash, imageBuffer);
      }

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

      if (request.body.no_store && request.body.store) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: "Cannot specify 'store: true' when 'no_store: true' is requested.",
        });
      }

      if (request.body.no_store) {
        reply.header('X-Tailprint-Zero-Retention', 'active');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

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

      if (!request.body.no_store) {
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
      }

      const imageBuffer = await browserService.renderImage(request.body);
      if (!request.body.no_store) {
        await redisService.setCachedImage(cacheHash, imageBuffer);
      }

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

  // POST /v1/render/einvoice - Factur-X / PEPPOL European E-Invoicing
  fastify.post(
    '/v1/render/einvoice',
    {
      schema: {
        tags: ['Rendering'],
        summary: 'Generate European Hybrid E-Invoice (Factur-X / ZUGFeRD / EN 16931)',
        description: 'Generates an EU-compliant hybrid electronic invoice conforming to EN 16931 / Factur-X / ZUGFeRD 2.2. Automatically creates CrossIndustryInvoice XML, attaches it directly to the PDF catalog, and produces a print-ready visual invoice. Saves with uncompressed object streams for maximum compatibility with ERP and legacy accounting systems.',
        body: RenderEInvoiceRequestSchema,
        response: {
          200: z.union([
            HostedFileResponseSchema,
            z.any().describe('Binary hybrid PDF stream (application/pdf)'),
          ]),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const auth = await authenticateAndCheckQuota(request, reply);
      if (!auth) return;

      const body = request.body as RenderEInvoiceOutput;
      const result = await eInvoiceService.generateHybridInvoice({
        invoiceNumber: body.invoiceNumber,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
        currency: body.currency,
        seller: body.seller,
        buyer: body.buyer,
        lineItems: body.lineItems,
        paymentIban: body.paymentIban,
        paymentBic: body.paymentBic,
        notes: body.notes,
        profile: body.profile,
        expiresIn: body.expires_in,
      });

      if (body.store && result.pdfStored) {
        return reply
          .code(200)
          .header('X-Tailprint-Hosted-Url', result.pdfStored.hostedUrl)
          .header('X-Invoice-Total', String(result.grossTotal))
          .send({
            success: true,
            hostedUrl: result.pdfStored.hostedUrl,
            fileId: result.pdfStored.fileId,
            filename: result.pdfStored.filename,
            mimeType: result.pdfStored.mimeType,
            sizeBytes: result.pdfStored.sizeBytes,
            expiresAt: result.pdfStored.expiresAt,
          });
      }

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="factur-x-${result.invoiceNumber}.pdf"`)
        .header('Content-Length', String(result.pdfBuffer.length))
        .header('X-Invoice-Total', String(result.grossTotal))
        .header('X-Invoice-Currency', result.currency)
        .header('X-Tailprint-Hosted-Url', result.pdfStored?.hostedUrl || '')
        .send(result.pdfBuffer);
    }
  );

  // Public Hosted Delivery Endpoint: GET /d/:fileId
  fastify.get(
    '/d/:fileId',
    {
      schema: {
        tags: ['Hosted Delivery'],
        summary: 'Access hosted PDF document',
        description: 'Serves an ephemeral or hosted PDF document generated with store: true. Cached with immutable CDN headers.',
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
      const resolvedBody = resolveTemplate(request.body, reply);
      if (!resolvedBody) return;
      request.body = resolvedBody;

      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const isExempt = cookieHeader.includes('tailprint_ignore_me=1');
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp, 60, isExempt);

      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Playground rate limit exceeded (max 60 renders/hour). Claim 100 free monthly renders or upgrade for unlimited.',
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

  // ==========================================
  // Hosted template catalog (public, no API key)
  // ==========================================
  const HostedTemplateSummarySchema = z.object({
    id: z.string().describe('Template identifier to pass as template_id'),
    title: z.string(),
    category: z.string(),
    description: z.string(),
    format: z.string().describe('Recommended paper format'),
    landscape: z.boolean().describe('Recommended orientation'),
  });

  const summarizeTemplate = (t: (typeof HOSTED_TEMPLATES)[number]) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    description: t.description,
    format: t.format,
    landscape: t.landscape,
  });

  fastify.get(
    '/v1/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'List hosted document templates',
        description:
          'Returns the catalog of data-driven templates. Render one with POST /v1/render/pdf using { "template_id": "...", "data": { ... } }.',
        response: {
          200: z.object({ templates: z.array(HostedTemplateSummarySchema) }),
        },
      },
    },
    async () => ({ templates: HOSTED_TEMPLATES.map(summarizeTemplate) })
  );

  fastify.get(
    '/v1/templates/:templateId',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Get a hosted template with example data',
        description:
          'Returns template metadata plus complete example data and a ready-to-send request body for POST /v1/render/pdf.',
        params: z.object({ templateId: z.string().max(100) }),
        response: {
          200: HostedTemplateSummarySchema.extend({
            example_data: z.record(z.any()).describe('Valid sample data for this template'),
            example_request: z.record(z.any()).describe('Request body ready to POST to /v1/render/pdf'),
          }),
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const template = getHostedTemplate(request.params.templateId);
      if (!template) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Unknown template "${request.params.templateId}". Available templates: ${HOSTED_TEMPLATES.map((t) => t.id).join(', ')}.`,
        });
      }
      return {
        ...summarizeTemplate(template),
        example_data: template.example as Record<string, unknown>,
        example_request: { template_id: template.id, data: template.example as Record<string, unknown> },
      };
    }
  );
};
