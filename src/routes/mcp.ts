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
      name: 'renderengine-cloud-mcp',
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
