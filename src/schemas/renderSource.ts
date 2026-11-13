import { z } from 'zod';

export const TemplateIdField = z
  .string()
  .max(100)
  .optional()
  .describe('Hosted template to render, e.g. "invoice-modern". Combine with "data". See GET /v1/templates for the catalog.');

export const TemplateDataField = z
  .record(z.any())
  .optional()
  .describe('JSON data for the hosted template. Validated against the template schema; see GET /v1/templates/{id} for example data.');

/**
 * Shared input-mode check for PDF render requests (single and batch items):
 * exactly one of html, url or template_id, and data only together with template_id.
 */
export function validateRenderSource(
  data: { html?: string; url?: string; template_id?: string; data?: Record<string, unknown> },
  ctx: z.RefinementCtx
): void {
  const sources = [data.html, data.url, data.template_id].filter(Boolean).length;
  if (sources === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either "html", "url" or "template_id" must be provided',
      path: ['html'],
    });
  } else if (sources > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide only one of "html", "url" or "template_id"',
      path: ['template_id'],
    });
  }
  if (data.data !== undefined && !data.template_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '"data" can only be used together with "template_id"',
      path: ['data'],
    });
  }
}
