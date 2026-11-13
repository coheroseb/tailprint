import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  MergePdfsRequestSchema,
  SplitPdfRequestSchema,
  FillPdfFormRequestSchema,
  CompressPdfRequestSchema,
  StampPdfRequestSchema,
  ValidateEInvoiceRequestSchema,
  EInvoiceValidationResponseSchema,
} from '../schemas/pdfOperations.js';
import { HostedFileResponseSchema, ErrorResponseSchema } from '../schemas/render.js';
import { pdfOperationsService } from '../services/pdfOperations.js';
import { pdfStamperService } from '../services/pdfStamper.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { storageService } from '../services/storage.js';
import { redisService } from '../services/redis.js';

export const pdfOperationsRoutes: FastifyPluginAsyncZod = async (fastify) => {
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

  // 1. POST /v1/pdf/merge - Merge multiple PDFs into one
  fastify.post(
    '/v1/pdf/merge',
    {
      schema: {
        tags: ['PDF Operations'],
        summary: 'Merge Multiple PDFs into a Unified Document',
        description: 'Combines two or more PDF documents (supplied as base64 data URIs or public HTTP/HTTPS URLs) into a single vector PDF in exact order.',
        security: [{ bearerAuth: [] }],
        body: MergePdfsRequestSchema,
        response: {
          200: z.union([z.any().describe('Binary PDF document'), HostedFileResponseSchema]),
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

      const { pdfs, output_filename, store, expires_in } = request.body;

      try {
        const buffers: Buffer[] = [];
        for (const input of pdfs) {
          const buf = await pdfOperationsService.resolvePdfBuffer(input);
          buffers.push(buf);
        }

        const mergedBuffer = await pdfOperationsService.mergePdfs({ pdfBuffers: buffers });
        const filename = output_filename || 'merged.pdf';

        if (store) {
          const stored = await storageService.saveFile(mergedBuffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename,
            expiresIn: expires_in,
          });

          return reply.code(200).send({
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
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', String(mergedBuffer.length))
          .send(mergedBuffer);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to merge PDF documents',
        });
      }
    }
  );

  // 2. POST /v1/pdf/split - Extract pages from a PDF
  fastify.post(
    '/v1/pdf/split',
    {
      schema: {
        tags: ['PDF Operations'],
        summary: 'Extract Pages or Page Ranges from a PDF',
        description: 'Extracts specific pages or ranges (e.g. "1-3, 5, 8-10") from a source PDF document into a new PDF.',
        security: [{ bearerAuth: [] }],
        body: SplitPdfRequestSchema,
        response: {
          200: z.union([z.any().describe('Binary PDF document'), HostedFileResponseSchema]),
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

      const { pdf, pages, output_filename, store, expires_in } = request.body;

      try {
        const inputBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
        const splitBuffer = await pdfOperationsService.splitPdf({ pdfBuffer: inputBuffer, pages });
        const filename = output_filename || 'split.pdf';

        if (store) {
          const stored = await storageService.saveFile(splitBuffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename,
            expiresIn: expires_in,
          });

          return reply.code(200).send({
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
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', String(splitBuffer.length))
          .send(splitBuffer);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to split PDF document',
        });
      }
    }
  );

  // 3. POST /v1/pdf/fill-form - Populate interactive AcroForm PDF
  fastify.post(
    '/v1/pdf/fill-form',
    {
      schema: {
        tags: ['PDF Operations'],
        summary: 'Populate and Flatten Interactive PDF Form Fields',
        description: 'Fills interactive AcroForm PDF fields (text fields, checkboxes, dropdowns, radio buttons) with key-value data, with optional flattening.',
        security: [{ bearerAuth: [] }],
        body: FillPdfFormRequestSchema,
        response: {
          200: z.union([z.any().describe('Binary PDF document'), HostedFileResponseSchema]),
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

      const { pdf, fields, flatten, output_filename, store, expires_in } = request.body;

      try {
        const inputBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
        const result = await pdfOperationsService.fillPdfForm({
          pdfBuffer: inputBuffer,
          fields,
          flatten: flatten ?? true,
        });

        const filename = output_filename || 'filled_form.pdf';

        if (store) {
          const stored = await storageService.saveFile(result.buffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename,
            expiresIn: expires_in,
          });

          return reply.code(200).send({
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
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', String(result.buffer.length))
          .header('X-Filled-Fields', result.filledFields.join(', '))
          .send(result.buffer);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to fill PDF form',
        });
      }
    }
  );

  // 4. POST /v1/pdf/compress - Shrink PDF file size
  fastify.post(
    '/v1/pdf/compress',
    {
      schema: {
        tags: ['PDF Operations'],
        summary: 'Compress and Compact PDF File Size',
        description: 'Optimizes and compacts PDF byte size by bundling internal objects into compressed streams and stripping duplicate structures.',
        security: [{ bearerAuth: [] }],
        body: CompressPdfRequestSchema,
        response: {
          200: z.union([z.any().describe('Binary PDF document'), HostedFileResponseSchema]),
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

      const { pdf, output_filename, store, expires_in } = request.body;

      try {
        const inputBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
        const compressedBuffer = await pdfOperationsService.compressPdf(inputBuffer);
        const filename = output_filename || 'compressed.pdf';

        const savingsPercent = inputBuffer.length > 0
          ? Math.max(0, Math.round(((inputBuffer.length - compressedBuffer.length) / inputBuffer.length) * 100))
          : 0;

        if (store) {
          const stored = await storageService.saveFile(compressedBuffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename,
            expiresIn: expires_in,
          });

          return reply.code(200).send({
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
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', String(compressedBuffer.length))
          .header('X-Original-Size', String(inputBuffer.length))
          .header('X-Compressed-Size', String(compressedBuffer.length))
          .header('X-Compression-Savings', `${savingsPercent}%`)
          .send(compressedBuffer);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to compress PDF document',
        });
      }
    }
  );

  // 5. POST /v1/pdf/stamp - Apply watermark or compliance stamp
  fastify.post(
    '/v1/pdf/stamp',
    {
      schema: {
        tags: ['PDF Operations'],
        summary: 'Apply Watermark or Compliance Stamp to a PDF',
        description: 'Applies a diagonal semi-transparent watermark or compliance status stamp (e.g. "CONFIDENTIAL", "DRAFT", "PROPRIETARY") across all pages of a PDF document.',
        security: [{ bearerAuth: [] }],
        body: StampPdfRequestSchema,
        response: {
          200: z.union([z.any().describe('Binary PDF document'), HostedFileResponseSchema]),
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

      const { pdf, watermark_text, opacity, color, font_size, output_filename, store, expires_in } = request.body;

      try {
        const inputBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
        const stampedBuffer = await pdfStamperService.applyWatermark({
          pdfBuffer: inputBuffer,
          text: watermark_text,
          opacity,
          color,
          fontSize: font_size,
        });

        const filename = output_filename || 'watermarked.pdf';

        if (store) {
          const stored = await storageService.saveFile(stampedBuffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename,
            expiresIn: expires_in,
          });

          return reply.code(200).send({
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
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', String(stampedBuffer.length))
          .send(stampedBuffer);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to stamp PDF document',
        });
      }
    }
  );

  // 6. POST /v1/pdf/validate-einvoice - Validate Factur-X / ZUGFeRD PDF or XML
  const validateEInvoiceHandler = async (request: any, reply: any) => {
    const auth = await authenticateAndCheckQuota(request, reply);
    if (!auth) return;

    const { pdf, xml } = request.body;

    try {
      let pdfBuffer: Buffer | undefined;
      if (pdf) {
        pdfBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
      }

      const report = await eInvoiceService.validatePdfOrXml({
        pdfBuffer,
        xmlString: xml,
      });

      return reply.code(200).send(report);
    } catch (err: any) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to validate electronic invoice',
      });
    }
  };

  fastify.post(
    '/v1/pdf/validate-einvoice',
    {
      schema: {
        tags: ['E-Invoicing'],
        summary: 'Validate EU Factur-X / ZUGFeRD E-Invoice PDF or XML',
        description: 'Inspects a PDF or CrossIndustryInvoice XML document to verify compliance with European standard EN 16931 / Factur-X / ZUGFeRD 2.2. Returns extracted invoice metadata, profile level, arithmetic checks, and any validation errors.',
        security: [{ bearerAuth: [] }],
        body: ValidateEInvoiceRequestSchema,
        response: {
          200: EInvoiceValidationResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    validateEInvoiceHandler
  );

  fastify.post(
    '/v1/render/einvoice/validate',
    {
      schema: {
        tags: ['E-Invoicing'],
        summary: 'Validate EU Factur-X / ZUGFeRD E-Invoice PDF or XML (Alias)',
        description: 'Alias endpoint for /v1/pdf/validate-einvoice.',
        security: [{ bearerAuth: [] }],
        body: ValidateEInvoiceRequestSchema,
        response: {
          200: EInvoiceValidationResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    validateEInvoiceHandler
  );
};
