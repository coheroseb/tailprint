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
      description: 'Converts HTML with Tailwind CSS classes or a public web URL into a vector PDF. Automatically saves to CDN and returns both a clickable download link and base64.',
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
      name: 'render_image',
      category: 'Graphics & Open Graph',
      description: 'Generates an optimized PNG or JPEG social preview card / Open Graph banner from Tailwind CSS. Returns an inline MCP image block + hosted CDN link.',
      outputType: 'image/png or image/jpeg (inline image + hosted URL)',
      arguments: {
        html: 'string (optional) - HTML with Tailwind CSS classes',
        url: 'string (optional) - Public web URL to capture',
        width: 'number (default: 1200) - Viewport width in px',
        height: 'number (default: 630) - Viewport height in px',
        type: '"png" | "jpeg" (default: "png")',
        delay_ms: 'number (optional) - Delay before capture',
      },
      examplePrompt: 'Generate a modern dark 1200x630 Open Graph card for my new blog post.',
    },
    {
      name: 'render_chart',
      category: 'Data Visualization',
      description: 'Compiles Chart.js options into a high-DPI image (bar, line, radar, doughnut, polarArea) in light or dark themes. Returns an inline MCP image block + hosted CDN link.',
      outputType: 'image/png (inline image + hosted URL)',
      arguments: {
        type: '"bar" | "line" | "doughnut" | "pie" | "radar" | "polarArea"',
        labels: 'string[] - Axis category labels',
        datasets: 'array of { label, data, backgroundColor?, borderColor? }',
        title: 'string (optional) - Chart headline',
        theme: '"dark" | "light" (default: "dark")',
        width: 'number (default: 1000)',
        height: 'number (default: 600)',
      },
      examplePrompt: 'Plot our monthly MRR growth vs burn rate for the last 6 months as a dark dual bar chart.',
    },
    {
      name: 'generate_qr',
      category: 'Utilities & Identification',
      description: 'Generates mathematically verified, scannable QR codes and barcodes with custom error correction (L/M/Q/H) in light or dark themes. Returns an inline MCP image block.',
      outputType: 'image/png or image/svg+xml (inline image + hosted URL)',
      arguments: {
        text: 'string - Content or target URL to encode',
        format: '"png" | "svg" (default: "png")',
        width: 'number (default: 512)',
        error_correction: '"L" | "M" | "Q" | "H" (default: "M")',
        dark_color: 'string (default: "#090d16")',
        light_color: 'string (default: "#ffffff")',
      },
      examplePrompt: 'Generate a scannable high-resolution QR code pointing to https://tailprint.com/dashboard with dark theme.',
    },
    {
      name: 'render_device_mockup',
      category: 'Marketing & Presentation',
      description: 'Captures any public website URL across parallel viewports and wraps it into a photorealistic MacBook Pro + floating iPhone 16 studio mockup canvas.',
      outputType: 'image/png (inline image + hosted URL)',
      arguments: {
        url: 'string - Public website URL to showcase',
        title: 'string (optional) - Studio banner label',
        delay_ms: 'number (default: 500)',
      },
      examplePrompt: 'Create a showcase device mockup of https://tailprint.com on a MacBook Pro and iPhone 16.',
    },
    {
      name: 'stamp_pdf',
      category: 'Compliance & Security',
      description: 'Applies a diagonal semi-transparent watermark or compliance stamp (e.g. "CONFIDENTIAL", "DRAFT", "FORTROLIGT") across all pages of an existing vector PDF using pdf-lib.',
      outputType: 'application/pdf (hosted URL + base64)',
      arguments: {
        pdf_base64: 'string - Base64 encoded PDF string',
        watermark_text: 'string - Watermark text to stamp diagonally',
        opacity: 'number (default: 0.15) - Opacity from 0.05 to 0.5',
        color: '"red" | "gray" | "blue" (default: "red")',
        font_size: 'number (default: 54)',
      },
      examplePrompt: 'Stamp this contract PDF with a diagonal semi-transparent "FORTROLIGT / CONFIDENTIAL" watermark.',
    },
    {
      name: 'compare_snapshots',
      category: 'Quality Assurance & CI/CD',
      description: 'Performs pixel-by-pixel visual regression testing between two URLs, HTML versions, or screenshots with pixelmatch. Returns a 3-panel studio comparison canvas with a neon-pink diff heatmap.',
      outputType: 'image/png (inline image + hosted URL)',
      arguments: {
        before_url: 'string (optional) - Baseline URL before changes',
        after_url: 'string (optional) - Modified URL after changes',
        before_html: 'string (optional) - Baseline HTML',
        after_html: 'string (optional) - Modified HTML',
        width: 'number (default: 1200)',
        height: 'number (default: 800)',
        threshold: 'number (default: 0.1)',
      },
      examplePrompt: 'Compare our staging homepage against production to verify no breaking CSS regressions or layout shifts.',
    },
    {
      name: 'render_carousel',
      category: 'Social Media & Marketing',
      description: 'Generates high-converting multi-slide social media carousels (1080x1350 px, 4:5 portrait) for LinkedIn (multi-page PDF) and Instagram/Twitter (PNG). Accepts markdown or structured slides.',
      outputType: 'application/pdf + image/png (hosted URLs + inline preview)',
      arguments: {
        title: 'string (optional) - Carousel title',
        author_name: 'string (default: "Tailprint Insights")',
        author_handle: 'string (default: "@tailprint")',
        theme: '"dark" | "light" | "emerald" | "gradient" (default: "dark")',
        markdown: 'string (optional) - Markdown with slides separated by "---"',
        slides: 'array of { headline, content, tag?, takeaway? }',
      },
      examplePrompt: 'Turn my blog post into a 5-slide portrait carousel PDF for LinkedIn with dark theme and swipe arrows.',
    },
    {
      name: 'scrape_markdown',
      category: 'AI Data Ingestion',
      description: 'Scrapes any public web URL, eliminates ads, popups, and cookie walls, and converts the core content into clean, structured Markdown for LLMs with 90%+ context savings.',
      outputType: 'text/markdown',
      arguments: {
        url: 'string - Public web URL to scrape',
        wait_for: 'string (optional) - CSS selector to wait for',
        delay_ms: 'number (optional) - Delay before scraping in ms',
      },
      examplePrompt: 'Scrape this 15-page documentation page and give me clean markdown without navigation chrome.',
    },
    {
      name: 'render_template',
      category: 'Template Automation',
      description: 'Renders pre-designed, battle-tested Tailwind CSS templates directly with optional data variable substitution (e.g. {{customer_name}}, {{total}}).',
      outputType: 'application/pdf or image/png',
      arguments: {
        template_id: '"invoice" | "certificate" | "report" | "resume" | "og-card" | "shipping-label" | "ticket" | "receipt"',
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
      description: 'Lists all available pre-designed templates in the Tailprint catalog with format, dimensions, and description.',
      outputType: 'application/json',
      arguments: {},
      examplePrompt: 'What document templates are available?',
    },
    {
      name: 'get_template_source',
      category: 'Template Automation',
      description: 'Retrieves the complete Tailwind CSS HTML source code of any template, allowing an LLM to inspect or modify the markup before rendering.',
      outputType: 'text/html',
      arguments: {
        template_id: '"invoice" | "certificate" | "report" | "resume" | "og-card" | "shipping-label" | "ticket" | "receipt"',
      },
      examplePrompt: 'Give me the HTML source of the invoice template so I can customize the table headers.',
    },
  ];

  // GET /v1/mcp/tools - Comprehensive Tool Catalog & Documentation
  fastify.get(
    '/v1/mcp/tools',
    {
      schema: {
        tags: ['MCP'],
        summary: 'List All 12 Model Context Protocol (MCP) Tools & Schemas',
        description: 'Returns the full catalog of 12 native MCP tools supported by Tailprint, including argument definitions, output types, and real-world prompt examples for Claude Desktop, Cursor, and autonomous agents.',
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
