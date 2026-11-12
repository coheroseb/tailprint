import { z } from 'zod';

export const PdfMarginSchema = z.object({
  top: z.string().optional().describe('Top margin with unit (e.g. 10mm, 0.5in, 20px)'),
  bottom: z.string().optional().describe('Bottom margin with unit (e.g. 10mm, 0.5in, 20px)'),
  left: z.string().optional().describe('Left margin with unit (e.g. 10mm, 0.5in, 20px)'),
  right: z.string().optional().describe('Right margin with unit (e.g. 10mm, 0.5in, 20px)'),
}).describe('Page margins');

export const RenderPdfRequestSchema = z
  .object({
    html: z.string().optional().describe('HTML string with optional Tailwind CSS utility classes. Either html or url is required.'),
    url: z.string().url().optional().describe('Direct web URL to render to PDF (e.g. https://example.com). Either html or url is required.'),
    format: z.enum(['A4', 'Letter', 'Legal']).default('A4').describe('Paper format'),
    landscape: z.boolean().default(false).describe('Whether to print in landscape orientation'),
    print_background: z.boolean().default(true).describe('Whether to print background graphics and colors'),
    margin: PdfMarginSchema.optional(),
    display_header_footer: z.boolean().optional().describe('Whether to display header and footer. Automatically enabled if header_html or footer_html is provided.'),
    header_html: z.string().optional().describe('HTML template for the print header. Must include font-size styling (e.g. font-size: 10px). Supports Chromium template classes: pageNumber, totalPages, date, title, url.'),
    footer_html: z.string().optional().describe('HTML template for the print footer. Must include font-size styling (e.g. font-size: 10px). Supports Chromium template classes: pageNumber, totalPages, date, title, url.'),
    password: z.string().min(1).max(128).optional().describe('Optional user password to encrypt the PDF with industry-standard AES-256 encryption.'),
    owner_password: z.string().min(1).max(128).optional().describe('Optional owner password for PDF permission controls.'),
    wait_for: z.string().max(256).optional().describe('CSS selector to wait for before rendering (e.g. "#chart-loaded", ".ready"). Maximum wait 5s.'),
    delay_ms: z.coerce.number().int().min(0).max(5000).optional().describe('Additional delay in milliseconds before capturing (e.g. 500 for animations/charts to settle). Maximum 5000ms.'),
    block_popups: z.boolean().default(false).optional().describe('Automatically suppress cookie consent banners, privacy dialogs, and popup overlays'),
    store: z.boolean().default(false).describe('If true, saves the rendered PDF to Tailprint hosted delivery and returns a public hostedUrl link.'),
    expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
  })
  .refine((data) => Boolean(data.html || data.url), {
    message: 'Either "html" or "url" must be provided',
    path: ['html'],
  });

export type RenderPdfRequest = z.input<typeof RenderPdfRequestSchema>;
export type RenderPdfOutput = z.infer<typeof RenderPdfRequestSchema>;

export const RenderImageRequestSchema = z
  .object({
    html: z.string().optional().describe('HTML string with optional Tailwind CSS utility classes. Either html or url is required.'),
    url: z.string().url().optional().describe('Direct web URL to capture as image (e.g. https://example.com). Either html or url is required.'),
    width: z.coerce.number().int().min(10).max(4000).default(1200).describe('Viewport and image width in pixels (e.g. 1200 for OG image)'),
    height: z.coerce.number().int().min(10).max(4000).default(630).describe('Viewport and image height in pixels (e.g. 630 for OG image)'),
    type: z.enum(['png', 'jpeg']).default('png').describe('Output image format'),
    wait_for: z.string().max(256).optional().describe('CSS selector to wait for before rendering (e.g. "#chart-loaded", ".ready"). Maximum wait 5s.'),
    delay_ms: z.coerce.number().int().min(0).max(5000).optional().describe('Additional delay in milliseconds before capturing (e.g. 500 for animations/charts to settle). Maximum 5000ms.'),
    block_popups: z.boolean().default(true).optional().describe('Automatically suppress cookie consent banners, privacy dialogs, and popup overlays'),
    store: z.boolean().default(false).describe('If true, saves the rendered image to Tailprint hosted delivery and returns a public hostedUrl link.'),
    expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration for the hosted link (1h, 24h, or 7d). Defaults to 24h.'),
  })
  .refine((data) => Boolean(data.html || data.url), {
    message: 'Either "html" or "url" must be provided',
    path: ['html'],
  });

export type RenderImageRequest = z.input<typeof RenderImageRequestSchema>;
export type RenderImageOutput = z.infer<typeof RenderImageRequestSchema>;

export const HostedFileResponseSchema = z.object({
  success: z.boolean(),
  hostedUrl: z.string().url().describe('Directly accessible public CDN/document link'),
  fileId: z.string().describe('Unique secure identifier of the stored file'),
  filename: z.string().describe('Original or assigned file name'),
  mimeType: z.string().describe('MIME type of the stored document'),
  sizeBytes: z.number().describe('File size in bytes'),
  expiresAt: z.string().describe('ISO timestamp of expiration'),
});

export type HostedFileResponse = z.infer<typeof HostedFileResponseSchema>;

export const EInvoicePartySchema = z.object({
  name: z.string().min(1).describe('Company or person legal name'),
  vatId: z.string().optional().describe('VAT ID / Tax identifier (e.g. DK12345678, DE987654321)'),
  country: z.string().length(2).default('DK').describe('ISO 3166-1 alpha-2 country code (e.g. DK, DE, FR)'),
  street: z.string().optional().describe('Street address and building number'),
  city: z.string().optional().describe('City name'),
  postcode: z.string().optional().describe('Postal code / ZIP code'),
  email: z.string().email().optional().describe('Contact email address'),
});

export const EInvoiceLineItemSchema = z.object({
  name: z.string().min(1).describe('Product or service description'),
  quantity: z.number().positive().describe('Quantity of items or hours'),
  unitPrice: z.number().nonnegative().describe('Unit price excluding VAT'),
  vatRate: z.number().nonnegative().default(25).describe('VAT / Tax rate in percent (e.g. 25 for 25% VAT, 0 for exempt)'),
});

export const RenderEInvoiceRequestSchema = z.object({
  invoiceNumber: z.string().min(1).describe('Unique invoice reference number (e.g. INV-2026-001)'),
  issueDate: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
  dueDate: z.string().optional().describe('Due payment date (YYYY-MM-DD)'),
  currency: z.string().length(3).default('EUR').describe('ISO 4217 3-letter currency code (e.g. EUR, DKK, USD, SEK)'),
  seller: EInvoicePartySchema.describe('Supplier / Seller billing details'),
  buyer: EInvoicePartySchema.describe('Customer / Buyer billing details'),
  lineItems: z.array(EInvoiceLineItemSchema).min(1).describe('Line items to bill'),
  paymentIban: z.string().optional().describe('Bank transfer IBAN number'),
  paymentBic: z.string().optional().describe('Bank BIC / SWIFT code'),
  notes: z.string().optional().describe('Optional payment terms or invoice notes'),
  profile: z.enum(['BASIC', 'EN16931']).default('BASIC').describe('Factur-X / ZUGFeRD profile compliance level'),
  store: z.boolean().default(false).describe('If true, returns hosted CDN URL in JSON response; if false, returns binary hybrid PDF'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').describe('Expiration duration if store is true'),
});

export type RenderEInvoiceRequest = z.input<typeof RenderEInvoiceRequestSchema>;
export type RenderEInvoiceOutput = z.infer<typeof RenderEInvoiceRequestSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.number().describe('HTTP status code'),
  error: z.string().describe('Error name / status title'),
  message: z.string().describe('Descriptive error message'),
  details: z.any().optional().describe('Optional validation or error details'),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
