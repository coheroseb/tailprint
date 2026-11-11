import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { browserService } from '../services/browser.js';
import { scraperService } from '../services/scraper.js';
import { TEMPLATES } from '../config/templates.js';

export interface McpServerOptions {
  name?: string;
  version?: string;
  onUsage?: (toolName: string) => Promise<void> | void;
}

/**
 * Creates and configures an McpServer instance with Tailprint & Web Scraping tools.
 */
export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name || 'tailprint-mcp',
    version: options.version || '1.0.0',
  });

  // Tool 1: scrape_markdown
  server.tool(
    'scrape_markdown',
    'Scrapes any public URL using headless Chromium, strips ads/scripts/trackers with Readability, and converts the content into clean, LLM-optimized Markdown with token savings metrics.',
    {
      url: z.string().url().describe('The full web URL to scrape (e.g. https://techcrunch.com/article)'),
      strip_images: z.boolean().optional().default(true).describe('Whether to remove image tags to minimize token count for LLMs (default: true)'),
      wait_for: z.string().optional().describe('Optional CSS selector to wait for before parsing (e.g. "article", "main", ".content")'),
    },
    async ({ url, strip_images, wait_for }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('scrape_markdown');
        }

        const result = await scraperService.scrapeUrl({
          url,
          strip_images: strip_images ?? true,
          include_raw_html: false,
          timeout_ms: 8000,
          wait_for,
        });

        const headerInfo = [
          `# ${result.title}`,
          result.byline ? `**Author:** ${result.byline}` : null,
          result.published_at ? `**Published:** ${result.published_at}` : null,
          `**URL:** ${result.url}`,
          `**Token Metrics:** ~${result.estimated_tokens} tokens (${result.word_count} words) | Saved: ${result.token_savings_percent}`,
          '---',
        ].filter(Boolean).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `${headerInfo}\n\n${result.markdown}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error scraping URL "${url}": ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: render_pdf
  server.tool(
    'render_pdf',
    'Converts HTML with full Tailwind CSS classes into a pixel-perfect, vector PDF document. Returns the document as base64 data URI.',
    {
      html: z.string().optional().describe('HTML markup to render. Tailwind CSS utility classes are supported automatically. Either html or url is required.'),
      url: z.string().url().optional().describe('Public web URL to render directly to PDF (e.g. https://news.ycombinator.com). Either html or url is required.'),
      format: z.enum(['A4', 'Letter']).optional().default('A4').describe('Paper format: "A4" or "Letter" (default: "A4")'),
      landscape: z.boolean().optional().default(false).describe('Whether to generate PDF in landscape orientation (default: false)'),
      print_background: z.boolean().optional().default(true).describe('Whether to print CSS backgrounds and colors (default: true)'),
      header_html: z.string().optional().describe('Optional HTML template for page header (e.g. with pageNumber / totalPages)'),
      footer_html: z.string().optional().describe('Optional HTML template for page footer (e.g. with pageNumber / totalPages)'),
      password: z.string().optional().describe('Optional password to encrypt the PDF with AES-256'),
      wait_for: z.string().optional().describe('Optional CSS selector to wait for before rendering'),
      delay_ms: z.number().optional().describe('Optional delay in milliseconds before rendering (max 5000)'),
    },
    async ({ html, url, format, landscape, print_background, header_html, footer_html, password, wait_for, delay_ms }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_pdf');
        }

        const buffer = await browserService.renderPdf({
          html,
          url,
          format: format || 'A4',
          landscape: landscape || false,
          print_background: print_background !== false,
          header_html,
          footer_html,
          password,
          wait_for,
          delay_ms,
        });

        const base64Pdf = buffer.toString('base64');
        const sizeKb = (buffer.byteLength / 1024).toFixed(1);

        return {
          content: [
            {
              type: 'text',
              text: `✅ PDF successfully generated (${sizeKb} KB, ${format || 'A4'}${landscape ? ', Landscape' : ''}${password ? ', Encrypted' : ''}).\n\nBase64 Data URI:\ndata:application/pdf;base64,${base64Pdf}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error rendering PDF: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: render_image
  server.tool(
    'render_image',
    'Renders HTML with Tailwind CSS to a high-resolution PNG or JPEG image (ideal for Open Graph social banners, dashboard screenshots, or dynamic cards).',
    {
      html: z.string().optional().describe('HTML markup to render with Tailwind CSS styling. Either html or url is required.'),
      url: z.string().url().optional().describe('Public web URL to capture as image (e.g. https://github.com). Either html or url is required.'),
      width: z.number().optional().default(1200).describe('Image width in pixels (default: 1200 for OG banners)'),
      height: z.number().optional().default(630).describe('Image height in pixels (default: 630 for OG banners)'),
      type: z.enum(['png', 'jpeg']).optional().default('png').describe('Image output format (default: png)'),
      wait_for: z.string().optional().describe('Optional CSS selector to wait for before rendering'),
      delay_ms: z.number().optional().describe('Optional delay in milliseconds before rendering (max 5000)'),
    },
    async ({ html, url, width, height, type, wait_for, delay_ms }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_image');
        }

        const imgWidth = width || 1200;
        const imgHeight = height || 630;
        const imgType = type || 'png';

        const buffer = await browserService.renderImage({
          html,
          url,
          width: imgWidth,
          height: imgHeight,
          type: imgType,
          wait_for,
          delay_ms,
        });

        const base64Img = buffer.toString('base64');
        const sizeKb = (buffer.byteLength / 1024).toFixed(1);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Image successfully rendered (${imgWidth}x${imgHeight} ${imgType.toUpperCase()}, ${sizeKb} KB).\n\nBase64 Data URI:\ndata:image/${imgType};base64,${base64Img}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error rendering image: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 4: list_templates
  server.tool(
    'list_templates',
    'Returns the catalog of available pre-designed Tailwind CSS templates (Invoices, Certificates, Executive Reports, Resumes, Open Graph Cards, Shipping Labels).',
    {},
    async () => {
      const templateList = TEMPLATES.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        description: t.description,
        format: t.format,
        landscape: t.landscape,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(templateList, null, 2),
          },
        ],
      };
    }
  );

  // Tool 5: get_template_source
  server.tool(
    'get_template_source',
    'Retrieves the full Tailwind CSS HTML source code of a template by ID, allowing an AI agent to customize data and render it with render_pdf or render_image.',
    {
      template_id: z.enum(['invoice', 'certificate', 'report', 'resume', 'og-card', 'shipping-label']).describe('Template identifier'),
    },
    async ({ template_id }) => {
      const template = TEMPLATES.find((t) => t.id === template_id);
      if (!template) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Template "${template_id}" not found. Available: ${TEMPLATES.map((t) => t.id).join(', ')}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: template.html,
          },
        ],
      };
    }
  );

  return server;
}
