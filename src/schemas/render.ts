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
});

export type RenderPdfRequest = z.infer<typeof RenderPdfRequestSchema>;

export const RenderImageRequestSchema = z.object({
  html: z.string().min(1, 'html is required and cannot be empty').describe('HTML string with optional Tailwind CSS utility classes'),
  width: z.coerce.number().int().min(10).max(4000).default(1200).describe('Viewport and image width in pixels (e.g. 1200 for OG image)'),
  height: z.coerce.number().int().min(10).max(4000).default(630).describe('Viewport and image height in pixels (e.g. 630 for OG image)'),
  type: z.enum(['png', 'jpeg']).default('png').describe('Output image format'),
});

export type RenderImageRequest = z.infer<typeof RenderImageRequestSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.number().describe('HTTP status code'),
  error: z.string().describe('Error name / status title'),
  message: z.string().describe('Descriptive error message'),
  details: z.any().optional().describe('Optional validation or error details'),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
