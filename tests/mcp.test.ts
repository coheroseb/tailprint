import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createMcpServer } from '../src/mcp/server.js';
import { buildApp } from '../src/server.js';
import { browserService } from '../src/services/browser.js';
import type { FastifyInstance } from 'fastify';

describe('Tailprint Model Context Protocol (MCP) Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await browserService.close();
  });

  it('lists all registered MCP tools correctly', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain('scrape_markdown');
    expect(toolNames).toContain('render_pdf');
    expect(toolNames).toContain('render_image');
    expect(toolNames).toContain('list_templates');
    expect(toolNames).toContain('get_template_source');

    await client.close();
    await server.close();
  });

  it('executes list_templates and get_template_source tools', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // Test list_templates
    const templatesRes = (await client.callTool({
      name: 'list_templates',
      arguments: {},
    })) as any;
    expect(templatesRes.isError).toBeFalsy();
    const parsedList = JSON.parse(templatesRes.content[0].text);
    expect(Array.isArray(parsedList)).toBe(true);
    expect(parsedList.some((t: any) => t.id === 'invoice')).toBe(true);

    // Test get_template_source
    const invoiceRes = (await client.callTool({
      name: 'get_template_source',
      arguments: { template_id: 'invoice' },
    })) as any;
    expect(invoiceRes.isError).toBeFalsy();
    expect(invoiceRes.content[0].text).toContain('Invoice');

    await client.close();
    await server.close();
  });

  it('executes render_image tool to return a base64 image', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const imageRes = (await client.callTool({
      name: 'render_image',
      arguments: {
        html: '<div class="p-8 bg-blue-600 text-white font-bold text-2xl">MCP Generated Card</div>',
        width: 600,
        height: 315,
        type: 'png',
      },
    })) as any;

    expect(imageRes.isError).toBeFalsy();
    expect(imageRes.content[0].text).toContain('data:image/png;base64,');
    expect(imageRes.content[0].text).toContain('600x315');

    await client.close();
    await server.close();
  });

  it('rejects unauthenticated GET /v1/mcp/sse when no key is provided in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/mcp/sse',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('Unauthorized');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
