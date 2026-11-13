import { getHostedTemplate, HOSTED_TEMPLATE_IDS } from '../config/hostedTemplates.js';

export class TemplateInputError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'TemplateInputError';
  }
}

interface TemplateCarrier {
  html?: string;
  url?: string;
  template_id?: string;
  data?: Record<string, unknown>;
}

const MAX_REPORTED_ISSUES = 8;

/**
 * If the request references a hosted template, validates `data` against the template's
 * schema and returns the request with `html` filled in. Requests without a `template_id`
 * are returned unchanged. Throws `TemplateInputError` (HTTP 400) for unknown templates or
 * invalid data, so callers can reject before any quota is consumed.
 */
export function resolveTemplateRequest<T extends TemplateCarrier>(input: T): T {
  if (!input.template_id) return input;

  const template = getHostedTemplate(input.template_id);
  if (!template) {
    throw new TemplateInputError(
      `Unknown template_id "${input.template_id}". Available templates: ${HOSTED_TEMPLATE_IDS.join(', ')}. See GET /v1/templates.`
    );
  }

  const parsed = template.schema.safeParse(input.data ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, MAX_REPORTED_ISSUES).map((issue: { path: Array<string | number>; message: string }) => {
      const path = issue.path.length ? issue.path.join('.') : 'data';
      return `${path}: ${issue.message}`;
    });
    const more = parsed.error.issues.length - issues.length;
    throw new TemplateInputError(
      `Invalid data for template "${template.id}" - ${issues.join('; ')}${more > 0 ? `; and ${more} more` : ''}. See GET /v1/templates/${template.id} for example data.`
    );
  }

  return { ...input, html: template.render(parsed.data), data: undefined };
}
