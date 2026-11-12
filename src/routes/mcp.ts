import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from '../mcp/server.js';
import { redisService } from '../services/redis.js';
import { env } from '../config/env.js';

interface McpSession {
  transport: SSEServerTransport;
  token: string;
  monthlyLimit: number;
}

export const mcpRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Store active sessions by sessionId
  const sessions = new Map<string, McpSession>();

  // Helper to authenticate request
  async function resolveApiKey(request: any): Promise<{ token: string; monthlyLimit: number } | null> {
    const authHeader = request.headers.authorization;
    const queryKey = (request.query as any)?.api_key;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (typeof queryKey === 'string' && queryKey.trim()) {
      token = queryKey.trim();
    } else if (env.NODE_ENV === 'development') {
      token = env.DEV_DEFAULT_API_KEY || 'sec_live_dev_test_key_12345';
    }

    if (!token) {
      return null;
    }

    const apiKey = await redisService.getApiKey(token);
    if (!apiKey || apiKey.status !== 'active') {
      return null;
    }

    return { token, monthlyLimit: apiKey.monthly_limit };
  }

  // GET /v1/mcp/sse - Establish Server-Sent Events MCP channel
  const sseHandler = async (request: any, reply: any) => {
    const auth = await resolveApiKey(request);
    if (!auth) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Valid API key required via "Authorization: Bearer <KEY>" or "?api_key=<KEY>".',
      });
    }

    // Hijack Fastify reply to manage SSE connection directly via Node raw stream
    reply.hijack();

    // The messages endpoint that this SSE transport will direct clients to
    const messagesEndpoint = request.url.startsWith('/v1') ? '/v1/mcp/messages' : '/mcp/messages';
    const transport = new SSEServerTransport(messagesEndpoint, reply.raw);

    const mcpServer = createMcpServer({
      name: 'tailprint-mcp',
      version: '1.0.0',
      onUsage: async (_toolName) => {
        // Enforce quota usage on every tool execution
        const quota = await redisService.incrementAndCheckQuota(auth.token, auth.monthlyLimit);
        if (!quota.allowed) {
          throw new Error(`Monthly quota limit of ${quota.limit} renders exceeded. Please upgrade your plan.`);
        }
      },
    });

    const sessionId = transport.sessionId;
    sessions.set(sessionId, {
      transport,
      token: auth.token,
      monthlyLimit: auth.monthlyLimit,
    });

    transport.onclose = () => {
      sessions.delete(sessionId);
    };

    await mcpServer.connect(transport);
  };

  // POST /v1/mcp/messages - Client message receiver
  const messagesHandler = async (request: any, reply: any) => {
    const sessionId = (request.query as any)?.sessionId;
    if (!sessionId || !sessions.has(sessionId)) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `MCP session "${sessionId}" not found or expired.`,
      });
    }

    const session = sessions.get(sessionId)!;
    reply.hijack();
    await session.transport.handlePostMessage(request.raw, reply.raw, request.body);
  };

  // Tools Catalog schema for OpenAPI docs
  const ToolCatalogItemSchema = z.object({
    name: z.string().describe('Tool identifier for JSON-RPC MCP calls'),
    category: z.string().describe('Functional category'),
    description: z.string().describe('Detailed tool behavior and capabilities'),
    outputType: z.string().describe('Type of response returned (inline image, hosted PDF link, text)'),
    arguments: z.record(z.string()).describe('Accepted argument types and defaults'),
    examplePrompt: z.string().describe('Real-world conversational prompt for Claude or Cursor'),
  });

  const MCP_TOOLS_CATALOG: Array<{
    name: string;
    category: string;
    description: string;
    outputType: string;
    arguments: Record<string, string>;
    examplePrompt: string;
  }> = [
    {
      name: 'render_pdf',
      category: 'Document Generation',
      description: 'Converts HTML with Tailwind CSS classes or a public web URL into a vector PDF with Smart Pagination Shield. Automatically saves to CDN and returns both a clickable download link and base64.',
      outputType: 'application/pdf (CDN hosted URL + base64)',
      arguments: {
        html: 'string (optional) - Raw HTML with Tailwind utility classes',
        url: 'string (optional) - Public web URL to render directly',
        format: '"A4" | "Letter" (default: "A4")',
        landscape: 'boolean (default: false)',
        print_background: 'boolean (default: true)',
        header_html: 'string (optional) - Page header template',
        footer_html: 'string (optional) - Page footer template',
        password: 'string (optional) - AES-256 PDF encryption password',
        delay_ms: 'number (optional) - Render delay in milliseconds',
      },
      examplePrompt: 'Read this financial data and generate an executive 1-page PDF summary with benchmark bars.',
    },
    {
      name: 'generate_einvoice',
      category: 'Compliance & E-Invoicing',
      description: 'Generates an EU-compliant hybrid electronic invoice (Factur-X / ZUGFeRD 2.2 / EN 16931). Produces a Tailwind A4 PDF with embedded CrossIndustryInvoice XML (/EmbeddedFiles) for direct automated ingestion by ERP & accounting platforms (DATEV, SAP, Chorus Pro, Dinero, Billy).',
      outputType: 'application/pdf (hosted CDN URL + XML data)',
      arguments: {
        invoice_number: 'string - Unique invoice identifier (e.g. "INV-2026-0042")',
        seller_name: 'string - Supplier company name',
        seller_vat_id: 'string (optional) - Supplier VAT ID (e.g. "DK12345678")',
        seller_country: 'string (default: "DK") - 2-letter ISO country code',
        buyer_name: 'string - Customer company name',
        buyer_vat_id: 'string (optional) - Buyer VAT ID',
        buyer_country: 'string (default: "DE") - 2-letter ISO country code',
        line_items: 'array of { name, quantity, unit_price, vat_rate? }',
        currency: 'string (default: "EUR") - 3-letter currency code (e.g. EUR, DKK)',
        due_date: 'string (optional) - Due date in YYYY-MM-DD',
        payment_iban: 'string (optional) - Bank IBAN for wire transfer',
        payment_bic: 'string (optional) - Bank SWIFT/BIC code',
        profile: '"BASIC" | "EN16931" (default: "BASIC")',
      },
      examplePrompt: 'Issue an EU-compliant Factur-X e-invoice to BMW AG for 40 hours consulting at 150 EUR/hr with 25% VAT and my IBAN.',
    },
    {
      name: 'render_template',
      category: 'Template Automation',
      description: 'Renders pre-designed, battle-tested Tailwind CSS document templates directly with optional data variable substitution (e.g. {{customer_name}}, {{total}}).',
      outputType: 'application/pdf',
      arguments: {
        template_id: '"invoice" | "certificate" | "report" | "resume" | "shipping-label" | "ticket" | "receipt" | "quote" | "nda" | "statement" | "einvoice" | "presentation" | "contract"',
        variables: 'record of string/number values to substitute in template',
        output_format: '"pdf" | "png" | "jpeg" (default: "pdf")',
        landscape: 'boolean (optional)',
        password: 'string (optional)',
      },
      examplePrompt: 'Generate a PDF invoice for Acme Corp with 15h engineering at $150/hr using template invoice.',
    },
    {
      name: 'list_templates',
      category: 'Template Automation',
      description: 'Lists all available pre-designed document templates in the Tailprint catalog with format, dimensions, and description.',
      outputType: 'application/json',
      arguments: {},
      examplePrompt: 'What PDF document templates are available?',
    },
    {
      name: 'get_template_source',
      category: 'Template Automation',
      description: 'Retrieves the complete Tailwind CSS HTML source code of any document template, allowing an LLM to inspect or modify the markup before rendering.',
      outputType: 'text/html',
      arguments: {
        template_id: '"invoice" | "certificate" | "report" | "resume" | "shipping-label" | "ticket" | "receipt" | "quote" | "nda" | "statement" | "einvoice" | "presentation" | "contract"',
      },
      examplePrompt: 'Give me the HTML source of the invoice template so I can customize the table headers.',
    },
    {
      name: 'stamp_pdf',
      category: 'Compliance & Security',
      description: 'Applies a diagonal semi-transparent watermark or compliance stamp (e.g. "CONFIDENTIAL", "DRAFT", "PROPRIETARY") across all pages of an existing vector PDF using pdf-lib.',
      outputType: 'application/pdf (hosted URL + base64)',
      arguments: {
        pdf_base64: 'string - Base64 encoded PDF string',
        watermark_text: 'string - Watermark text to stamp diagonally',
        opacity: 'number (default: 0.15) - Opacity from 0.05 to 0.5',
        color: '"red" | "gray" | "blue" (default: "red")',
        font_size: 'number (default: 54)',
      },
      examplePrompt: 'Stamp this contract PDF with a diagonal semi-transparent "CONFIDENTIAL" watermark.',
    },
    {
      name: 'merge_pdfs',
      category: 'Document Management',
      description: 'Merges two or more PDF documents (supplied as base64 strings or public URLs) into a single unified vector PDF. Returns CDN download URL + base64 data URI.',
      outputType: 'application/pdf (hosted URL + base64)',
      arguments: {
        pdfs: 'string[] (min: 2) - Array of base64 data URIs or public http/https URLs to merge',
        output_filename: 'string (default: "merged.pdf")',
      },
      examplePrompt: 'Merge this quote PDF with our standard terms and conditions PDF into a single customer contract.',
    },
    {
      name: 'split_pdf',
      category: 'Document Management',
      description: 'Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10") from an existing PDF document into a new PDF.',
      outputType: 'application/pdf (hosted URL + base64)',
      arguments: {
        pdf: 'string - Source PDF document as base64 data URI or public http/https URL',
        pages: 'string - Comma-separated page numbers or ranges (e.g. "1-3, 5, 8-10")',
        output_filename: 'string (default: "split.pdf")',
      },
      examplePrompt: 'Extract pages 1 through 3 from this 50-page annual report PDF.',
    },
    {
      name: 'fill_pdf_form',
      category: 'Document Management',
      description: 'Fills interactive PDF forms (AcroForms) with text, numbers, or checkboxes, with optional form flattening to lock values.',
      outputType: 'application/pdf (hosted URL + base64)',
      arguments: {
        pdf: 'string - Interactive PDF document as base64 data URI or public http/https URL',
        fields: 'record of string, number, or boolean - Field values to populate',
        flatten: 'boolean (default: true) - Flatten form to make it read-only',
        output_filename: 'string (default: "filled_form.pdf")',
      },
      examplePrompt: 'Fill this IRS W-9 form with our corporate tax info and flatten it.',
    },
    {
      name: 'compress_pdf',
      category: 'Document Management',
      description: 'Compacts and shrinks PDF file size by bundling internal objects into compressed streams and stripping duplicate structures.',
      outputType: 'application/pdf (hosted URL + base64)',
      arguments: {
        pdf: 'string - Source PDF document as base64 data URI or public http/https URL',
        output_filename: 'string (default: "compressed.pdf")',
      },
      examplePrompt: 'Compress this 15MB scanned document PDF so it can be emailed under the 5MB mail limit.',
    },
    {
      name: 'render_presentation',
      category: 'Presentations & Slides',
      description: 'Converts Markdown slides (separated by "---") into a widescreen 16:9 presentation vector PDF (1920x1080) with slide numbers and modern Tailwind styling. Returns inline cover slide preview and hosted PDF link.',
      outputType: 'application/pdf + image/png (hosted PDF + inline preview)',
      arguments: {
        markdown: 'string - Markdown slides separated by "---"',
        title: 'string (default: "Executive Briefing") - Keynote title',
        author: 'string (default: "Tailprint AI") - Presenter name',
        theme: '"dark" | "midnight" | "gradient" | "minimal" (default: "dark")',
      },
      examplePrompt: 'Convert this quarterly roadmap into a 5-slide dark 16:9 presentation PDF for our board meeting.',
    },
  ];

  // GET /v1/mcp/tools - Comprehensive Tool Catalog & Documentation
  fastify.get(
    '/v1/mcp/tools',
    {
      schema: {
        tags: ['MCP'],
        summary: 'List All 11 Model Context Protocol (MCP) PDF & Document Tools & Schemas',
        description: 'Returns the full catalog of 11 native PDF & Document MCP tools supported by Tailprint, including argument definitions, output types, and real-world prompt examples for Claude Desktop, Cursor, and autonomous agents.',
        response: {
          200: z.object({
            totalTools: z.number().describe('Number of registered tools'),
            protocolVersion: z.string().describe('MCP Specification version'),
            transportSupport: z.array(z.string()).describe('Supported transport mechanisms'),
            tools: z.array(ToolCatalogItemSchema),
          }),
        },
      },
    },
    async (_request, reply) => {
      return reply.code(200).send({
        totalTools: MCP_TOOLS_CATALOG.length,
        protocolVersion: '2024-11-05',
        transportSupport: ['stdio (local CLI)', 'SSE (Remote Cloud via /v1/mcp/sse)'],
        tools: MCP_TOOLS_CATALOG,
      });
    }
  );

  // Register Canonical Endpoints
  fastify.get(
    '/v1/mcp/sse',
    {
      schema: {
        tags: ['MCP'],
        summary: 'Establish Remote MCP Server-Sent Events (SSE) Stream',
        description: 'Connects AI clients (Claude Desktop, Cursor, ChatGPT Actions) directly via the Model Context Protocol over SSE.',
        querystring: z.object({
          api_key: z.string().optional().describe('Optional API key query parameter (alternative to Authorization Bearer header)'),
        }),
      },
    },
    sseHandler
  );

  fastify.post(
    '/v1/mcp/messages',
    {
      schema: {
        tags: ['MCP'],
        summary: 'Send MCP Messages to Active SSE Session',
        description: 'Receives JSON-RPC messages from connected MCP clients for an active session.',
        querystring: z.object({
          sessionId: z.string().describe('The session ID returned during the SSE initialization handshake'),
        }),
      },
    },
    messagesHandler
  );

  // Short URL aliases
  fastify.get('/mcp/sse', { schema: { hide: true } }, sseHandler);
  fastify.post('/mcp/messages', { schema: { hide: true } }, messagesHandler);
};
