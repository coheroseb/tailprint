import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { browserService } from '../services/browser.js';
import { pdfStamperService } from '../services/pdfStamper.js';
import { storageService } from '../services/storage.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { pdfOperationsService } from '../services/pdfOperations.js';
import { presentationService } from '../services/presentation.js';
import { smartPdfService } from '../services/smartPdf.js';
import { crisprPdfService } from '../services/crisprPdf.js';
import { TEMPLATES } from '../config/templates.js';
import { resolveTemplateRequest } from '../services/templateEngine.js';

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
  'shipping-label',
  'ticket',
  'receipt',
  'quote',
  'nda',
  'statement',
  'einvoice',
  'presentation',
  'contract',
] as const;

const DOCUMENT_TEMPLATES = TEMPLATES.filter((t) => t.id !== 'og-card');

/**
 * Creates and configures an McpServer instance with Tailprint PDF & Document Tools, Resources, and Prompts.
 */
export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name || 'tailprint-mcp',
    version: options.version || '1.1.1',
  });

  // ==========================================
  // MCP TOOLS (11 Document & PDF Tools)
  // ==========================================

  // Tool 1: render_pdf
  server.tool(
    'render_pdf',
    'Converts HTML with full Tailwind CSS classes, a public URL, or a hosted template (template_id + JSON data, e.g. "invoice-modern") into a pixel-perfect, vector PDF document with Smart Pagination Shield, optional Neural-Implant 64-D Cortex (<div data-neural-button></div> supported), Dual-Brain JSON, and Cryptographic Proof-of-Origin. Returns a hosted CDN link, doc_id, brain_url, verify_url, and base64 data URI.',
    {
      html: z.string().optional().describe('HTML markup to render. Tailwind CSS utility classes are supported automatically. You can also place <div data-neural-button></div> or <div data-verify-button></div> anywhere in the HTML. Provide exactly one of html, url or template_id.'),
      url: z.string().url().optional().describe('Public web URL to render directly to PDF (e.g. https://news.ycombinator.com). Provide exactly one of html, url or template_id.'),
      template_id: z.string().optional().describe('Hosted template id: invoice-modern, receipt-minimal, certificate-classic or report-executive. Requires "data". Provide exactly one of html, url or template_id.'),
      data: z.record(z.any()).optional().describe('JSON data for template_id (e.g. seller, buyer and items for invoice-modern). Validation errors name the offending fields.'),
      format: z.enum(['A4', 'Letter']).optional().default('A4').describe('Paper format: "A4" or "Letter" (default: "A4")'),
      landscape: z.boolean().optional().default(false).describe('Whether to generate PDF in landscape orientation (default: false)'),
      print_background: z.boolean().optional().default(true).describe('Whether to print CSS backgrounds and colors (default: true)'),
      header_html: z.string().optional().describe('Optional HTML template for page header (e.g. with pageNumber / totalPages)'),
      footer_html: z.string().optional().describe('Optional HTML template for page footer (e.g. with pageNumber / totalPages)'),
      password: z.string().optional().describe('Optional password to encrypt the PDF with AES-256'),
      wait_for: z.string().optional().describe('Optional CSS selector to wait for before rendering'),
      delay_ms: z.number().optional().describe('Optional delay in milliseconds before rendering (max 5000)'),
      neural_implant: z.boolean().optional().describe('When true, implants a 64-D Int8 Neuro-Symbolic Spatial Cortex into the PDF so it can answer questions in ~1ms via ask_pdf or /brain/:docId'),
      neural_persona: z.string().optional().describe('Custom AI persona for the implanted Neural Cortex (e.g. "Nordisk Cloud Billing & SLA Concierge")'),
      neural_context: z.record(z.any()).optional().describe('Subconscious Latent Memory (unprinted policy rules, SLAs, discount terms, FAQs) implanted directly into the PDF Cortex'),
      neural_custom_url: z.string().url().optional().describe('Optional white-label URL for the clickable Neural Q&A button in the PDF'),
      neural_badge_label: z.string().optional().describe('Custom label for the clickable Neural Q&A button in the PDF'),
      embed_data: z.record(z.any()).optional().describe('Structured JSON payload to embed inside the Dual-Brain PDF catalog (tailprint-manifest.json) for 0ms zero-OCR extraction'),
      sign: z.boolean().optional().describe('When true, signs the PDF visual streams and data manifest with HMAC-SHA256 Cryptographic Proof-of-Origin'),
      verify_seal: z.boolean().optional().describe('When true, renders a clickable cryptographic verification seal on the PDF'),
    },
    async ({
      html,
      url,
      template_id,
      data,
      format,
      landscape,
      print_background,
      header_html,
      footer_html,
      password,
      wait_for,
      delay_ms,
      neural_implant,
      neural_persona,
      neural_context,
      neural_custom_url,
      neural_badge_label,
      embed_data,
      sign,
      verify_seal,
    }) => {
      try {
        if (template_id && (html || url)) {
          throw new Error('Provide only one of html, url or template_id.');
        }
        if (data !== undefined && !template_id) {
          throw new Error('"data" can only be be used together with template_id.');
        }
        const resolved = resolveTemplateRequest({ html, url, template_id, data });

        if (options.onUsage) {
          await options.onUsage('render_pdf');
        }

        const rawHtml = resolved.html || '';
        const hasCustomNeuralTag = /data-neural-button\b/i.test(rawHtml);
        const hasCustomVerifyTag = /data-verify-button\b/i.test(rawHtml);
        const enableNeural = Boolean(
          neural_implant || neural_persona || neural_context || neural_custom_url || hasCustomNeuralTag
        );
        const enableSign = Boolean(sign || verify_seal || hasCustomVerifyTag || enableNeural);
        const enableAiReady = Boolean(template_id || embed_data || enableNeural || enableSign);

        const rawBuffer = await browserService.renderPdf({
          html: resolved.html,
          url: resolved.url,
          format: format || 'A4',
          landscape: landscape || false,
          print_background: print_background !== false,
          header_html,
          footer_html,
          password,
          wait_for,
          delay_ms,
          neural_implant: enableNeural,
          neural_badge_label,
        } as any);

        let finalBuffer = rawBuffer;
        let docId: string | undefined;
        let brainUrl: string | undefined;
        let verifyUrl: string | undefined;

        if (!password && (enableAiReady || enableSign || enableNeural)) {
          const domSynapses = browserService.getExtractedDomSynapses(rawBuffer);
          const customButtons = browserService.getCustomButtonPlacement(rawBuffer);
          const enriched = await smartPdfService.enrichPdf(rawBuffer, {
            customerId: 'mcp_agent',
            templateId: template_id || null,
            data: embed_data || data || null,
            aiReady: enableAiReady,
            sign: enableSign,
            verifySeal: Boolean(verify_seal || hasCustomVerifyTag),
            neuralImplant: enableNeural,
            neuralPersona: neural_persona,
            neuralContext: neural_context,
            neuralCustomUrl: neural_custom_url,
            neuralBadgeLabel: neural_badge_label,
            hasCustomNeuralButton: customButtons?.hasCustomNeuralButton,
            hasCustomVerifyButton: customButtons?.hasCustomVerifyButton,
            domSynapses,
          });
          finalBuffer = enriched.buffer;
          docId = enriched.docId;
          brainUrl = enriched.cortex?.brain_url || `/brain/${enriched.docId}`;
          verifyUrl = enriched.manifest.verification_url;
        }

        const base64Pdf = finalBuffer.toString('base64');
        const sizeKb = (finalBuffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(finalBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: docId ? `${docId}.pdf` : 'rendered.pdf',
        });

        const extraLines = docId
          ? `\n🧠 **Document ID:** \`${docId}\`${enableNeural ? `\n🔮 **Interactive Neural Reader:** [https://tailprint.com${brainUrl}](https://tailprint.com${brainUrl})` : ''}\n🛡️ **Cryptographic Verifier:** [${verifyUrl}](${verifyUrl})`
          : '';

        return {
          content: [
            {
              type: 'text',
              text: `✅ **PDF successfully generated!** (${sizeKb} KB, ${format || 'A4'}${landscape ? ', Landscape' : ''}${enableNeural ? ', Neural-Implant 64-D Cortex' : ''}${password ? ', Encrypted' : ''})${extraLines}\n\n🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})\n*(Link hosted on Tailprint CDN, expires in 24 hours)*\n\nBase64 Data URI:\ndata:application/pdf;base64,${base64Pdf}`,
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

  // Tool 2: list_templates
  server.tool(
    'list_templates',
    'Returns the catalog of available pre-designed Tailwind CSS document templates (Invoices, EU Factur-X, Certificates, Executive Reports, Resumes, Shipping Labels, Event Passes, POS Receipts, Quotes, NDAs, Statements, Presentations, Contracts).',
    {},
    async () => {
      const templateList = DOCUMENT_TEMPLATES.map((t) => ({
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

  // Tool 3: get_template_source
  server.tool(
    'get_template_source',
    'Retrieves the full Tailwind CSS HTML source code of a document template by ID, allowing an AI agent to customize data and render it with render_pdf.',
    {
      template_id: z.enum(TEMPLATE_IDS).describe('Template identifier'),
    },
    async ({ template_id }) => {
      const template = DOCUMENT_TEMPLATES.find((t) => t.id === template_id);
      if (!template) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Template "${template_id}" not found. Available: ${DOCUMENT_TEMPLATES.map((t) => t.id).join(', ')}`,
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

  // Tool 4: render_template
  server.tool(
    'render_template',
    'Renders a pre-designed Tailwind CSS document template directly with optional variable data substitution. Ideal for generating invoices, receipts, contracts, and certificates without managing raw HTML markup.',
    {
      template_id: z.enum(TEMPLATE_IDS).describe('Template identifier to render'),
      variables: z.record(z.union([z.string(), z.number()])).optional().describe('Key-value pairs to replace in template HTML. Replaces {{key}} tags or exact text matches.'),
      output_format: z.enum(['pdf', 'png', 'jpeg']).optional().default('pdf').describe('Output format: "pdf" for documents (default: pdf)'),
      landscape: z.boolean().optional().describe('Orientation override (landscape: true or false)'),
      password: z.string().optional().describe('Optional AES-256 password to encrypt the PDF document'),
    },
    async ({ template_id, variables, output_format, landscape, password }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_template');
        }

        const template = DOCUMENT_TEMPLATES.find((t) => t.id === template_id);
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

  // Tool 5: stamp_pdf (PDF Watermark & Status Overlay)
  server.tool(
    'stamp_pdf',
    'Applies a diagonal semi-transparent watermark or status stamp (e.g. "CONFIDENTIAL", "DRAFT", "PROPRIETARY") across all pages of an existing vector PDF using pdf-lib.',
    {
      pdf_base64: z.string().describe('Base64-encoded PDF string (e.g. output from render_pdf or render_template)'),
      watermark_text: z.string().describe('Watermark text to stamp diagonally across each page (e.g. "CONFIDENTIAL", "DRAFT", "PROPRIETARY")'),
      opacity: z.number().optional().default(0.15).describe('Watermark opacity from 0.05 (subtle) to 0.5 (prominent) - default: 0.15'),
      color: z.enum(['red', 'gray', 'blue']).optional().default('red').describe('Watermark color: "red", "gray", or "blue" (default: "red")'),
      font_size: z.number().optional().default(54).describe('Font size of watermark text in points (default: 54)'),
    },
    async ({ pdf_base64, watermark_text, opacity, color, font_size }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('stamp_pdf');
        }

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

  // Tool 6: generate_einvoice
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

  // Helper to resolve a PDF from base64 string or remote URL
  async function resolvePdfBuffer(input: string): Promise<Buffer> {
    const trimmed = input.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const res = await fetch(trimmed);
      if (!res.ok) {
        throw new Error(`Failed to download PDF from URL: ${res.statusText}`);
      }
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
    const cleanBase64 = trimmed.replace(/^data:application\/pdf;base64,/, '').trim();
    return Buffer.from(cleanBase64, 'base64');
  }

  // Tool 7: merge_pdfs
  server.tool(
    'merge_pdfs',
    'Merges two or more PDF documents (supplied as base64 strings or public URLs) into a single unified vector PDF.',
    {
      pdfs: z.array(z.string()).min(2).describe('Array of at least 2 PDF inputs (base64 data URI or public http/https URLs) to merge in order'),
      output_filename: z.string().optional().default('merged.pdf').describe('Filename for the merged document (default: "merged.pdf")'),
    },
    async ({ pdfs, output_filename }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('merge_pdfs');
        }

        const buffers: Buffer[] = [];
        for (const input of pdfs) {
          const buf = await resolvePdfBuffer(input);
          buffers.push(buf);
        }

        const mergedBuffer = await pdfOperationsService.mergePdfs({ pdfBuffers: buffers });
        const sizeKb = (mergedBuffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(mergedBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: output_filename || 'merged.pdf',
        });

        const outputBase64 = mergedBuffer.toString('base64');

        return {
          content: [
            {
              type: 'text',
              text: [
                `✅ **Successfully merged ${pdfs.length} PDF documents!** (${sizeKb} KB)`,
                ``,
                `🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})`,
                `*(Link hosted on Tailprint CDN, expires in 24 hours)*`,
                ``,
                `Base64 Data URI:`,
                `data:application/pdf;base64,${outputBase64}`,
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
              text: `Error merging PDFs: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 8: split_pdf
  server.tool(
    'split_pdf',
    'Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10") from an existing PDF document into a new PDF.',
    {
      pdf: z.string().describe('Source PDF document as a base64 data URI or public http/https URL'),
      pages: z.string().describe('Comma-separated page numbers or ranges to extract (e.g. "1-3, 5, 8-10")'),
      output_filename: z.string().optional().default('split.pdf').describe('Output filename (default: "split.pdf")'),
    },
    async ({ pdf, pages, output_filename }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('split_pdf');
        }

        const inputBuffer = await resolvePdfBuffer(pdf);
        const splitBuffer = await pdfOperationsService.splitPdf({ pdfBuffer: inputBuffer, pages });
        const sizeKb = (splitBuffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(splitBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: output_filename || 'split.pdf',
        });

        const outputBase64 = splitBuffer.toString('base64');

        return {
          content: [
            {
              type: 'text',
              text: [
                `✅ **Successfully extracted pages (${pages}) into new PDF!** (${sizeKb} KB)`,
                ``,
                `🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})`,
                `*(Link hosted on Tailprint CDN, expires in 24 hours)*`,
                ``,
                `Base64 Data URI:`,
                `data:application/pdf;base64,${outputBase64}`,
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
              text: `Error splitting PDF: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 9: fill_pdf_form
  server.tool(
    'fill_pdf_form',
    'Fills interactive PDF forms (AcroForms) with text, numbers, or checkboxes, with optional form flattening.',
    {
      pdf: z.string().describe('Interactive PDF document as a base64 data URI or public http/https URL'),
      fields: z.record(z.union([z.string(), z.number(), z.boolean()])).describe('Key-value map of form field names to their values (e.g. {"client_name": "Acme", "agreed": true})'),
      flatten: z.boolean().optional().default(true).describe('Whether to flatten form fields to prevent further editing (default: true)'),
      output_filename: z.string().optional().default('filled_form.pdf').describe('Output filename (default: "filled_form.pdf")'),
    },
    async ({ pdf, fields, flatten, output_filename }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('fill_pdf_form');
        }

        const inputBuffer = await resolvePdfBuffer(pdf);
        const result = await pdfOperationsService.fillPdfForm({
          pdfBuffer: inputBuffer,
          fields,
          flatten: flatten ?? true,
        });

        const sizeKb = (result.buffer.byteLength / 1024).toFixed(1);

        const stored = await storageService.saveFile(result.buffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: output_filename || 'filled_form.pdf',
        });

        const outputBase64 = result.buffer.toString('base64');

        return {
          content: [
            {
              type: 'text',
              text: [
                `✅ **PDF form successfully filled!** (${sizeKb} KB)`,
                `- **Fields updated (${result.filledFields.length}):** ${result.filledFields.join(', ') || 'None'}`,
                `- **All available form fields (${result.availableFields.length}):** ${result.availableFields.join(', ')}`,
                `- **Flattened:** ${flatten ? 'Yes (read-only)' : 'No (interactive)'}`,
                ``,
                `🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})`,
                `*(Link hosted on Tailprint CDN, expires in 24 hours)*`,
                ``,
                `Base64 Data URI:`,
                `data:application/pdf;base64,${outputBase64}`,
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
              text: `Error filling PDF form: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 10: compress_pdf
  server.tool(
    'compress_pdf',
    'Compacts and shrinks PDF file size by bundling internal PDF objects into compressed streams and stripping duplicate structures.',
    {
      pdf: z.string().describe('Source PDF document as base64 data URI or public http/https URL'),
      output_filename: z.string().optional().default('compressed.pdf').describe('Output filename (default: "compressed.pdf")'),
    },
    async ({ pdf, output_filename }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('compress_pdf');
        }

        const inputBuffer = await resolvePdfBuffer(pdf);
        const compressedBuffer = await pdfOperationsService.compressPdf(inputBuffer);

        const origKb = (inputBuffer.byteLength / 1024).toFixed(1);
        const compKb = (compressedBuffer.byteLength / 1024).toFixed(1);
        const diffKb = (inputBuffer.byteLength - compressedBuffer.byteLength) / 1024;
        const savingsPercent = inputBuffer.byteLength > 0
          ? Math.max(0, Math.round(((inputBuffer.byteLength - compressedBuffer.byteLength) / inputBuffer.byteLength) * 100))
          : 0;

        const stored = await storageService.saveFile(compressedBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: output_filename || 'compressed.pdf',
        });

        const outputBase64 = compressedBuffer.toString('base64');

        return {
          content: [
            {
              type: 'text',
              text: [
                `✅ **PDF successfully compressed!**`,
                `- **Original Size:** ${origKb} KB`,
                `- **Compressed Size:** ${compKb} KB`,
                `- **Savings:** ${savingsPercent}% (${diffKb.toFixed(1)} KB reduced)`,
                ``,
                `🔗 **Direct Download Link:** [${stored.hostedUrl}](${stored.hostedUrl})`,
                `*(Link hosted on Tailprint CDN, expires in 24 hours)*`,
                ``,
                `Base64 Data URI:`,
                `data:application/pdf;base64,${outputBase64}`,
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
              text: `Error compressing PDF: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 11: render_presentation
  server.tool(
    'render_presentation',
    'Converts Markdown slides (separated by "---") into a widescreen 16:9 presentation vector PDF (1920x1080) with slide numbers and modern Tailwind styling. Returns an inline cover preview and hosted PDF link.',
    {
      markdown: z.string().describe('Markdown text containing slides separated by "---". Use "# Title" for slide header, "## Subtitle", and bullet points.'),
      title: z.string().optional().default('Executive Briefing').describe('Keynote or presentation title'),
      author: z.string().optional().default('Tailprint AI').describe('Author or presenter name'),
      theme: z.enum(['dark', 'midnight', 'gradient', 'minimal']).optional().default('dark').describe('Slide theme: "dark", "midnight", "gradient", or "minimal" (default: "dark")'),
    },
    async ({ markdown, title, author, theme }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('render_presentation');
        }

        const result = await presentationService.renderPresentation({
          markdown,
          title: title || 'Executive Briefing',
          author: author || 'Tailprint AI',
          theme: theme || 'dark',
        });

        const storedPdf = await storageService.saveFile(result.pdfBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: 'presentation.pdf',
        });

        const previewBase64 = result.previewImageBuffer.toString('base64');
        const sizeKb = (result.pdfBuffer.byteLength / 1024).toFixed(1);

        return {
          content: [
            {
              type: 'image',
              data: previewBase64,
              mimeType: 'image/png',
            },
            {
              type: 'text',
              text: [
                `🎯 **Widescreen 16:9 Presentation PDF Generated!** (${result.totalSlides} slides, ${sizeKb} KB)`,
                ``,
                `- **Title:** ${title || 'Executive Briefing'}`,
                `- **Presenter:** ${author || 'Tailprint AI'}`,
                `- **Theme:** ${theme || 'dark'} (1920×1080 Full-Bleed Vector PDF)`,
                `- **Cover Slide Preview:** Displayed inline above`,
                ``,
                `📥 **Download Complete Slide Deck (PDF):** [${storedPdf.hostedUrl}](${storedPdf.hostedUrl})`,
                `*(Link hosted on Tailprint CDN, expires in 24 hours)*`,
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
              text: `Error rendering presentation: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 12: verify_pdf (Dual-Brain Zero-OCR Extraction & Cryptographic Tamper Verification)
  server.tool(
    'verify_pdf',
    'Verifies the cryptographic HMAC-SHA256 signature and visual content fingerprint of a Tailprint PDF to detect tampering, and extracts its embedded Dual-Brain structured JSON payload in 0ms without OCR.',
    {
      pdf: z.string().describe('PDF document as a base64 string, base64 data URI, or public HTTP/HTTPS URL'),
    },
    async ({ pdf }) => {
      try {
        const pdfBuffer = await resolvePdfBuffer(pdf);
        const report = await smartPdfService.inspectAndVerifyPdf(pdfBuffer);

        return {
          content: [
            {
              type: 'text',
              text: [
                report.tampered
                  ? `🚨 **TAMPERING DETECTED — PDF Altered After Issuance**`
                  : report.valid
                    ? `✅ **Cryptographically Verified & Intact Tailprint PDF**`
                    : `ℹ️ **Standard / Unsigned PDF Document**`,
                ``,
                `- **Document ID:** \`${report.doc_id || 'N/A'}\``,
                `- **Signed:** \`${report.signed}\` (Signature Valid: \`${report.signature_valid}\`)`,
                `- **Tampered:** \`${report.tampered}\` (Content Intact: \`${report.content_intact}\`)`,
                `- **AI-Ready (Dual-Brain):** \`${report.ai_ready}\``,
                `- **Template:** \`${report.template_id || 'Custom HTML'}\``,
                `- **File SHA-256:** \`${report.file_sha256}\``,
                `- **Stream Fingerprint:** \`${report.content_fingerprint}\``,
                `- **Details:** ${(report.reasons || []).join(' | ')}`,
                ``,
                `### 🧠 Extracted Dual-Brain JSON Payload (0ms, Zero-OCR):`,
                '```json',
                JSON.stringify(report.data, null, 2),
                '```',
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
              text: `Error verifying/extracting PDF: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 13: ask_pdf (Sub-Millisecond Neuro-Symbolic PDF Cortex Q&A)
  server.tool(
    'ask_pdf',
    'Executes a sub-millisecond neuro-symbolic query against a Neural-Implant PDF Cortex (tailprint-cortex.json) by doc_id or PDF binary. Searches visual DOM synapses (returning exact page + x,y,w,h coordinates) and subconscious latent memory (neural_context) using 64-D Int8 Hyperdimensional Vectors.',
    {
      question: z.string().min(1).describe('Natural language question to ask the PDF Neural Cortex (e.g. "What is the early payment discount and how is GDPR handled?")'),
      doc_id: z.string().optional().describe('Tailprint Document ID (e.g. "doc_...") of a Neural-Implant PDF. Provide either doc_id or pdf.'),
      pdf: z.string().optional().describe('PDF document as a base64 string, base64 data URI, or public HTTP/HTTPS URL. Provide either doc_id or pdf.'),
    },
    async ({ question, doc_id, pdf }) => {
      try {
        if (!doc_id && !pdf) {
          throw new Error('Provide either "doc_id" or "pdf" to query the PDF Neural Cortex.');
        }

        let pdfBuffer: Buffer | undefined;
        if (pdf) {
          pdfBuffer = await resolvePdfBuffer(pdf);
        }

        const result = await smartPdfService.askPdf({
          pdfBuffer,
          docId: doc_id,
          question,
        });

        const topCitations = (result.citations || [])
          .slice(0, 3)
          .map(
            (c, i) =>
              `${i + 1}. **[${c.layer}] ${c.section}** (Score: ${c.score.toFixed(2)}${c.bbox ? `, Page ${c.bbox.page} @ [${c.bbox.x_pt}, ${c.bbox.y_pt}, ${c.bbox.w_pt}×${c.bbox.h_pt}pt]` : ''}):\n   > ${c.content}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: [
                `🧠 **Neural-Implant PDF Answer** (${result.execution_time_ms}ms • Confidence: ${Math.round(result.confidence * 100)}% • Primary Layer: \`${result.primary_source_layer}\`)`,
                ``,
                result.answer,
                ``,
                `### 📍 Cited Synapses & Spatial Coordinates:`,
                topCitations || 'No citations matched.',
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
              text: `Error querying PDF Neural Cortex: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 14: splice_pdfs (🧬 CRISPR-PDF™ Composable Genetic Document Splicing)
  server.tool(
    'splice_pdfs',
    'CRISPR-PDF™ Genetic Document Splicing Engine: Unlike dumb PDF page merging (merge_pdfs), splice_pdfs sequences 2 to 10 parent PDFs (or Tailprint doc_ids) into their chromosomes (Visual Exons, Dual-Brain Data Proteome, and Subconscious Latent Epigenome), excises Cas9 knockout terms, resolves cross-document conflicting clauses, applies point mutations, and expresses a newly typeset Vector Master Offspring PDF with a fused Multi-Parent 64-D Neural Cortex.',
    {
      pdfs: z
        .array(z.string().min(1))
        .min(2)
        .max(10)
        .describe('Array of 2 to 10 parent PDFs: each item can be a Tailprint doc_id (e.g. "doc_..."), a public HTTP/HTTPS URL, or a base64 PDF string'),
      title: z.string().optional().describe('Title of the synthesized Offspring Master PDF (e.g. "Master Enterprise Cloud & GDPR Agreement")'),
      subtitle: z.string().optional().describe('Subtitle displayed in the Offspring PDF header'),
      phenotype: z
        .enum(['executive-indigo', 'legal-contract', 'board-dossier'])
        .optional()
        .default('executive-indigo')
        .describe('Visual CSS phenotype applied when expressing the spliced genome into a vector PDF'),
      knockout_terms: z
        .array(z.string())
        .optional()
        .describe('CRISPR-Cas9 knockout terms: any visual section or latent clause matching these terms is cleanly excised from the Offspring PDF (e.g. ["Legacy Non-Compete", "auto_renewal_policy"])'),
      mutations: z
        .record(z.any())
        .optional()
        .describe('Point mutations (key-value overrides) injected into the Offspring proteome, epigenome, and visual exons (e.g. {"discount_rate": "25%", "governing_law": "Danish Law"})'),
      neural_persona: z.string().optional().describe('Custom AI persona for the fused Offspring Neural Cortex'),
      neural_custom_url: z.string().url().optional().describe('Optional white-label URL for the interactive <div data-neural-button></div> in the Offspring PDF'),
      verify_custom_url: z.string().url().optional().describe('Optional white-label URL for the interactive <div data-verify-button></div> in the Offspring PDF'),
    },
    async ({
      pdfs,
      title,
      subtitle,
      phenotype,
      knockout_terms,
      mutations,
      neural_persona,
      neural_custom_url,
      verify_custom_url,
    }) => {
      try {
        if (options.onUsage) {
          await options.onUsage('splice_pdfs');
        }

        const inputs = await Promise.all(
          pdfs.map(async (item, idx) => {
            const trimmed = item.trim();
            if (trimmed.startsWith('doc_')) {
              return { docId: trimmed, label: `Parent #${idx + 1} (${trimmed})` };
            }
            const pdfBuffer = await resolvePdfBuffer(trimmed);
            return { pdfBuffer, label: `Parent #${idx + 1}` };
          })
        );

        const result = await crisprPdfService.splicePdfs({
          inputs,
          title,
          subtitle,
          phenotype: phenotype || 'executive-indigo',
          knockout_terms,
          mutations,
          neural_persona,
          neural_custom_url,
          verify_custom_url,
          customer_id: 'mcp_crispr_agent',
        });

        const stored = await storageService.saveFile(result.pdfBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: `crispr-offspring-${result.report.offspring_doc_id}.pdf`,
        });

        const rep = result.report;
        const conflictsText =
          rep.conflicts_resolved.length > 0
            ? rep.conflicts_resolved
                .map(
                  (c) =>
                    `- **\`${c.locus}\`** (${c.layer}): \`${String(c.parent_a.value)}\` → **\`${String(c.resolved_value)}\`** [${c.resolution_strategy}]`
                )
                .join('\n')
            : '- None (all parent alleles were harmonious)';

        return {
          content: [
            {
              type: 'text',
              text: [
                `🧬 **CRISPR-PDF™ Offspring Master PDF Synthesized!**`,
                ``,
                `- **Offspring Document ID:** \`${rep.offspring_doc_id}\``,
                `- **Parents Sequenced:** ${rep.parent_count} (${rep.parents.map((p) => p.label).join(' + ')})`,
                `- **Visual Exons Expressed:** ${rep.total_exons_spliced} (Cas9 Knockouts Excised: ${rep.knockout_exons_excised}, Duplicates Excised: ${rep.duplicate_exons_excised})`,
                `- **Fused Neural Synapses:** ${rep.total_synapses_in_offspring}`,
                `- **Phenotype:** \`${rep.phenotype}\``,
                ``,
                `### ⚖️ Allele Conflicts Resolved (${rep.conflicts_resolved.length}):`,
                conflictsText,
                ``,
                `🔗 **Download Offspring PDF:** [${stored.hostedUrl}](${stored.hostedUrl})`,
                `🧠 **Ask Offspring Neural Cortex:** [https://tailprint.com${rep.brain_url}](https://tailprint.com${rep.brain_url})`,
                `🛡️ **Verify Lineage & Signature:** [${rep.verify_url}](${rep.verify_url})`,
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
              text: `Error splicing PDFs with CRISPR-PDF: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Tool 15: sequence_pdf_genome (🧬 CRISPR-PDF™ Chromosome Sequencer)
  server.tool(
    'sequence_pdf_genome',
    'Sequences 1 to 10 PDFs (or Tailprint doc_ids) into their constituent chromosomes: Visual Exons (sections, tables, callouts), Structured Data Proteome (Dual-Brain JSON alleles), and Subconscious Latent Epigenome (hidden neural_context clauses).',
    {
      pdfs: z
        .array(z.string().min(1))
        .min(1)
        .max(10)
        .describe('Array of 1 to 10 PDFs (Tailprint doc_id "doc_...", public HTTP/HTTPS URL, or base64 PDF string) to sequence'),
    },
    async ({ pdfs }) => {
      try {
        const genomes = await Promise.all(
          pdfs.map(async (item, idx) => {
            const trimmed = item.trim();
            if (trimmed.startsWith('doc_')) {
              return crisprPdfService.sequenceGenome({ docId: trimmed, label: `Parent #${idx + 1}` }, idx);
            }
            const pdfBuffer = await resolvePdfBuffer(trimmed);
            return crisprPdfService.sequenceGenome({ pdfBuffer, label: `Parent #${idx + 1}` }, idx);
          })
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: genomes.length, genomes }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error sequencing PDF genome: ${err.message || 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // ==========================================
  // MCP RESOURCES
  // ==========================================

  // Resource 1: Complete catalog of document templates
  server.resource(
    'templates-catalog',
    'tailprint://templates/catalog',
    { description: 'Complete catalog of all available Tailwind CSS PDF document templates', mimeType: 'application/json' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            DOCUMENT_TEMPLATES.map((t) => ({
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
    { description: 'Developer guide for crafting pixel-perfect, print-ready PDF documents with Tailwind CSS', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            '# Tailprint Guide: Crafting Beautiful Documents with Tailwind CSS',
            '',
            'Tailprint combines headless Chromium with full Tailwind CSS utility classes and Smart Pagination Shield.',
            '',
            '## Page Sizing & Container Dimensions',
            '- **A4 Portrait:** Set root element to `class="w-[210mm] min-h-[297mm] p-10 bg-white text-slate-800"`',
            '- **A4 Landscape:** Set root element to `class="w-[297mm] min-h-[210mm] p-10 bg-white text-slate-800"`',
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

  // Resource 3: Smart Pagination & Zero-Retention Guide
  server.resource(
    'smart-pagination-guide',
    'tailprint://docs/smart-pagination',
    { description: 'Technical specifications of Smart Pagination Shield and Zero-Retention security in Tailprint', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            '# Smart Pagination & Table Split Shield Guide',
            '',
            'Tailprint features automated PDF pagination protection and zero-retention privacy.',
            '',
            '## Automatic Protection Rules (smart_pagination: true)',
            '1. **Repeating Table Headers:** When a `<table>` spans multiple pages, `<thead>` is automatically repeated at the top of every subsequent printed page (`display: table-header-group;`).',
            '2. **TableRow Integrity:** Table rows (`<tr>`, `<td>`, `<th>`) are shielded with `break-inside: avoid;` to prevent text splitting halfway across page boundaries.',
            '3. **Orphan Header Shield:** Heading tags (`<h1>` to `<h6>`) are prevented from being stranded at the bottom of a page without content (`break-after: avoid;`).',
            '4. **Headless Table Conversion:** If an HTML table lacks a `<thead>` element, Tailprint automatically detects header cells and converts the first row into a semantic `<thead>`.',
            '',
            '## Zero-Retention Mode (no_store: true)',
            '- Omits CDN file persistence entirely.',
            '- Renders vector PDF in transient Chromium memory.',
            '- Completely bypasses Redis SHA-256 caching.',
            '- Emits `X-Tailprint-Zero-Retention: active` HTTP header.',
            '- Guaranteed GDPR / HIPAA compliance for sensitive medical and financial data.',
          ].join('\n'),
        },
      ],
    })
  );

  // Resource 4: All Templates Complete Source Bundle
  server.resource(
    'templates-all',
    'tailprint://templates/all',
    { description: 'Complete source bundle of all PDF document templates with HTML markup and metadata', mimeType: 'application/json' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(DOCUMENT_TEMPLATES, null, 2),
        },
      ],
    })
  );

  // Resources 5..N: Static template resources for every document template
  for (const t of DOCUMENT_TEMPLATES) {
    server.resource(
      `template-${t.id}`,
      `tailprint://templates/${t.id}`,
      { description: `${t.title} (${t.category}) HTML document template with Tailwind CSS`, mimeType: 'text/html' },
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

  // Prompt 2: Generate B2B Hybrid E-Invoice (Factur-X / ZUGFeRD)
  server.prompt(
    'generate_b2b_invoice',
    'Generates a legally compliant European hybrid electronic invoice (Factur-X / ZUGFeRD / EN 16931) with embedded machine-readable XML',
    {
      seller_name: z.string().describe('Supplier or seller company name'),
      buyer_name: z.string().describe('Customer or buyer company name'),
      invoice_number: z.string().describe('Invoice identifier (e.g. "INV-2026-0042")'),
      line_items_summary: z.string().describe('Description of line items, quantity, unit price, and VAT rate'),
      currency: z.string().optional().describe('3-letter currency code (e.g. EUR, DKK, USD) - default EUR'),
      iban: z.string().optional().describe('Bank wire transfer IBAN'),
    },
    async ({ seller_name, buyer_name, invoice_number, line_items_summary, currency, iban }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please issue an EU-compliant hybrid Factur-X / ZUGFeRD e-invoice with embedded XML:\n- Seller: ${seller_name}\n- Buyer: ${buyer_name}\n- Invoice Number: ${invoice_number}\n- Items: ${line_items_summary}\n- Currency: ${currency || 'EUR'}\n${iban ? `- Payment IBAN: ${iban}\n` : ''}\nUse the Tailprint "generate_einvoice" tool to generate the hybrid PDF with CrossIndustryInvoice XML metadata for ERP systems (DATEV, SAP, Dinero, Billy).`,
            },
          },
        ],
      };
    }
  );

  return server;
}
