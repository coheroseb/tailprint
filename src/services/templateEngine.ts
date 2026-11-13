import { getHostedTemplate, HOSTED_TEMPLATE_IDS } from '../config/hostedTemplates.js';
import { redisService, type CustomTemplateRecord } from './redis.js';

export class TemplateInputError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'TemplateInputError';
  }
}

export class TemplatePlanError extends Error {
  public readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'TemplatePlanError';
  }
}

interface TemplateCarrier {
  html?: string;
  url?: string;
  template_id?: string;
  data?: Record<string, unknown>;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  smart_pagination?: boolean;
}

const MAX_REPORTED_ISSUES = 8;

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNestedValue(context: Record<string, unknown>, path: string): unknown {
  const cleanPath = path.trim();
  if (cleanPath === '.') {
    return context['.'];
  }
  const parts = cleanPath.split('.');
  let current: unknown = context;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function renderMustacheBlock(templateStr: string, context: Record<string, unknown>): string {
  let output = templateStr;

  // 1. Process sections {{#key}}...{{/key}} and inverted sections {{^key}}...{{/key}}
  const sectionRegex = /\{\{([#^])\s*([a-zA-Z0-9_.-]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
  let safetyCounter = 0;
  while (sectionRegex.test(output) && safetyCounter < 25) {
    safetyCounter++;
    output = output.replace(sectionRegex, (_match, mode: string, key: string, inner: string) => {
      const val = getNestedValue(context, key);
      const isInverted = mode === '^';

      if (isInverted) {
        const isEmpty =
          val === undefined ||
          val === null ||
          val === false ||
          val === '' ||
          (Array.isArray(val) && val.length === 0);
        return isEmpty ? renderMustacheBlock(inner, context) : '';
      }

      if (Array.isArray(val)) {
        if (val.length === 0) return '';
        return val
          .map((item, idx) => {
            const childContext: Record<string, unknown> =
              item !== null && typeof item === 'object' && !Array.isArray(item)
                ? { ...context, ...(item as Record<string, unknown>), '@index': idx, '@number': idx + 1 }
                : { ...context, '.': item, '@index': idx, '@number': idx + 1 };
            return renderMustacheBlock(inner, childContext);
          })
          .join('');
      }

      if (val && typeof val === 'object') {
        return renderMustacheBlock(inner, { ...context, ...(val as Record<string, unknown>) });
      }

      if (val) {
        return renderMustacheBlock(inner, context);
      }

      return '';
    });
  }

  // 2. Process triple-brace raw HTML {{{key}}} and {{&key}}
  output = output.replace(/\{\{\{\s*([a-zA-Z0-9_.@-]+)\s*\}\}\}/g, (_m, key: string) => {
    const val = getNestedValue(context, key);
    return val === null || val === undefined ? '' : String(val);
  });
  output = output.replace(/\{\{&\s*([a-zA-Z0-9_.@-]+)\s*\}\}/g, (_m, key: string) => {
    const val = getNestedValue(context, key);
    return val === null || val === undefined ? '' : String(val);
  });

  // 3. Process HTML-escaped variables {{key}}
  output = output.replace(/\{\{\s*([a-zA-Z0-9_.@-]+)\s*\}\}/g, (_m, key: string) => {
    const val = getNestedValue(context, key);
    return escapeHtml(val);
  });

  return output;
}

/**
 * Validates required fields and renders a customer's CustomTemplateRecord into HTML.
 */
export function renderCustomTemplateHtml(
  template: CustomTemplateRecord,
  inputData?: Record<string, unknown>
): string {
  const mergedData: Record<string, unknown> = {
    ...(template.default_data || {}),
    ...(inputData || {}),
  };

  if (Array.isArray(template.required_fields) && template.required_fields.length > 0) {
    const missing: string[] = [];
    for (const fieldPath of template.required_fields) {
      const val = getNestedValue(mergedData, fieldPath);
      if (val === undefined || val === null || val === '') {
        missing.push(`${fieldPath}: Required`);
      }
    }
    if (missing.length > 0) {
      const shown = missing.slice(0, MAX_REPORTED_ISSUES);
      const more = missing.length - shown.length;
      throw new TemplateInputError(
        `Invalid data for template "${template.id}" - ${shown.join('; ')}${more > 0 ? `; and ${more} more` : ''}.`
      );
    }
  }

  return renderMustacheBlock(template.html, mergedData);
}

/**
 * Synchronous resolver for the 4 built-in hosted templates (used by MCP and playgrounds).
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

/**
 * Asynchronous resolver that supports BOTH the 4 built-in hosted templates (all plans)
 * AND customer-owned custom templates stored in Redis (requires Starter plan or higher).
 */
export async function resolveTemplateRequestForCustomer<T extends TemplateCarrier>(
  input: T,
  customerContext?: { customerId: string; plan: string } | null
): Promise<T> {
  if (!input.template_id) return input;

  // 1. Check built-in templates first (available on all plans including Free & Playground)
  const builtin = getHostedTemplate(input.template_id);
  if (builtin) {
    return resolveTemplateRequest(input);
  }

  // 2. Custom template resolution requires an authenticated Starter+ account
  if (!customerContext) {
    throw new TemplateInputError(
      `Unknown template_id "${input.template_id}". Built-in templates: ${HOSTED_TEMPLATE_IDS.join(', ')}. Custom templates require authentication with a Starter+ API key.`
    );
  }

  if (!redisService.isPaidPlan(customerContext.plan)) {
    throw new TemplatePlanError(
      `Custom hosted templates require a Starter plan or higher (current plan: ${customerContext.plan}). Upgrade at https://tailprint.com/#pricing.`
    );
  }

  const customTemplate = await redisService.getCustomTemplate(customerContext.customerId, input.template_id);
  if (!customTemplate) {
    throw new TemplateInputError(
      `Unknown template_id "${input.template_id}". Built-in templates: ${HOSTED_TEMPLATE_IDS.join(', ')}. Create a custom template via POST /v1/templates.`
    );
  }

  const renderedHtml = renderCustomTemplateHtml(customTemplate, input.data);
  return {
    ...input,
    html: renderedHtml,
    format: input.format ?? customTemplate.format,
    landscape: input.landscape ?? customTemplate.landscape,
    smart_pagination: input.smart_pagination ?? customTemplate.smart_pagination,
    data: undefined,
  };
}
