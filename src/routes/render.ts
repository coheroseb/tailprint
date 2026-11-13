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
import { smartPdfService, type SmartPdfEnrichResult } from '../services/smartPdf.js';
import {
  resolveTemplateRequest,
  resolveTemplateRequestForCustomer,
  TemplateInputError,
  TemplatePlanError,
} from '../services/templateEngine.js';
import { HOSTED_TEMPLATES, HOSTED_TEMPLATE_IDS, getHostedTemplate } from '../config/hostedTemplates.js';

export const renderRoutes: FastifyPluginAsyncZod = async (fastify) => {
  async function peekCustomerFromRequest(
    request: any
  ): Promise<{ customerId: string; plan: string; token: string } | null> {
    const authHeader = request?.headers?.authorization;
    let token: string | null = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (env.NODE_ENV === 'development') {
      token = env.DEV_DEFAULT_API_KEY || 'sec_live_dev_test_key_12345';
    }

    if (!token) return null;
    const apiKey = await redisService.getApiKey(token);
    if (!apiKey || apiKey.status !== 'active') return null;
    return { customerId: apiKey.customer_id, plan: apiKey.plan, token };
  }

  // Resolves `template_id` + `data` into HTML (supports built-in templates on all plans and
  // customer-owned custom templates on Starter+ plans). Runs before quota deduction so that
  // invalid template input or plan checks never consume a render.
  async function resolveTemplate<
    T extends { template_id?: string; html?: string; url?: string; data?: Record<string, unknown> }
  >(input: T, reply: any, prefix = '', request?: any): Promise<T | null> {
    try {
      if (!request) {
        return resolveTemplateRequest(input);
      }
      const customerCtx = input.template_id ? await peekCustomerFromRequest(request) : null;
      return await resolveTemplateRequestForCustomer(input, customerCtx);
    } catch (err) {
      if (err instanceof TemplateInputError) {
        reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `${prefix}${err.message}`,
        });
        return null;
      }
      if (err instanceof TemplatePlanError) {
        reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: `${prefix}${err.message}`,
        });
        return null;
      }
      throw err;
    }
  }

  // Helper to authenticate Bearer token, check Idempotency-Key replay, and check monthly quota
  async function authenticateAndCheckQuota(
    request: any,
    reply: any,
    units: number = 1,
    idempotencyPayload?: unknown
  ) {
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

    // Check optional Idempotency-Key header BEFORE deducting quota
    const rawIdempHeader = request.headers['idempotency-key'];
    const idempKey = typeof rawIdempHeader === 'string' ? rawIdempHeader.trim() : '';
    let idempotencyContext: { key: string; endpoint: string; requestHash: string } | undefined;

    if (idempKey) {
      if (idempKey.length > 255) {
        reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Idempotency-Key header must not exceed 255 characters.',
        });
        return null;
      }

      const endpoint = String(request.routerPath || request.url || '/v1/render/pdf').split('?')[0];
      const requestHash = redisService.hashIdempotencyPayload(idempotencyPayload ?? request.body);
      const existing = await redisService.getIdempotencyRecord(token, endpoint, idempKey);

      if (existing) {
        if (existing.requestHash !== requestHash) {
          reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: `Idempotency-Key '${idempKey}' has already been used with a different request payload.`,
          });
          return null;
        }

        for (const [hdrKey, hdrVal] of Object.entries(existing.headers || {})) {
          reply.header(hdrKey, hdrVal);
        }
        reply.header('Idempotency-Key', idempKey);
        reply.header('X-Tailprint-Idempotent-Replay', 'true');

        if (existing.isBinary) {
          const buf = Buffer.from(existing.body, 'base64');
          reply.header('Content-Type', existing.contentType || 'application/pdf');
          reply.header('Content-Length', String(buf.length));
          reply.code(existing.statusCode).send(buf);
        } else {
          reply.code(existing.statusCode).send(JSON.parse(existing.body));
        }
        return null;
      }

      idempotencyContext = { key: idempKey, endpoint, requestHash };
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

    return { token, apiKey, quota, idempotency: idempotencyContext };
  }

  async function enrichRenderedPdfIfRequested(
    rawPdfBuffer: Buffer,
    body: any,
    originalTemplateData: Record<string, unknown> | undefined,
    customerId: string,
    reply: any,
    extraHeaders: Record<string, string>
  ): Promise<{ pdfBuffer: Buffer; enriched: SmartPdfEnrichResult | null }> {
    if (body.password) {
      return { pdfBuffer: rawPdfBuffer, enriched: null };
    }

    const hasNeuralImplant =
      Boolean(body.neural_implant) ||
      Boolean(body.neural_context) ||
      Boolean(body.neural_persona);

    const shouldEnrich =
      hasNeuralImplant ||
      Boolean(body.sign) ||
      Boolean(body.verify_seal) ||
      Boolean(body.ai_ready) ||
      Boolean(body.embed_data) ||
      (Boolean(body.template_id) && body.ai_ready !== false);

    if (!shouldEnrich) {
      return { pdfBuffer: rawPdfBuffer, enriched: null };
    }

    let combinedData: Record<string, unknown> | null = null;
    if (originalTemplateData && body.embed_data) {
      combinedData = { ...originalTemplateData, ...body.embed_data };
    } else if (body.embed_data) {
      combinedData = body.embed_data;
    } else if (originalTemplateData) {
      combinedData = originalTemplateData;
    }

    const domSynapses = browserService.getExtractedDomSynapses(rawPdfBuffer);

    const enriched = await smartPdfService.enrichPdf(rawPdfBuffer, {
      customerId,
      templateId: body.template_id || null,
      data: combinedData,
      aiReady: body.ai_ready !== undefined ? body.ai_ready : true,
      sign: Boolean(body.sign || body.verify_seal || hasNeuralImplant),
      verifySeal: Boolean(body.verify_seal),
      neuralImplant: hasNeuralImplant,
      neuralPersona: body.neural_persona,
      neuralContext: body.neural_context,
      domSynapses,
      noStore: Boolean(body.no_store),
    });

    reply.header('X-Tailprint-Doc-Id', enriched.docId);
    reply.header('X-Tailprint-AI-Ready', String(enriched.manifest.ai_ready));
    reply.header('X-Tailprint-Verify-Url', enriched.manifest.verification_url);
    extraHeaders['X-Tailprint-Doc-Id'] = enriched.docId;
    extraHeaders['X-Tailprint-AI-Ready'] = String(enriched.manifest.ai_ready);
    extraHeaders['X-Tailprint-Verify-Url'] = enriched.manifest.verification_url;

    if (enriched.cortex) {
      reply.header('X-Tailprint-Neural-Implant', 'true');
      reply.header('X-Tailprint-Brain-Url', enriched.cortex.brain_url);
      reply.header('X-Tailprint-Cortex-Synapses', String(enriched.cortex.total_synapses));
      extraHeaders['X-Tailprint-Neural-Implant'] = 'true';
      extraHeaders['X-Tailprint-Brain-Url'] = enriched.cortex.brain_url;
      extraHeaders['X-Tailprint-Cortex-Synapses'] = String(enriched.cortex.total_synapses);
    }

    if (enriched.manifest.signed && enriched.manifest.signature) {
      const sigHeader = `sha256=${enriched.manifest.signature}`;
      reply.header('X-Tailprint-Signature', sigHeader);
      extraHeaders['X-Tailprint-Signature'] = sigHeader;
    }

    return { pdfBuffer: enriched.buffer, enriched };
  }

  async function saveIdempotencyIfPresent(
    auth: NonNullable<Awaited<ReturnType<typeof authenticateAndCheckQuota>>>,
    reply: any,
    opts: {
      statusCode: number;
      contentType: string;
      isBinary: boolean;
      body: Buffer | Record<string, unknown>;
      headers?: Record<string, string>;
      noStore?: boolean;
    }
  ): Promise<void> {
    if (!auth.idempotency || opts.noStore) return;

    reply.header('Idempotency-Key', auth.idempotency.key);
    reply.header('X-Tailprint-Idempotent-Replay', 'false');

    const serializedBody = opts.isBinary
      ? (opts.body as Buffer).toString('base64')
      : JSON.stringify(opts.body);

    await redisService.setIdempotencyRecord(
      auth.token,
      auth.idempotency.endpoint,
      auth.idempotency.key,
      {
        requestHash: auth.idempotency.requestHash,
        statusCode: opts.statusCode,
        contentType: opts.contentType,
        isBinary: opts.isBinary,
        body: serializedBody,
        headers: {
          'X-RateLimit-Limit': String(auth.quota.limit),
          'X-RateLimit-Remaining': String(auth.quota.remaining),
          ...(opts.headers || {}),
        },
        createdAt: new Date().toISOString(),
      }
    );
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
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
          504: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const originalTemplateData = request.body.data
        ? { ...(request.body.data as Record<string, unknown>) }
        : undefined;
      const resolvedBody = await resolveTemplate(request.body, reply, '', request);
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

      const templateHeaders: Record<string, string> = resolvedBody.template_id
        ? { 'X-Tailprint-Template': resolvedBody.template_id }
        : {};

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

        const asyncResponse = {
          success: true,
          job_id: job.job_id,
          status: 'pending' as const,
          message: 'Asynchronous render job queued successfully. Poll GET /v1/jobs/:jobId or listen for webhook delivery.',
          status_url: `${env.APP_URL}/v1/jobs/${job.job_id}`,
          webhook_url: request.body.webhook_url,
          created_at: job.created_at,
        };

        await saveIdempotencyIfPresent(auth, reply, {
          statusCode: 202,
          contentType: 'application/json',
          isBinary: false,
          body: asyncResponse,
          headers: templateHeaders,
          noStore: request.body.no_store,
        });

        return reply.code(202).send(asyncResponse);
      }

      if (request.body.no_store) {
        reply.header('X-Tailprint-Zero-Retention', 'active');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

      const rawPdfBuffer = await browserService.renderPdf(request.body);
      const { pdfBuffer, enriched } = await enrichRenderedPdfIfRequested(
        rawPdfBuffer,
        request.body,
        originalTemplateData,
        auth.apiKey.customer_id,
        reply,
        templateHeaders
      );

      if (request.body.store) {
        const stored = await storageService.saveFile(pdfBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'document.pdf',
          expiresIn: request.body.expires_in,
        });

        const storedBody = {
          success: true,
          hostedUrl: stored.hostedUrl,
          fileId: stored.fileId,
          filename: stored.filename,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          expiresAt: stored.expiresAt,
          ...(enriched
            ? {
                docId: enriched.docId,
                aiReady: enriched.manifest.ai_ready,
                signed: enriched.manifest.signed,
                signature: enriched.manifest.signature,
                verifyUrl: enriched.manifest.verification_url,
              }
            : {}),
        };

        await saveIdempotencyIfPresent(auth, reply, {
          statusCode: 200,
          contentType: 'application/json',
          isBinary: false,
          body: storedBody,
          headers: { ...templateHeaders, 'X-Tailprint-Hosted-Url': stored.hostedUrl },
        });

        return reply
          .code(200)
          .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
          .send(storedBody);
      }

      await saveIdempotencyIfPresent(auth, reply, {
        statusCode: 200,
        contentType: 'application/pdf',
        isBinary: true,
        body: pdfBuffer,
        headers: {
          ...templateHeaders,
          'Content-Disposition': 'inline; filename="rendered.pdf"',
        },
        noStore: request.body.no_store,
      });

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
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resolvedItems: typeof request.body.items = [];
      for (let index = 0; index < request.body.items.length; index++) {
        const resolvedItem = await resolveTemplate(request.body.items[index], reply, `items[${index}]: `, request);
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

      const batchResponse = {
        success: true,
        job_id: job.job_id,
        status: 'pending' as const,
        message: `Batch of ${itemsCount} documents queued. Poll GET /v1/jobs/${job.job_id} or listen for webhook delivery.`,
        status_url: `${env.APP_URL}/v1/jobs/${job.job_id}`,
        webhook_url: request.body.webhook_url,
        created_at: job.created_at,
      };

      await saveIdempotencyIfPresent(auth, reply, {
        statusCode: 202,
        contentType: 'application/json',
        isBinary: false,
        body: batchResponse,
      });

      return reply.code(202).send(batchResponse);
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
      const originalTemplateData = request.body.data
        ? { ...(request.body.data as Record<string, unknown>) }
        : undefined;
      const resolvedBody = await resolveTemplate(request.body, reply, '', request);
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

      const templateHeaders: Record<string, string> = resolvedBody.template_id
        ? { 'X-Tailprint-Template': resolvedBody.template_id }
        : {};
      const rawPdfBuffer = await browserService.renderPdf(request.body);
      const { pdfBuffer, enriched } = await enrichRenderedPdfIfRequested(
        rawPdfBuffer,
        request.body,
        originalTemplateData,
        auth.apiKey.customer_id,
        reply,
        templateHeaders
      );

      if (request.body.store) {
        const stored = await storageService.saveFile(pdfBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'document.pdf',
          expiresIn: request.body.expires_in,
        });

        const storedBody = {
          success: true,
          hostedUrl: stored.hostedUrl,
          fileId: stored.fileId,
          filename: stored.filename,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          expiresAt: stored.expiresAt,
          ...(enriched
            ? {
                docId: enriched.docId,
                aiReady: enriched.manifest.ai_ready,
                signed: enriched.manifest.signed,
                signature: enriched.manifest.signature,
                verifyUrl: enriched.manifest.verification_url,
              }
            : {}),
        };

        await saveIdempotencyIfPresent(auth, reply, {
          statusCode: 200,
          contentType: 'application/json',
          isBinary: false,
          body: storedBody,
          headers: { ...templateHeaders, 'X-Tailprint-Hosted-Url': stored.hostedUrl },
        });

        return reply
          .code(200)
          .header('X-Tailprint-Hosted-Url', stored.hostedUrl)
          .send(storedBody);
      }

      await saveIdempotencyIfPresent(auth, reply, {
        statusCode: 200,
        contentType: 'application/pdf',
        isBinary: true,
        body: pdfBuffer,
        headers: {
          ...templateHeaders,
          'Content-Disposition': 'inline; filename="rendered.pdf"',
        },
        noStore: request.body.no_store,
      });

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
          409: ErrorResponseSchema,
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
        const storedBody = {
          success: true,
          hostedUrl: result.pdfStored.hostedUrl,
          fileId: result.pdfStored.fileId,
          filename: result.pdfStored.filename,
          mimeType: result.pdfStored.mimeType,
          sizeBytes: result.pdfStored.sizeBytes,
          expiresAt: result.pdfStored.expiresAt,
        };

        await saveIdempotencyIfPresent(auth, reply, {
          statusCode: 200,
          contentType: 'application/json',
          isBinary: false,
          body: storedBody,
          headers: {
            'X-Tailprint-Hosted-Url': result.pdfStored.hostedUrl,
            'X-Invoice-Total': String(result.grossTotal),
          },
        });

        return reply
          .code(200)
          .header('X-Tailprint-Hosted-Url', result.pdfStored.hostedUrl)
          .header('X-Invoice-Total', String(result.grossTotal))
          .send(storedBody);
      }

      await saveIdempotencyIfPresent(auth, reply, {
        statusCode: 200,
        contentType: 'application/pdf',
        isBinary: true,
        body: result.pdfBuffer,
        headers: {
          'Content-Disposition': `inline; filename="factur-x-${result.invoiceNumber}.pdf"`,
          'X-Invoice-Total': String(result.grossTotal),
          'X-Invoice-Currency': result.currency,
          'X-Tailprint-Hosted-Url': result.pdfStored?.hostedUrl || '',
        },
      });

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
      const resolvedBody = await resolveTemplate(request.body, reply);
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
  // Hosted template catalog & Custom Templates (Starter+ Plans)
  // ==========================================
  const HostedTemplateSummarySchema = z.object({
    id: z.string().describe('Template identifier to pass as template_id'),
    title: z.string(),
    category: z.string(),
    description: z.string(),
    format: z.string().describe('Recommended paper format'),
    landscape: z.boolean().describe('Recommended orientation'),
    builtin: z.boolean().optional().describe('True for Tailprint built-in templates, false for custom user templates'),
    custom: z.boolean().optional().describe('True for customer-owned custom templates'),
    required_fields: z.array(z.string()).optional(),
  });

  const CustomTemplateBodySchema = z.object({
    id: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9-_]*[a-z0-9]$/i, 'Template ID must be an alphanumeric slug with hyphens or underscores')
      .describe('Unique slug for your custom template, e.g. "acme-invoice-v2"'),
    title: z.string().min(1).max(120).describe('Human-readable template title'),
    category: z.string().max(60).optional().default('Custom'),
    description: z.string().max(500).optional().default('Custom Mustache + Tailwind CSS PDF template'),
    html: z
      .string()
      .min(1)
      .max(500000)
      .describe('Tailwind CSS HTML template using {{variable}}, {{{raw_html}}}, and {{#items}}...{{/items}} syntax'),
    required_fields: z
      .array(z.string().min(1).max(120))
      .max(100)
      .optional()
      .default([])
      .describe('List of required data keys (supports dot notation, e.g. ["invoice_number", "buyer.name"])'),
    default_data: z.record(z.any()).optional().describe('Optional default data values merged before rendering'),
    example_data: z.record(z.any()).optional().describe('Optional sample data payload for preview/docs'),
    format: z.enum(['A4', 'Letter', 'Legal']).optional().default('A4'),
    landscape: z.boolean().optional().default(false),
    smart_pagination: z.boolean().optional().default(true),
  });

  const CustomTemplateUpdateBodySchema = CustomTemplateBodySchema.omit({ id: true });

  const summarizeTemplate = (t: (typeof HOSTED_TEMPLATES)[number]) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    description: t.description,
    format: t.format,
    landscape: t.landscape,
    builtin: true,
    custom: false,
  });

  async function requireStarterCustomer(request: any, reply: any) {
    const authHeader = request.headers.authorization;
    let token: string | null = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (env.NODE_ENV === 'development') {
      token = env.DEV_DEFAULT_API_KEY || 'sec_live_dev_test_key_12345';
    }

    if (!token) {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid Bearer authentication token.',
      });
      return null;
    }

    const apiKey = await redisService.getApiKey(token);
    if (!apiKey || apiKey.status !== 'active') {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or inactive API key.',
      });
      return null;
    }

    if (!redisService.isPaidPlan(apiKey.plan)) {
      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Custom hosted templates require a Starter plan or higher (current plan: ${apiKey.plan}). Please upgrade at https://tailprint.com/#pricing.`,
      });
      return null;
    }

    return { token, apiKey };
  }

  fastify.get(
    '/v1/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'List hosted document templates (built-in + custom)',
        description:
          'Returns the catalog of data-driven templates. Includes your custom templates when authenticated with a Bearer token.',
        response: {
          200: z.object({ templates: z.array(HostedTemplateSummarySchema) }),
        },
      },
    },
    async (request) => {
      const builtins = HOSTED_TEMPLATES.map(summarizeTemplate);
      const customerCtx = await peekCustomerFromRequest(request);
      if (!customerCtx) {
        return { templates: builtins };
      }
      const customList = await redisService.listCustomTemplates(customerCtx.customerId);
      const customSummaries = customList.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        format: c.format,
        landscape: c.landscape,
        builtin: false,
        custom: true,
        required_fields: c.required_fields,
      }));
      return { templates: [...builtins, ...customSummaries] };
    }
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
            html: z.string().optional(),
            default_data: z.record(z.any()).optional(),
            example_data: z.record(z.any()).describe('Valid sample data for this template'),
            example_request: z.record(z.any()).describe('Request body ready to POST to /v1/render/pdf'),
          }),
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const template = getHostedTemplate(request.params.templateId);
      if (template) {
        return {
          ...summarizeTemplate(template),
          example_data: template.example as Record<string, unknown>,
          example_request: { template_id: template.id, data: template.example as Record<string, unknown> },
        };
      }

      const customerCtx = await peekCustomerFromRequest(request);
      if (customerCtx) {
        const custom = await redisService.getCustomTemplate(customerCtx.customerId, request.params.templateId);
        if (custom) {
          const sampleData = custom.example_data || custom.default_data || {};
          return {
            id: custom.id,
            title: custom.title,
            category: custom.category,
            description: custom.description,
            format: custom.format,
            landscape: custom.landscape,
            builtin: false,
            custom: true,
            required_fields: custom.required_fields,
            html: custom.html,
            default_data: custom.default_data,
            example_data: sampleData,
            example_request: { template_id: custom.id, data: sampleData },
          };
        }
      }

      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Unknown template "${request.params.templateId}". Available built-in templates: ${HOSTED_TEMPLATES.map((t) => t.id).join(', ')}.`,
      });
    }
  );

  // POST /v1/templates - Create or update a custom hosted template (Requires Starter+ plan)
  fastify.post(
    '/v1/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Create a Custom Hosted Template (Starter+ Plan)',
        description:
          'Creates or updates a reusable Mustache + Tailwind CSS document template tied to your account. Render it anytime via POST /v1/render/pdf with { "template_id": "...", "data": { ... } }. Requires a Starter plan or higher.',
        security: [{ bearerAuth: [] }],
        body: CustomTemplateBodySchema,
        response: {
          201: z.any(),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const auth = await requireStarterCustomer(request, reply);
      if (!auth) return;

      const normalizedId = request.body.id.toLowerCase().trim();
      if ((HOSTED_TEMPLATE_IDS as readonly string[]).includes(normalizedId)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Template ID "${normalizedId}" is reserved for a built-in template. Please choose a different ID.`,
        });
      }

      const now = new Date().toISOString();
      const saved = await redisService.saveCustomTemplate({
        id: normalizedId,
        customer_id: auth.apiKey.customer_id,
        title: request.body.title,
        category: request.body.category || 'Custom',
        description: request.body.description || 'Custom Mustache + Tailwind CSS PDF template',
        html: request.body.html,
        required_fields: request.body.required_fields || [],
        default_data: request.body.default_data,
        example_data: request.body.example_data,
        format: request.body.format || 'A4',
        landscape: request.body.landscape ?? false,
        smart_pagination: request.body.smart_pagination ?? true,
        created_at: now,
        updated_at: now,
      });

      const sampleData = saved.example_data || saved.default_data || {};
      return reply.code(201).send({
        success: true,
        template: saved,
        example_request: {
          template_id: saved.id,
          data: sampleData,
        },
      });
    }
  );

  // PUT /v1/templates/:templateId - Update an existing custom template (Requires Starter+ plan)
  fastify.put(
    '/v1/templates/:templateId',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Update a Custom Hosted Template (Starter+ Plan)',
        security: [{ bearerAuth: [] }],
        params: z.object({ templateId: z.string().min(2).max(64) }),
        body: CustomTemplateUpdateBodySchema,
        response: {
          200: z.any(),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const auth = await requireStarterCustomer(request, reply);
      if (!auth) return;

      const normalizedId = request.params.templateId.toLowerCase().trim();
      if ((HOSTED_TEMPLATE_IDS as readonly string[]).includes(normalizedId)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Built-in template "${normalizedId}" cannot be modified.`,
        });
      }

      const now = new Date().toISOString();
      const saved = await redisService.saveCustomTemplate({
        id: normalizedId,
        customer_id: auth.apiKey.customer_id,
        title: request.body.title,
        category: request.body.category || 'Custom',
        description: request.body.description || 'Custom Mustache + Tailwind CSS PDF template',
        html: request.body.html,
        required_fields: request.body.required_fields || [],
        default_data: request.body.default_data,
        example_data: request.body.example_data,
        format: request.body.format || 'A4',
        landscape: request.body.landscape ?? false,
        smart_pagination: request.body.smart_pagination ?? true,
        created_at: now,
        updated_at: now,
      });

      return reply.code(200).send({
        success: true,
        template: saved,
      });
    }
  );

  // DELETE /v1/templates/:templateId - Delete a custom hosted template (Requires Starter+ plan)
  fastify.delete(
    '/v1/templates/:templateId',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Delete a Custom Hosted Template (Starter+ Plan)',
        security: [{ bearerAuth: [] }],
        params: z.object({ templateId: z.string().min(2).max(64) }),
        response: {
          200: z.object({ success: z.boolean(), deleted: z.string() }),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const auth = await requireStarterCustomer(request, reply);
      if (!auth) return;

      const normalizedId = request.params.templateId.toLowerCase().trim();
      if ((HOSTED_TEMPLATE_IDS as readonly string[]).includes(normalizedId)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Built-in template "${normalizedId}" cannot be deleted.`,
        });
      }

      const deleted = await redisService.deleteCustomTemplate(auth.apiKey.customer_id, normalizedId);
      if (!deleted) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Custom template "${normalizedId}" was not found on your account.`,
        });
      }

      return reply.code(200).send({
        success: true,
        deleted: normalizedId,
      });
    }
  );
};
