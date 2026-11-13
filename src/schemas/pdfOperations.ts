import { z } from 'zod';
import { HostedFileResponseSchema } from './render.js';

export const MergePdfsRequestSchema = z.object({
  pdfs: z
    .array(z.string().min(1))
    .min(2)
    .describe('Array of at least 2 PDF documents as base64 data URIs ("data:application/pdf;base64,...") or public HTTP/HTTPS URLs'),
  output_filename: z.string().optional().default('merged.pdf').describe('Filename for the resulting merged document (default: "merged.pdf")'),
  store: z.boolean().default(false).describe('If true, saves the merged PDF to Tailprint hosted delivery and returns a public hostedUrl link.'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
});

export type MergePdfsRequest = z.infer<typeof MergePdfsRequestSchema>;

export const SplitPdfRequestSchema = z.object({
  pdf: z.string().min(1).describe('Source PDF document as a base64 data URI or public HTTP/HTTPS URL'),
  pages: z.string().min(1).describe('Comma-separated page numbers or ranges to extract (e.g. "1-3, 5, 8-10")'),
  output_filename: z.string().optional().default('split.pdf').describe('Filename for the extracted PDF (default: "split.pdf")'),
  store: z.boolean().default(false).describe('If true, saves the extracted PDF to Tailprint hosted delivery and returns a public hostedUrl link.'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
});

export type SplitPdfRequest = z.infer<typeof SplitPdfRequestSchema>;

export const FillPdfFormRequestSchema = z.object({
  pdf: z.string().min(1).describe('Interactive AcroForm PDF document as a base64 data URI or public HTTP/HTTPS URL'),
  fields: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .describe('Key-value map of form field names to their values (e.g. {"client_name": "Acme Corp", "is_approved": true})'),
  flatten: z.boolean().default(true).describe('Whether to flatten form fields into non-editable vector graphics (default: true)'),
  output_filename: z.string().optional().default('filled_form.pdf').describe('Filename for the filled PDF (default: "filled_form.pdf")'),
  store: z.boolean().default(false).describe('If true, saves the filled PDF to Tailprint hosted delivery and returns a public hostedUrl link.'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
});

export type FillPdfFormRequest = z.infer<typeof FillPdfFormRequestSchema>;

export const CompressPdfRequestSchema = z.object({
  pdf: z.string().min(1).describe('Source PDF document as a base64 data URI or public HTTP/HTTPS URL'),
  output_filename: z.string().optional().default('compressed.pdf').describe('Filename for the compressed PDF (default: "compressed.pdf")'),
  store: z.boolean().default(false).describe('If true, saves the compressed PDF to Tailprint hosted delivery and returns a public hostedUrl link.'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
});

export type CompressPdfRequest = z.infer<typeof CompressPdfRequestSchema>;

export const StampPdfRequestSchema = z.object({
  pdf: z.string().min(1).describe('Source PDF document as a base64 data URI or public HTTP/HTTPS URL'),
  watermark_text: z.string().min(1).max(100).describe('Watermark text to stamp diagonally across all pages (e.g. "CONFIDENTIAL", "DRAFT", "PROPRIETARY")'),
  opacity: z.coerce.number().min(0.05).max(0.8).default(0.15).describe('Watermark opacity from 0.05 to 0.8 (default: 0.15)'),
  color: z.enum(['red', 'gray', 'blue']).default('red').describe('Stamp color: "red", "gray", or "blue" (default: "red")'),
  font_size: z.coerce.number().min(12).max(120).default(54).describe('Font size of watermark in points (default: 54)'),
  output_filename: z.string().optional().default('watermarked.pdf').describe('Filename for the stamped PDF (default: "watermarked.pdf")'),
  store: z.boolean().default(false).describe('If true, saves the stamped PDF to Tailprint hosted delivery and returns a public hostedUrl link.'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
});

export type StampPdfRequest = z.infer<typeof StampPdfRequestSchema>;

export const ValidateEInvoiceRequestSchema = z
  .object({
    pdf: z.string().optional().describe('PDF document with embedded Factur-X / ZUGFeRD XML as a base64 data URI or public HTTP/HTTPS URL'),
    xml: z.string().optional().describe('Direct Factur-X / ZUGFeRD CrossIndustryInvoice XML string to validate'),
  })
  .refine((data) => Boolean(data.pdf || data.xml), {
    message: 'Either "pdf" or "xml" must be provided',
    path: ['pdf'],
  });

export type ValidateEInvoiceRequest = z.infer<typeof ValidateEInvoiceRequestSchema>;

export const EInvoiceValidationResponseSchema = z.object({
  isValid: z.boolean().describe('Whether the invoice satisfies EU EN 16931 / Factur-X compliance rules'),
  hasEmbeddedXml: z.boolean().describe('Whether machine-readable electronic invoice XML was detected'),
  xmlFilename: z.string().nullable().describe('Embedded XML filename (e.g. "factur-x.xml" or "zugferd-invoice.xml")'),
  standard: z.string().describe('Identified standard (e.g. "Factur-X 1.0 / ZUGFeRD 2.2 (EN 16931)")'),
  profile: z.string().describe('Compliance profile (e.g. "EN16931", "BASIC", "MINIMUM", "EXTENDED")'),
  profileUrn: z.string().nullable().describe('Full URN specified in CrossIndustryInvoice'),
  invoiceDetails: z
    .object({
      invoiceNumber: z.string().nullable(),
      issueDate: z.string().nullable(),
      dueDate: z.string().nullable(),
      currency: z.string().nullable(),
      seller: z
        .object({
          name: z.string().nullable(),
          vatId: z.string().nullable(),
          country: z.string().nullable(),
          city: z.string().nullable(),
        })
        .nullable(),
      buyer: z
        .object({
          name: z.string().nullable(),
          vatId: z.string().nullable(),
          country: z.string().nullable(),
          city: z.string().nullable(),
        })
        .nullable(),
      totals: z
        .object({
          lineTotalAmount: z.number().nullable(),
          taxBasisTotalAmount: z.number().nullable(),
          taxTotalAmount: z.number().nullable(),
          grandTotalAmount: z.number().nullable(),
          duePayableAmount: z.number().nullable(),
        })
        .nullable(),
      lineItemsCount: z.number(),
      paymentIban: z.string().nullable(),
    })
    .nullable(),
  errors: z.array(z.string()).describe('Validation errors that cause compliance failures'),
  warnings: z.array(z.string()).describe('Non-critical warnings or recommendations'),
});

export type EInvoiceValidationResponse = z.infer<typeof EInvoiceValidationResponseSchema>;

export const VerifyOrExtractPdfRequestSchema = z.object({
  pdf: z
    .string()
    .min(1)
    .describe('PDF document as a base64 string, base64 data URI ("data:application/pdf;base64,..."), or public HTTP/HTTPS URL'),
});

export type VerifyOrExtractPdfRequest = z.infer<typeof VerifyOrExtractPdfRequestSchema>;

export const SmartPdfVerificationResponseSchema = z.object({
  valid: z.boolean().describe('True if the document is an authentic, untampered Tailprint Dual-Brain or signed PDF'),
  signed: z.boolean().describe('True if the document carries a cryptographic HMAC-SHA256 proof-of-origin signature'),
  tampered: z.boolean().describe('True if visual page streams, page count, or embedded JSON data were modified after issuance'),
  ai_ready: z.boolean().describe('True if lossless Dual-Brain structured JSON is embedded inside the PDF catalog'),
  neural_implant: z.boolean().optional().describe('True if a Neural-Implant Spatial Cortex (tailprint-cortex.json) is embedded inside the PDF'),
  isotope: z.boolean().optional().describe('True if the document is a Time-Limited Isotope PDF with a half-life expiration or Geiger read limit'),
  expired: z.boolean().optional().describe('True if the Time-Limited Isotope PDF has expired or reached its max_reads limit'),
  revoked: z.boolean().optional().describe('True if the document was manually revoked/expired (SCRAM) by the issuer'),
  expires_at: z.string().nullable().optional().describe('ISO-8601 expiration timestamp of the document'),
  remaining_seconds: z.number().nullable().optional().describe('Remaining validity seconds before automatic Isotope decay'),
  reads_count: z.number().nullable().optional().describe('Geiger Counter: number of times the document has been opened/verified/queried'),
  max_reads: z.number().nullable().optional().describe('Geiger Counter: maximum allowed reads before automatic expiration'),
  expire_message: z.string().nullable().optional().describe('Custom expiration notice set by the issuer'),
  doc_id: z.string().nullable().describe('Unique Tailprint document identifier (e.g. doc_...)'),
  issued_at: z.string().nullable().describe('ISO-8601 timestamp when the PDF was generated and signed'),
  issuer: z.string().nullable().describe('Issuer account or domain identifier'),
  template_id: z.string().nullable().describe('Hosted or custom template ID used to generate the PDF, if any'),
  page_count: z.number().describe('Number of pages in the PDF'),
  file_sha256: z.string().describe('SHA-256 hash of the complete PDF binary container'),
  content_fingerprint: z.string().describe('SHA-256 fingerprint of all visual PDF page content streams and dimensions'),
  signature_valid: z.boolean().describe('Whether the cryptographic HMAC-SHA256 signature matches the canonical manifest'),
  content_intact: z.boolean().describe('Whether the visual PDF page streams and embedded JSON match their signed hashes'),
  ledger_verified: z.boolean().describe('Whether the document hash matches the server-side Tailprint proof ledger'),
  verification_url: z.string().nullable().describe('Public verification URL for this document'),
  brain_url: z.string().nullable().optional().describe('Interactive Neural-Implant PDF Reader URL'),
  cortex_hash: z.string().nullable().optional().describe('SHA-256 hash of the compiled Neural Cortex'),
  cortex_summary: z
    .object({
      total_synapses: z.number(),
      visual_synapses_count: z.number(),
      latent_synapses_count: z.number(),
      data_synapses_count: z.number(),
      suggested_questions: z.array(z.string()),
    })
    .nullable()
    .optional(),
  data_hash: z.string().nullable().describe('SHA-256 hash of the canonical Dual-Brain JSON payload'),
  data: z.record(z.any()).nullable().describe('Zero-OCR extracted structured JSON payload from the Dual-Brain PDF'),
  reasons: z.array(z.string()).describe('Human-readable verification and integrity details'),
});

export type SmartPdfVerificationResponse = z.infer<typeof SmartPdfVerificationResponseSchema>;

export const AskPdfRequestSchema = z
  .object({
    pdf: z
      .string()
      .min(1)
      .optional()
      .describe('PDF document as a base64 string, base64 data URI, or public HTTP/HTTPS URL'),
    doc_id: z
      .string()
      .min(1)
      .optional()
      .describe('Tailprint Document ID (e.g. doc_...) to query its stored Neural Cortex directly'),
    question: z
      .string()
      .min(1)
      .max(1000)
      .describe('Natural language question to ask the PDF Neural Cortex (e.g. "What is the early payment discount and how is GDPR handled?")'),
  })
  .refine((d) => Boolean(d.pdf || d.doc_id), {
    message: 'Either "pdf" or "doc_id" must be provided',
    path: ['pdf'],
  });

export const NeuralAskResponseSchema = z.object({
  doc_id: z.string().nullable(),
  question: z.string(),
  answer: z.string(),
  persona: z.string(),
  confidence: z.number(),
  primary_source_layer: z.enum(['visual_dom', 'latent_memory', 'structured_data', 'none']),
  execution_time_ms: z.number(),
  cryptographically_verified: z.boolean(),
  cortex_hash: z.string().nullable(),
  brain_url: z.string().nullable(),
  citations: z.array(
    z.object({
      synapse_id: z.string(),
      layer: z.enum(['visual_dom', 'latent_memory', 'structured_data']),
      section: z.string(),
      content: z.string(),
      score: z.number(),
      bbox: z
        .object({
          page: z.number(),
          x_pct: z.number(),
          y_pct: z.number(),
          w_pct: z.number(),
          h_pct: z.number(),
          x_pt: z.number(),
          y_pt: z.number(),
          w_pt: z.number(),
          h_pt: z.number(),
        })
        .nullable(),
    })
  ),
  matched_facts: z.array(
    z.object({
      subject: z.string(),
      predicate: z.string(),
      object: z.string(),
      source_synapse_id: z.string(),
      layer: z.enum(['visual_dom', 'latent_memory', 'structured_data']),
    })
  ),
  suggested_followups: z.array(z.string()),
});

export const GetCortexRequestSchema = z
  .object({
    pdf: z
      .string()
      .min(1)
      .optional()
      .describe('PDF document as a base64 string, base64 data URI, or public HTTP/HTTPS URL'),
    doc_id: z
      .string()
      .min(1)
      .optional()
      .describe('Tailprint Document ID (e.g. doc_...) to retrieve its stored Neural Cortex directly'),
  })
  .refine((d) => Boolean(d.pdf || d.doc_id), {
    message: 'Either "pdf" or "doc_id" must be provided',
    path: ['pdf'],
  });

export const PdfProofLookupResponseSchema = z.object({
  found: z.boolean(),
  doc_id: z.string(),
  issued_at: z.string(),
  issuer: z.string(),
  template_id: z.string().nullable(),
  signed: z.boolean(),
  ai_ready: z.boolean(),
  page_count: z.number(),
  file_sha256: z.string(),
  content_fingerprint: z.string(),
  data_hash: z.string().nullable(),
  data_keys: z.array(z.string()),
  signature: z.string().nullable(),
  verification_url: z.string(),
  isotope: z.boolean().optional(),
  expired: z.boolean().optional(),
  revoked: z.boolean().optional(),
  expires_at: z.string().nullable().optional(),
  remaining_seconds: z.number().nullable().optional(),
  reads_count: z.number().nullable().optional(),
  max_reads: z.number().nullable().optional(),
  expire_message: z.string().nullable().optional(),
  hosted_file_id: z.string().nullable().optional(),
});

export const DocumentLifecycleRequestSchema = z
  .object({
    doc_id: z
      .string()
      .min(1)
      .optional()
      .describe('Tailprint Document ID (e.g. "doc_...") to inspect, expire, or extend'),
    file_id: z
      .string()
      .min(1)
      .optional()
      .describe('Hosted File ID (e.g. "f_...pdf") to inspect, expire, or extend'),
    action: z
      .enum(['status', 'expire_now', 'extend'])
      .default('status')
      .describe('Lifecycle action: "status" (inspect live countdown & reads), "expire_now" (SCRAM / immediate Kill Switch), or "extend" (extend or reactivate validity window)'),
    extend_by: z
      .string()
      .max(64)
      .optional()
      .describe('Duration to extend the document validity by when action is "extend" (e.g. "24h", "7d", "14d", "30d"). Defaults to "7d".'),
    expires_at: z
      .string()
      .max(128)
      .optional()
      .describe('Explicit new ISO-8601 expiration timestamp when action is "extend"'),
    expire_message: z
      .string()
      .max(500)
      .optional()
      .describe('Optional custom expiration notice displayed to recipients after expiration/revocation'),
    max_reads: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional()
      .describe('Optional updated Geiger Counter maximum read limit'),
  })
  .refine((d) => Boolean(d.doc_id || d.file_id), {
    message: 'Either "doc_id" or "file_id" must be provided',
    path: ['doc_id'],
  });

export type DocumentLifecycleRequest = z.infer<typeof DocumentLifecycleRequestSchema>;

export const DocumentLifecycleResponseSchema = z.object({
  success: z.boolean(),
  doc_id: z.string().nullable(),
  file_id: z.string().nullable(),
  hosted_url: z.string().nullable(),
  verify_url: z.string().nullable(),
  status: z.enum(['active', 'expired', 'revoked']),
  isotope: z.boolean(),
  expired: z.boolean(),
  revoked: z.boolean(),
  issued_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  remaining_seconds: z.number(),
  reads_count: z.number(),
  max_reads: z.number().nullable(),
  expire_message: z.string().nullable(),
  decayed_elements_count: z.number(),
  message: z.string(),
});

export type DocumentLifecycleResponse = z.infer<typeof DocumentLifecycleResponseSchema>;


