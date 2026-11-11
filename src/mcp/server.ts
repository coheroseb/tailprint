import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { browserService } from '../services/browser.js';
import { scraperService } from '../services/scraper.js';
import { qrService } from '../services/qr.js';
import { chartService } from '../services/chart.js';
import { mockupService } from '../services/mockup.js';
import { pdfStamperService } from '../services/pdfStamper.js';
import { storageService } from '../services/storage.js';
import { visualDiffService } from '../services/visualDiff.js';
import { carouselService } from '../services/carousel.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { TEMPLATES } from '../config/templates.js';

export interface McpServerOptions {
  name?: string;
  version?: string;
  onUsage?: (toolName: string) => Promise<void> | void;
}

const TEMPLATE_IDS = [
  'invoice',
  'certificate',
  'report',
  'resume',
  'og-card',
  'shipping-label',
  'ticket',
  'receipt',
] as const;

/**
 * Creates and configures an McpServer instance with Tailprint Tools, Resources, and Prompts.
 */
export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name || 'tailprint-mcp',
    version: options.version || '1.0.0',
  });

  // ==========================================
  // MCP TOOLS
  // ==========================================

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

        const stored = await storageService.saveFile(buffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'rendered.pdf',
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ **PDF successfully generated!** (${sizeKb} KB, ${format || 'A4'}${landscape ? ', Landscape' : ''}${password ? ', Encrypted' : ''})\n\n🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Link hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:application/pdf;base64,${base64Pdf}`,
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
    'Renders HTML with Tailwind CSS to a high-resolution PNG or JPEG image. In compatible MCP clients (Claude Desktop, Cursor), the image displays inline directly in chat.',
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

        const stored = await storageService.saveFile(buffer, {
          mimeType: `image/${imgType}`,
          extension: imgType,
          filename: `rendered.${imgType}`,
        });

        return {
          content: [
            {
              type: 'image',
              data: base64Img,
              mimeType: `image/${imgType}`,
            },
            {
              type: 'text',
              text: `✅ **Image successfully rendered!** (${imgWidth}x${imgHeight} ${imgType.toUpperCase()}, ${sizeKb} KB)\n\n🔗 **Direct Image Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:image/${imgType};base64,${base64Img}`,
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
    'Returns the catalog of available pre-designed Tailwind CSS templates (Invoices, Certificates, Executive Reports, Resumes, Open Graph Cards, Shipping Labels, Event Passes, POS Receipts).',
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
      template_id: z.enum(TEMPLATE_IDS).describe('Template identifier'),
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

  // Tool 6: render_template (Data-driven direct template rendering)
  server.tool(
    'render_template',
    'Renders a pre-designed Tailwind CSS template directly with optional variable data substitution. Ideal for generating invoices, receipts, and certificates without managing raw HTML markup.',
    {
      template_id: z.enum(TEMPLATE_IDS).describe('Template identifier to render'),
      variables: z.record(z.union([z.string(), z.number()])).optional().describe('Key-value pairs to replace in template HTML. Replaces {{key}} tags or exact text matches.'),
      output_format: z.enum(['pdf', 'png', 'jpeg']).optional().default('pdf').describe('Output format: "pdf" for documents, "png" or "jpeg" for images (default: pdf)'),
      landscape: z.boolean().optional().describe('Orientation override (landscape: true or false)'),
      password: z.string().optional().describe('Optional AES-256 password to encrypt the PDF document'),
    },
    async ({ template_id, variables, output_format, landscape, password }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_template');
        }

        const template = TEMPLATES.find((t) => t.id === template_id);
        if (!template) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Template "${template_id}" not found.` }],
          };
        }

        let renderedHtml = template.html;
        if (variables) {
          for (const [key, val] of Object.entries(variables)) {
            const strVal = String(val);
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const placeholderPattern = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
            if (placeholderPattern.test(renderedHtml)) {
              renderedHtml = renderedHtml.replace(placeholderPattern, strVal);
            } else {
              renderedHtml = renderedHtml.replaceAll(key, strVal);
            }
          }
        }

        const targetFormat = output_format || 'pdf';

        if (targetFormat === 'pdf') {
          const buffer = await browserService.renderPdf({
            html: renderedHtml,
            format: template.format || 'A4',
            landscape: landscape !== undefined ? landscape : (template.landscape || false),
            print_background: true,
            password,
          });

          const base64Pdf = buffer.toString('base64');
          const sizeKb = (buffer.byteLength / 1024).toFixed(1);

          const stored = await storageService.saveFile(buffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename: `${template.id}.pdf`,
          });

          return {
            content: [
              {
                type: 'text',
                text: `✅ **Template "${template.title}" rendered to PDF!** (${sizeKb} KB, ${template.format || 'A4'}${password ? ', Encrypted' : ''})\n\n🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Link hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:application/pdf;base64,${base64Pdf}`,
              },
            ],
          };
        } else {
          const isLandscape = landscape !== undefined ? landscape : (template.landscape || false);
          const width = isLandscape ? 1200 : 800;
          const height = isLandscape ? 630 : 1000;

          const buffer = await browserService.renderImage({
            html: renderedHtml,
            width,
            height,
            type: targetFormat,
          });

          const base64Img = buffer.toString('base64');
          const sizeKb = (buffer.byteLength / 1024).toFixed(1);

          return {
            content: [
              {
                type: 'image',
                data: base64Img,
                mimeType: `image/${targetFormat}`,
              },
              {
                type: 'text',
                text: `✅ Template "${template.title}" rendered to ${targetFormat.toUpperCase()} (${width}x${height}, ${sizeKb} KB).\n\nBase64 Data URI:\ndata:image/${targetFormat};base64,${base64Img}`,
              },
            ],
          };
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error rendering template "${template_id}": ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 7: render_chart (High-DPI Data Visualizations)
  server.tool(
    'render_chart',
    'Renders high-DPI, interactive-grade data visualizations (Bar, Line, Pie, Doughnut, PolarArea, Radar) using Chart.js inside headless Chromium. In compatible MCP clients (Claude Desktop, Cursor), the chart displays inline directly in chat.',
    {
      type: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea']).describe('Chart type'),
      labels: z.array(z.string()).describe('Array of category or time labels (e.g. ["Jan", "Feb", "Mar", "Apr"])'),
      datasets: z.array(z.object({
        label: z.string().describe('Dataset name'),
        data: z.array(z.number()).describe('Array of numeric values matching the labels'),
        backgroundColor: z.union([z.string(), z.array(z.string())]).optional().describe('Color hex or array of color hexes'),
        borderColor: z.union([z.string(), z.array(z.string())]).optional().describe('Border or line color hex'),
        borderWidth: z.number().optional().describe('Border line width in pixels'),
        fill: z.boolean().optional().describe('Whether to fill the area under the line (for line charts)'),
      })).describe('Array of datasets to plot'),
      title: z.string().optional().describe('Optional chart headline/title'),
      theme: z.enum(['dark', 'light']).optional().default('dark').describe('Color theme (default: dark)'),
      width: z.number().optional().default(1000).describe('Chart image width in pixels (default: 1000)'),
      height: z.number().optional().default(600).describe('Chart image height in pixels (default: 600)'),
    },
    async ({ type, labels, datasets, title, theme, width, height }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_chart');
        }

        const buffer = await chartService.renderChart({
          type,
          data: { labels, datasets },
          title,
          theme: theme || 'dark',
          width: width || 1000,
          height: height || 600,
        });

        const base64Img = buffer.toString('base64');
        const sizeKb = (buffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(buffer, {
          mimeType: 'image/png',
          extension: 'png',
          filename: 'chart.png',
        });

        return {
          content: [
            {
              type: 'image',
              data: base64Img,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: `✅ **${type.toUpperCase()} Chart successfully generated!** (${width || 1000}x${height || 600}, ${sizeKb} KB)\n\n🔗 **Direct Image Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:image/png;base64,${base64Img}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error rendering chart: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 8: generate_qr (Scannable QR Codes)
  server.tool(
    'generate_qr',
    'Generates mathematically verified, high-resolution scannable QR codes for URLs, WiFi credentials, vCard contact cards, or payment links. Returns an inline image content block and base64 PNG data URI.',
    {
      text: z.string().describe('Content to encode in the QR code (e.g. "https://tailprint.com", "WIFI:S:MyNetwork;T:WPA;P:Secret;;", "TEL:+4512345678")'),
      size: z.number().optional().default(512).describe('QR code width/height in pixels (default: 512)'),
      dark_color: z.string().optional().default('#000000').describe('Hex color for dark modules (default: "#000000")'),
      light_color: z.string().optional().default('#ffffff').describe('Hex color for light background (default: "#ffffff")'),
      error_correction: z.enum(['L', 'M', 'Q', 'H']).optional().default('M').describe('Error correction level (L: 7%, M: 15%, Q: 25%, H: 30%)'),
    },
    async ({ text, size, dark_color, light_color, error_correction }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('generate_qr');
        }

        const buffer = await qrService.generatePngBuffer({
          text,
          size: size || 512,
          darkColor: dark_color || '#000000',
          lightColor: light_color || '#ffffff',
          errorCorrection: error_correction || 'M',
        });

        const base64Img = buffer.toString('base64');
        const sizeKb = (buffer.byteLength / 1024).toFixed(1);

        return {
          content: [
            {
              type: 'image',
              data: base64Img,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: `✅ Verified Scannable QR Code generated (${size || 512}x${size || 512}, ${sizeKb} KB) for: "${text}".\n\nBase64 Data URI:\ndata:image/png;base64,${base64Img}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error generating QR code: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 9: render_device_mockup (Multi-Device Responsive Mockup)
  server.tool(
    'render_device_mockup',
    'Captures any public website URL and renders it into a photorealistic MacBook Pro + floating iPhone multi-device presentation mockup on a studio gradient. Returns an inline image content block and base64 PNG.',
    {
      url: z.string().url().describe('Public website URL to capture as responsive mockup (e.g. "https://stripe.com" or "https://tailprint.com")'),
      title: z.string().optional().describe('Optional title label on the mockup header'),
      delay_ms: z.number().optional().default(500).describe('Delay in milliseconds before capturing screenshots to allow fonts/animations to load (max 5000)'),
    },
    async ({ url, title, delay_ms }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_device_mockup');
        }

        const buffer = await mockupService.renderDeviceMockup({
          url,
          title,
          delay_ms: Math.min(delay_ms || 500, 5000),
        });

        const base64Img = buffer.toString('base64');
        const sizeKb = (buffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(buffer, {
          mimeType: 'image/png',
          extension: 'png',
          filename: 'device-mockup.png',
        });

        return {
          content: [
            {
              type: 'image',
              data: base64Img,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: `✅ **Responsive Device Mockup successfully rendered!** (1600x1000, ${sizeKb} KB) for "${url}".\n\n🔗 **Direct Image Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:image/png;base64,${base64Img}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error rendering device mockup for "${url}": ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 10: stamp_pdf (PDF Watermark & Status Overlay)
  server.tool(
    'stamp_pdf',
    'Applies a diagonal semi-transparent watermark or status stamp (e.g. "CONFIDENTIAL", "DRAFT", "FORTROLIGT", "TILBUD") across all pages of an existing vector PDF using pdf-lib.',
    {
      pdf_base64: z.string().describe('Base64-encoded PDF string (e.g. output from render_pdf or render_template)'),
      watermark_text: z.string().describe('Watermark text to stamp diagonally across each page (e.g. "CONFIDENTIAL", "DRAFT", "FORTROLIGT", "TILBUD")'),
      opacity: z.number().optional().default(0.15).describe('Watermark opacity from 0.05 (subtle) to 0.5 (prominent) - default: 0.15'),
      color: z.enum(['red', 'gray', 'blue']).optional().default('red').describe('Watermark color: "red", "gray", or "blue" (default: "red")'),
      font_size: z.number().optional().default(54).describe('Font size of watermark text in points (default: 54)'),
    },
    async ({ pdf_base64, watermark_text, opacity, color, font_size }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('stamp_pdf');
        }

        // Clean base64 string if it contains data URI header
        const cleanBase64 = pdf_base64.replace(/^data:application\/pdf;base64,/, '').trim();
        const inputBuffer = Buffer.from(cleanBase64, 'base64');

        const stampedBuffer = await pdfStamperService.applyWatermark({
          pdfBuffer: inputBuffer,
          text: watermark_text,
          opacity: opacity || 0.15,
          color: color || 'red',
          fontSize: font_size || 54,
        });

        const outputBase64 = stampedBuffer.toString('base64');
        const sizeKb = (stampedBuffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(stampedBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'watermarked.pdf',
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ **PDF successfully stamped with watermark "${watermark_text}"!** (${sizeKb} KB)\n\n🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Link hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:application/pdf;base64,${outputBase64}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error stamping PDF: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 11: compare_snapshots (Visual Regression Diff Heatmap)
  server.tool(
    'compare_snapshots',
    'Captures two URLs, HTML snippets, or base64 screenshots and generates a pixel-precise visual regression diff heatmap. Returns a 3-panel side-by-side studio comparison image and diff statistics.',
    {
      before_url: z.string().url().optional().describe('Baseline web URL before changes'),
      after_url: z.string().url().optional().describe('Modified web URL after changes'),
      before_html: z.string().optional().describe('Baseline HTML markup before changes'),
      after_html: z.string().optional().describe('Modified HTML markup after changes'),
      before_image_base64: z.string().optional().describe('Optional baseline PNG base64 string'),
      after_image_base64: z.string().optional().describe('Optional modified PNG base64 string'),
      width: z.number().optional().default(1200).describe('Viewport width in pixels (default: 1200)'),
      height: z.number().optional().default(800).describe('Viewport height in pixels (default: 800)'),
      threshold: z.number().optional().default(0.1).describe('Matching threshold from 0.0 (strict) to 1.0 (loose) - default: 0.1'),
    },
    async ({ before_url, after_url, before_html, after_html, before_image_base64, after_image_base64, width, height, threshold }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('compare_snapshots');
        }

        const result = await visualDiffService.compareSnapshots({
          beforeUrl: before_url,
          afterUrl: after_url,
          beforeHtml: before_html,
          afterHtml: after_html,
          beforeImageBase64: before_image_base64,
          afterImageBase64: after_image_base64,
          width: width || 1200,
          height: height || 800,
          threshold: threshold !== undefined ? threshold : 0.1,
        });

        const stored = await storageService.saveFile(result.compositeImageBuffer, {
          mimeType: 'image/png',
          extension: 'png',
          filename: 'visual-diff.png',
        });

        const compositeBase64 = result.compositeImageBuffer.toString('base64');
        const statusText = result.isIdentical
          ? 'Identical (0% difference)'
          : `${result.diffPercentage}% layout shift (${result.differentPixels.toLocaleString()} changed pixels)`;

        return {
          content: [
            {
              type: 'image',
              data: compositeBase64,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: `🔍 **Visual Regression Report Generated!**\n\n- **Status:** ${statusText}\n- **Total Pixels:** ${result.totalPixels.toLocaleString()}\n- **Changed Pixels:** ${result.differentPixels.toLocaleString()}\n- **Diff Percentage:** ${result.diffPercentage}%\n\n🔗 **Direct Studio Report Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Hosted on Tailprint CDN, expires in 24 hours)*`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error comparing snapshots: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 12: render_carousel (LinkedIn / Instagram Multi-Slide Carousel)
  server.tool(
    'render_carousel',
    'Generates high-converting multi-slide social media carousels (1080x1350 px, 4:5 portrait) for LinkedIn (multi-page PDF) and Instagram/Twitter (PNG). Accepts markdown or structured slides.',
    {
      title: z.string().optional().describe('Carousel main title / topic'),
      subtitle: z.string().optional().describe('Optional subtitle or hook'),
      author_name: z.string().optional().default('Tailprint Insights').describe('Author name to brand each slide'),
      author_handle: z.string().optional().default('@tailprint').describe('Social handle (e.g. @company or @founder)'),
      author_role: z.string().optional().describe('Author title / role (e.g. "Full-Stack Engineer" or "Tech Lead")'),
      theme: z.enum(['dark', 'light', 'emerald', 'gradient']).optional().default('dark').describe('Visual aesthetic theme (dark, light, emerald, gradient)'),
      markdown: z.string().optional().describe('Markdown text where slides are separated by "---" with # headlines and bullet points.'),
      slides: z
        .array(
          z.object({
            headline: z.string().describe('Slide headline'),
            content: z.union([z.string(), z.array(z.string())]).describe('Slide body paragraph or bullet points array'),
            tag: z.string().optional().describe('Top tag pill (e.g. "RULE 01", "MISTAKE", "TIP")'),
            takeaway: z.string().optional().describe('Bottom takeaway callout box'),
          })
        )
        .optional()
        .describe('Structured slide array'),
    },
    async ({ title, subtitle, author_name, author_handle, author_role, theme, markdown, slides }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_carousel');
        }

        const result = await carouselService.renderCarousel({
          title,
          subtitle,
          author: {
            name: author_name || 'Tailprint Insights',
            handle: author_handle || '@tailprint',
            role: author_role || 'High-Performance Engine',
          },
          theme: theme || 'dark',
          markdown,
          slides,
        });

        const previewBase64 = result.previewImageBuffer.toString('base64');

        return {
          content: [
            {
              type: 'image',
              data: previewBase64,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: `📱 **Multi-Slide Carousel Generated Successfully!** (${result.slideCount} slides, 1080x1350 px)\n\n📥 **LinkedIn Carousel (Multi-page PDF):** [${result.pdfStored?.hostedUrl}](${result.pdfStored?.hostedUrl})\n*(Upload this PDF directly to LinkedIn as a document carousel post)*\n\n🖼️ **Instagram / Cover Slide (PNG):** [${result.previewStored?.hostedUrl}](${result.previewStored?.hostedUrl})\n*(Hosted on Tailprint CDN, expires in 24 hours)*`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error generating carousel: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 13: generate_einvoice
  server.tool(
    'generate_einvoice',
    'Generates a legally compliant European hybrid electronic invoice (Factur-X / ZUGFeRD 2.2 / EN 16931). Renders a beautiful visual PDF and embeds machine-readable CrossIndustryInvoice XML (/EmbeddedFiles) for automated ingestion by ERP and accounting platforms (DATEV, SAP, Chorus Pro, Dinero, Billy).',
    {
      invoice_number: z.string().describe('Unique invoice reference number (e.g. "INV-2026-0042")'),
      seller_name: z.string().describe('Supplier/seller company name'),
      seller_vat_id: z.string().optional().describe('Supplier VAT ID / Tax number (e.g. "DK12345678" or "DE987654321")'),
      seller_country: z.string().length(2).optional().default('DK').describe('2-letter ISO country code of seller (e.g. DK, DE, FR, NL)'),
      seller_street: z.string().optional().describe('Seller street address'),
      seller_city: z.string().optional().describe('Seller city'),
      seller_postcode: z.string().optional().describe('Seller postal code'),
      seller_email: z.string().optional().describe('Seller billing email'),
      buyer_name: z.string().describe('Customer/buyer company or client name'),
      buyer_vat_id: z.string().optional().describe('Buyer VAT ID / Tax number (e.g. "DE123456789")'),
      buyer_country: z.string().length(2).optional().default('DE').describe('2-letter ISO country code of buyer (e.g. DE, FR, DK)'),
      buyer_street: z.string().optional().describe('Buyer street address'),
      buyer_city: z.string().optional().describe('Buyer city'),
      buyer_postcode: z.string().optional().describe('Buyer postal code'),
      buyer_email: z.string().optional().describe('Buyer contact/AP email'),
      line_items: z
        .array(
          z.object({
            name: z.string().describe('Product or service description'),
            quantity: z.number().positive().describe('Quantity or units'),
            unit_price: z.number().nonnegative().describe('Price per unit excluding VAT'),
            vat_rate: z.number().nonnegative().optional().default(25).describe('VAT percentage (e.g. 25 for 25% or 0 for exempt)'),
          })
        )
        .min(1)
        .describe('List of invoice items or billed services'),
      currency: z.string().length(3).optional().default('EUR').describe('ISO 4217 currency code (e.g. EUR, DKK, USD, SEK)'),
      due_date: z.string().optional().describe('Due payment date (YYYY-MM-DD)'),
      payment_iban: z.string().optional().describe('Bank transfer IBAN for direct wire payment'),
      payment_bic: z.string().optional().describe('Bank SWIFT/BIC code'),
      notes: z.string().optional().describe('Optional payment terms or notes'),
      profile: z.enum(['BASIC', 'EN16931']).optional().default('BASIC').describe('Factur-X compliance profile level'),
    },
    async ({
      invoice_number,
      seller_name,
      seller_vat_id,
      seller_country,
      seller_street,
      seller_city,
      seller_postcode,
      seller_email,
      buyer_name,
      buyer_vat_id,
      buyer_country,
      buyer_street,
      buyer_city,
      buyer_postcode,
      buyer_email,
      line_items,
      currency,
      due_date,
      payment_iban,
      payment_bic,
      notes,
      profile,
    }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('generate_einvoice');
        }

        const result = await eInvoiceService.generateHybridInvoice({
          invoiceNumber: invoice_number,
          currency: currency || 'EUR',
          dueDate: due_date,
          seller: {
            name: seller_name,
            vatId: seller_vat_id,
            country: seller_country || 'DK',
            street: seller_street,
            city: seller_city,
            postcode: seller_postcode,
            email: seller_email,
          },
          buyer: {
            name: buyer_name,
            vatId: buyer_vat_id,
            country: buyer_country || 'DE',
            street: buyer_street,
            city: buyer_city,
            postcode: buyer_postcode,
            email: buyer_email,
          },
          lineItems: line_items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            vatRate: item.vat_rate,
          })),
          paymentIban: payment_iban,
          paymentBic: payment_bic,
          notes,
          profile: profile || 'BASIC',
        });

        return {
          content: [
            {
              type: 'text',
              text: [
                `🇪🇺 **Factur-X / ZUGFeRD 2.2 Compliant Hybrid E-Invoice Generated!**`,
                ``,
                `- **Invoice Number:** \`${result.invoiceNumber}\``,
                `- **Currency:** \`${result.currency}\``,
                `- **Subtotal (Net):** \`${result.netTotal.toFixed(2)} ${result.currency}\``,
                `- **Total VAT:** \`${result.taxTotal.toFixed(2)} ${result.currency}\``,
                `- **Total Due (Gross):** \`${result.grossTotal.toFixed(2)} ${result.currency}\``,
                `- **Standard:** EN 16931 / PEPPOL / Factur-X (${profile || 'BASIC'} Profile)`,
                `- **Embedded Machine Data:** \`factur-x.xml\` (CrossIndustryInvoice, attached to PDF catalog)`,
                ``,
                `📥 **Download Hybrid PDF:** [${result.pdfStored?.hostedUrl}](${result.pdfStored?.hostedUrl})`,
                ``,
                `*Compatible with DATEV, SAP, Chorus Pro, Dinero, Billy, and all European tax authorities.*`,
              ].join('\n'),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error generating EU E-Invoice: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // ==========================================
  // MCP RESOURCES
  // ==========================================

  // Resource 1: Complete catalog of templates
  server.resource(
    'templates-catalog',
    'tailprint://templates/catalog',
    { description: 'Complete catalog of all available Tailwind CSS document and graphic templates', mimeType: 'application/json' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            TEMPLATES.map((t) => ({
              id: t.id,
              title: t.title,
              category: t.category,
              description: t.description,
              format: t.format,
              landscape: t.landscape,
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  // Resource 2: Tailwind PDF Best Practices Guide
  server.resource(
    'tailwind-pdf-guide',
    'tailprint://docs/tailwind-guide',
    { description: 'Developer guide for crafting pixel-perfect, print-ready documents with Tailwind CSS', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            '# Tailprint Guide: Crafting Beautiful Documents with Tailwind CSS',
            '',
            'Tailprint combines headless Chromium with full Tailwind CSS utility classes.',
            '',
            '## Page Sizing & Container Dimensions',
            '- **A4 Portrait:** Set root element to `class="w-[210mm] min-h-[297mm] p-10 bg-white text-slate-800"`',
            '- **A4 Landscape:** Set root element to `class="w-[297mm] min-h-[210mm] p-10 bg-white text-slate-800"`',
            '- **Open Graph Social Card:** Set root element to `class="w-[1200px] h-[630px] flex flex-col justify-between p-16"`',
            '',
            '## Page Breaks in Multi-Page Documents',
            '- Prevent elements from splitting across page breaks: `break-inside-avoid` (CSS: `break-inside: avoid;`)',
            '- Force a new page break: `break-after-page` (CSS: `break-after: page;`)',
            '',
            '## Chromium Page Numbers in Headers & Footers',
            'When using `header_html` or `footer_html`, Chromium automatically populates these special classes:',
            '- `<span class="pageNumber"></span>` – Current page index',
            '- `<span class="totalPages"></span>` – Total pages count',
            '- `<span class="date"></span>` – Formatted render date',
            '- `<span class="title"></span>` – Document title',
            '',
            'Note: Header and footer templates must include inline styles for font size (e.g. `font-size: 9px;`).',
          ].join('\n'),
        },
      ],
    })
  );

  // Resources 3..N: Static template resources for every template
  for (const t of TEMPLATES) {
    server.resource(
      `template-${t.id}`,
      `tailprint://templates/${t.id}`,
      { description: `${t.title} (${t.category}) HTML template with Tailwind CSS`, mimeType: 'text/html' },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/html',
            text: t.html,
          },
        ],
      })
    );
  }

  // ==========================================
  // MCP PROMPTS
  // ==========================================

  // Prompt 1: Generate Invoice
  server.prompt(
    'generate_invoice',
    'Interactively generate a professional invoice PDF from client and billing details',
    {
      client_name: z.string().describe('Name of client, customer, or organization'),
      invoice_number: z.string().optional().describe('Invoice reference number (e.g. INV-2026-001)'),
      items_description: z.string().describe('Summary of line items, quantities, and pricing'),
      total_amount: z.string().describe('Total invoice amount with currency (e.g. $1,450.00)'),
    },
    async ({ client_name, invoice_number, items_description, total_amount }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a professional invoice PDF for client "${client_name}".\n- Invoice Number: ${invoice_number || 'INV-2026-001'}\n- Line Items: ${items_description}\n- Total: ${total_amount}\n\nPlease use the Tailprint "render_template" tool with template_id "invoice", or customize the HTML template obtained from get_template_source(template_id: "invoice") and render it with render_pdf.`,
            },
          },
        ],
      };
    }
  );

  // Prompt 2: Summarize URL to PDF
  server.prompt(
    'summarize_url_to_pdf',
    'Scrapes a web article and renders it into a branded PDF executive summary',
    {
      url: z.string().url().describe('The web URL to scrape and summarize'),
      title: z.string().optional().describe('Optional report title'),
    },
    async ({ url, title }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please scrape the web page at "${url}" using Tailprint's scrape_markdown tool. Extract the core insights, key takeaways, and data points. Then format them as an executive report using the "report" template with Tailprint's render_template or render_pdf tools.${title ? ` Title: "${title}".` : ''}`,
            },
          },
        ],
      };
    }
  );

  // Prompt 3: Create Social Card
  server.prompt(
    'create_social_card',
    'Generates a high-resolution Open Graph social share image (1200x630)',
    {
      title: z.string().describe('Main headline or post title'),
      subtitle: z.string().optional().describe('Author name or brief tagline'),
      category: z.string().optional().describe('Badge or category label (e.g. "Product Update", "Engineering")'),
    },
    async ({ title, subtitle, category }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please design a high-converting 1200x630 Open Graph banner image for:\n- Title: "${title}"\n- Subtitle: "${subtitle || ''}"\n- Category: "${category || 'Article'}"\n\nUse the Tailprint render_template tool with template_id "og-card" (output_format: "png"), or render custom Tailwind HTML using render_image.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
