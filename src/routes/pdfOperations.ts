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
  VerifyOrExtractPdfRequestSchema,
  SmartPdfVerificationResponseSchema,
  PdfProofLookupResponseSchema,
  AskPdfRequestSchema,
  GetCortexRequestSchema,
  NeuralAskResponseSchema,
  DocumentLifecycleRequestSchema,
  DocumentLifecycleResponseSchema,
} from '../schemas/pdfOperations.js';
import { HostedFileResponseSchema, ErrorResponseSchema } from '../schemas/render.js';
import { pdfOperationsService } from '../services/pdfOperations.js';
import { pdfStamperService } from '../services/pdfStamper.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { smartPdfService } from '../services/smartPdf.js';
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

  // 7. POST /v1/pdf/verify & POST /v1/pdf/extract - Dual-Brain Zero-OCR Extraction & Cryptographic Verification
  const verifyOrExtractHandler = async (request: any, reply: any) => {
    const { pdf } = request.body;

    try {
      const pdfBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
      const report = await smartPdfService.inspectAndVerifyPdf(pdfBuffer);
      return reply.code(200).send(report);
    } catch (err: any) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to inspect or verify PDF document',
      });
    }
  };

  fastify.post(
    '/v1/pdf/verify',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Verify Cryptographic Proof-of-Origin & Tamper-Evidence of a PDF',
        description:
          'Verifies the HMAC-SHA256 cryptographic signature, visual page content stream fingerprint, and server-side proof ledger of a Tailprint PDF. Immediately detects if any page text, element, page count, or embedded JSON was altered after issuance, and returns the embedded Dual-Brain JSON payload.',
        body: VerifyOrExtractPdfRequestSchema,
        response: {
          200: SmartPdfVerificationResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    verifyOrExtractHandler
  );

  fastify.post(
    '/v1/pdf/extract',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Extract Dual-Brain Structured JSON from a PDF in 0ms (Zero-OCR)',
        description:
          'Extracts the lossless, machine-readable structured JSON-LD payload (tailprint-manifest.json) embedded inside a Tailprint Dual-Brain PDF in 0ms without OCR or LLM vision token cost, along with its cryptographic integrity status.',
        body: VerifyOrExtractPdfRequestSchema,
        response: {
          200: SmartPdfVerificationResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    verifyOrExtractHandler
  );

  // 8. GET /v1/pdf/verify/:docId - Public Cryptographic Proof Ledger Lookup
  fastify.get(
    '/v1/pdf/verify/:docId',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Look Up Cryptographic Proof Record by Document ID',
        description:
          'Retrieves the public cryptographic proof-of-origin metadata (issuer, timestamp, SHA-256 fingerprint, template ID, and schema field keys) for a Tailprint document ID.',
        params: z.object({
          docId: z.string().min(1).describe('Tailprint Document ID (e.g. doc_...)'),
        }),
        response: {
          200: PdfProofLookupResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { docId } = request.params;
      const proof = await redisService.getPdfProof(docId);

      if (!proof) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `No cryptographic proof record found for document ID "${docId}".`,
        });
      }

      const isoState = await smartPdfService.evaluateIsotopeState(docId, null, false);

      return reply.code(200).send({
        found: true,
        doc_id: proof.doc_id,
        issued_at: proof.issued_at,
        issuer: proof.customer_id,
        template_id: proof.template_id,
        signed: proof.signed,
        ai_ready: proof.ai_ready && !isoState.expired,
        page_count: proof.page_count,
        file_sha256: proof.file_sha256,
        content_fingerprint: proof.content_fingerprint,
        data_hash: proof.data_hash,
        data_keys: proof.data_keys || [],
        signature: proof.signature,
        verification_url: proof.verification_url,
        isotope: isoState.isotope,
        expired: isoState.expired,
        revoked: isoState.revoked,
        expires_at: isoState.expires_at,
        remaining_seconds: isoState.remaining_seconds,
        reads_count: isoState.reads_count,
        max_reads: isoState.max_reads,
        expire_message: isoState.expire_message,
        hosted_file_id: proof.hosted_file_id || null,
      });
    }
  );

  // 9. POST /v1/pdf/ask - Query a Neural-Implant PDF's Spatial Cortex & Latent Memory
  fastify.post(
    '/v1/pdf/ask',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Ask a Question to a Neural-Implant PDF Cortex (Sub-Millisecond Neuro-Symbolic Engine)',
        description:
          'Executes a sub-millisecond neuro-symbolic query against a PDF implanted with a Tailprint Neural Cortex (tailprint-cortex.json). Searches both visual DOM synapses (returning exact page + x,y,w,h coordinates) and implanted subconscious latent memory (neural_context) using 64-D Int8 Hyperdimensional Vectors and Cross-Lingual Concept Anchors.',
        body: AskPdfRequestSchema,
        response: {
          200: NeuralAskResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { pdf, doc_id, question } = request.body;

      try {
        let pdfBuffer: Buffer | undefined;
        if (pdf) {
          pdfBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
        }

        const result = await smartPdfService.askPdf({
          pdfBuffer,
          docId: doc_id,
          question,
        });

        return reply.code(200).send(result);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to query PDF Neural Cortex',
        });
      }
    }
  );

  // 10. GET /v1/pdf/cortex/:docId - Retrieve the Compiled Neural Cortex of a Document
  fastify.get(
    '/v1/pdf/cortex/:docId',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Retrieve the Compiled Neural-Implant Cortex by Document ID',
        description:
          'Returns the complete Neuro-Symbolic Spatial Cortex (synapses, 64-D Int8 vectors, physical page bounding boxes, knowledge graph, and starter questions) for a Neural-Implant PDF.',
        params: z.object({
          docId: z.string().min(1).describe('Tailprint Document ID (e.g. doc_...)'),
        }),
        response: {
          200: z.any().describe('TailprintNeuralCortex object'),
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { docId } = request.params;
      const cortex = await redisService.getPdfCortex(docId);

      if (!cortex) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `No Neural Cortex found in ledger for document ID "${docId}".`,
        });
      }

      return reply.code(200).send(cortex);
    }
  );

  // 11. POST /v1/pdf/cortex - Extract or Retrieve the Compiled Neural Cortex from a PDF or doc_id
  fastify.post(
    '/v1/pdf/cortex',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Extract or Retrieve the Compiled Neural-Implant Cortex (from PDF Binary or doc_id)',
        description:
          'Extracts the complete Neuro-Symbolic Spatial Cortex (starter suggested_questions, persona, synapses with physical page bounding boxes, 64-D Int8 vectors, and knowledge graph) directly from a PDF binary (base64/URL) or by doc_id. Ideal for building white-label Q&A interfaces on your own domain.',
        body: GetCortexRequestSchema,
        response: {
          200: z.any().describe('TailprintNeuralCortex object'),
          400: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { pdf, doc_id } = request.body;

      try {
        let pdfBuffer: Buffer | undefined;
        if (pdf) {
          pdfBuffer = await pdfOperationsService.resolvePdfBuffer(pdf);
        }

        const cortex = await smartPdfService.getCortex({
          pdfBuffer,
          docId: doc_id,
        });

        return reply.code(200).send(cortex);
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to extract PDF Neural Cortex',
        });
      }
    }
  );

  // 12. POST /v1/pdf/expire & POST /v1/pdf/lifecycle - Real-Time Isotope PDF Lifecycle Control (Status, Expire Now / SCRAM, Extend TTL)
  const lifecycleHandler = async (request: any, reply: any) => {
    const { doc_id, file_id, action, extend_by, expires_at, expire_message, max_reads } =
      request.body;

    try {
      const report = await smartPdfService.manageDocumentLifecycle({
        docId: doc_id,
        fileId: file_id,
        action: action || 'status',
        extendBy: extend_by,
        expiresAt: expires_at,
        expireMessage: expire_message,
        maxReads: max_reads,
      });

      return reply.code(200).send(report);
    } catch (err: any) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: err.message || 'Failed to manage document lifecycle',
      });
    }
  };

  fastify.post(
    '/v1/pdf/expire',
    {
      schema: {
        tags: ['Dual-Brain & Cryptographic Proof'],
        summary: 'Manage Time-Limited Isotope PDF Lifecycle (SCRAM / Expire Now, Extend TTL, Status)',
        description:
          'Remotely controls the lifecycle of a Time-Limited Isotope PDF by doc_id or file_id. Trigger action: "expire_now" (SCRAM Kill Switch) to immediately expire a sent quote/contract and switch its hosted PDF to its decayed state, or action: "extend" (e.g. extend_by: "7d") to extend the deadline without re-rendering.',
        body: DocumentLifecycleRequestSchema,
        response: {
          200: DocumentLifecycleResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    lifecycleHandler
  );

  fastify.post(
    '/v1/pdf/lifecycle',
    {
      schema: {
        hide: true,
        body: DocumentLifecycleRequestSchema,
      },
    },
    lifecycleHandler
  );
};
