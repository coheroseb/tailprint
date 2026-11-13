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
