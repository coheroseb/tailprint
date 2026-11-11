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
    expect(toolNames).toContain('render_template');

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
    expect(parsedList.some((t: any) => t.id === 'ticket')).toBe(true);
    expect(parsedList.some((t: any) => t.id === 'receipt')).toBe(true);

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

  it('executes render_image tool and returns inline image content block', async () => {
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
    // Check for inline image content block for rich MCP clients
    const imgBlock = imageRes.content.find((c: any) => c.type === 'image');
    expect(imgBlock).toBeDefined();
    expect(imgBlock.mimeType).toBe('image/png');
    expect(imgBlock.data.length).toBeGreaterThan(100);

    // Check for text block with summary and data URI
    const textBlock = imageRes.content.find((c: any) => c.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock.text).toContain('data:image/png;base64,');

    await client.close();
    await server.close();
  });

  it('executes render_template tool with data variables', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // Test render_template for PDF
    const renderRes = (await client.callTool({
      name: 'render_template',
      arguments: {
        template_id: 'invoice',
        variables: {
          'INV-2024-001': 'INV-2026-999',
          'Acme Corp': 'Global Dynamics LLC',
        },
        output_format: 'pdf',
      },
    })) as any;

    expect(renderRes.isError).toBeFalsy();
    expect(renderRes.content[0].text).toContain('data:application/pdf;base64,');
    expect(renderRes.content[0].text).toContain('rendered to PDF');

    await client.close();
    await server.close();
  });

  it('lists and reads MCP Resources (templates & guide)', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // List resources
    const resourceList = await client.listResources();
    const uris = resourceList.resources.map((r) => r.uri);

    expect(uris).toContain('tailprint://templates/catalog');
    expect(uris).toContain('tailprint://docs/tailwind-guide');
    expect(uris).toContain('tailprint://templates/invoice');
    expect(uris).toContain('tailprint://templates/ticket');

    // Read templates catalog resource
    const catalogResource = await client.readResource({ uri: 'tailprint://templates/catalog' });
    expect(catalogResource.contents.length).toBeGreaterThan(0);
    const parsedCatalog = JSON.parse((catalogResource.contents[0] as any).text);
    expect(Array.isArray(parsedCatalog)).toBe(true);

    // Read tailwind guide resource
    const guideResource = await client.readResource({ uri: 'tailprint://docs/tailwind-guide' });
    expect((guideResource.contents[0] as any).text).toContain('Tailprint Guide');

    await client.close();
    await server.close();
  });

  it('lists and executes MCP Prompts (workflows)', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // List prompts
    const promptList = await client.listPrompts();
    const promptNames = promptList.prompts.map((p) => p.name);

    expect(promptNames).toContain('generate_invoice');
    expect(promptNames).toContain('summarize_url_to_pdf');
    expect(promptNames).toContain('create_social_card');

    // Execute generate_invoice prompt
    const promptResult = await client.getPrompt({
      name: 'generate_invoice',
      arguments: {
        client_name: 'Stark Industries',
        invoice_number: 'INV-STARK-01',
        items_description: 'Arc Reactor Consult - $50,000',
        total_amount: '$50,000.00',
      },
    });

    expect(promptResult.messages.length).toBe(1);
    expect((promptResult.messages[0].content as any).text).toContain('Stark Industries');
    expect((promptResult.messages[0].content as any).text).toContain('render_template');

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
