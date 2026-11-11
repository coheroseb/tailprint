import { z } from 'zod';

export const PdfMarginSchema = z.object({
  top: z.string().optional().describe('Top margin with unit (e.g. 10mm, 0.5in, 20px)'),
  bottom: z.string().optional().describe('Bottom margin with unit (e.g. 10mm, 0.5in, 20px)'),
  left: z.string().optional().describe('Left margin with unit (e.g. 10mm, 0.5in, 20px)'),
  right: z.string().optional().describe('Right margin with unit (e.g. 10mm, 0.5in, 20px)'),
}).describe('Page margins');

export const RenderPdfRequestSchema = z.object({
  html: z.string().min(1, 'html is required and cannot be empty').describe('HTML string with optional Tailwind CSS utility classes'),
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
});

export type RenderPdfRequest = z.infer<typeof RenderPdfRequestSchema>;

export const RenderImageRequestSchema = z.object({
  html: z.string().min(1, 'html is required and cannot be empty').describe('HTML string with optional Tailwind CSS utility classes'),
  width: z.coerce.number().int().min(10).max(4000).default(1200).describe('Viewport and image width in pixels (e.g. 1200 for OG image)'),
  height: z.coerce.number().int().min(10).max(4000).default(630).describe('Viewport and image height in pixels (e.g. 630 for OG image)'),
  type: z.enum(['png', 'jpeg']).default('png').describe('Output image format'),
  wait_for: z.string().max(256).optional().describe('CSS selector to wait for before rendering (e.g. "#chart-loaded", ".ready"). Maximum wait 5s.'),
  delay_ms: z.coerce.number().int().min(0).max(5000).optional().describe('Additional delay in milliseconds before capturing (e.g. 500 for animations/charts to settle). Maximum 5000ms.'),
});

export type RenderImageRequest = z.infer<typeof RenderImageRequestSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.number().describe('HTTP status code'),
  error: z.string().describe('Error name / status title'),
  message: z.string().describe('Descriptive error message'),
  details: z.any().optional().describe('Optional validation or error details'),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
