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
    expect(toolNames).toContain('render_chart');
    expect(toolNames).toContain('generate_qr');
    expect(toolNames).toContain('render_device_mockup');
    expect(toolNames).toContain('stamp_pdf');
    expect(toolNames).toContain('compare_snapshots');
    expect(toolNames).toContain('render_carousel');
    expect(toolNames).toContain('generate_einvoice');
    expect(toolNames.length).toBe(13);

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

  it('executes render_chart tool to return inline chart image', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const chartRes = (await client.callTool({
      name: 'render_chart',
      arguments: {
        type: 'bar',
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ label: 'Sales', data: [100, 250, 400] }],
        title: 'Q1 Growth',
        theme: 'dark',
        width: 800,
        height: 500,
      },
    })) as any;

    expect(chartRes.isError).toBeFalsy();
    const imgBlock = chartRes.content.find((c: any) => c.type === 'image');
    expect(imgBlock).toBeDefined();
    expect(imgBlock.mimeType).toBe('image/png');
    expect(imgBlock.data.length).toBeGreaterThan(100);

    await client.close();
    await server.close();
  });

  it('executes generate_qr tool to create scannable QR code', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const qrRes = (await client.callTool({
      name: 'generate_qr',
      arguments: {
        text: 'https://tailprint.com',
        size: 300,
        dark_color: '#4f46e5',
        light_color: '#ffffff',
      },
    })) as any;

    expect(qrRes.isError).toBeFalsy();
    const imgBlock = qrRes.content.find((c: any) => c.type === 'image');
    expect(imgBlock).toBeDefined();
    expect(imgBlock.mimeType).toBe('image/png');
    expect(qrRes.content[1].text).toContain('data:image/png;base64,');

    await client.close();
    await server.close();
  });

  it('executes stamp_pdf tool to watermark an existing PDF', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // 1. Generate sample PDF first
    const samplePdf = await browserService.renderPdf({
      html: '<h1 class="text-3xl font-bold">Confidential NDA Agreement</h1><p>Trade secrets description.</p>',
      format: 'A4',
      landscape: false,
      print_background: true,
    });

    // 2. Stamp with watermark
    const stampRes = (await client.callTool({
      name: 'stamp_pdf',
      arguments: {
        pdf_base64: samplePdf.toString('base64'),
        watermark_text: 'FORTROLIGT',
        opacity: 0.2,
        color: 'red',
      },
    })) as any;

    expect(stampRes.isError).toBeFalsy();
    expect(stampRes.content[0].text).toContain('FORTROLIGT');
    expect(stampRes.content[0].text).toContain('data:application/pdf;base64,');

    await client.close();
    await server.close();
  });

  it('executes compare_snapshots tool to detect differences between HTML versions', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const res = (await client.callTool({
      name: 'compare_snapshots',
      arguments: {
        before_html: '<div style="width:400px;height:200px;background:blue;color:white;font-size:24px;">Button V1</div>',
        after_html: '<div style="width:400px;height:200px;background:red;color:white;font-size:24px;">Button V2</div>',
        width: 400,
        height: 200,
      },
    })) as any;

    expect(res.isError).toBeFalsy();
    expect(res.content[0].type).toBe('image');
    expect(res.content[0].mimeType).toBe('image/png');
    expect(res.content[1].text).toContain('Visual Regression Report');
    expect(res.content[1].text).toContain('Changed Pixels');

    await client.close();
    await server.close();
  }, 25000);

  it('executes render_carousel tool to generate multi-slide LinkedIn PDF and PNG preview', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const res = (await client.callTool({
      name: 'render_carousel',
      arguments: {
        title: '3 Rules for High Output',
        author_name: 'Test Author',
        theme: 'dark',
        markdown: `
# Rule 1: Automate Visuals
Never do manual screenshots when an API can do it.
Takeaway: Speed wins.
---
# Rule 2: Keep Contexts Lean
Strip extraneous DOM elements.
Takeaway: 90% token savings.
`,
      },
    })) as any;

    expect(res.isError).toBeFalsy();
    expect(res.content[0].type).toBe('image');
    expect(res.content[0].mimeType).toBe('image/png');
    expect(res.content[1].text).toContain('Multi-Slide Carousel Generated Successfully');
    expect(res.content[1].text).toContain('LinkedIn Carousel (Multi-page PDF)');

    await client.close();
    await server.close();
  }, 25000);

  it('executes generate_einvoice tool to produce hybrid Factur-X PDF with embedded XML', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const res = (await client.callTool({
      name: 'generate_einvoice',
      arguments: {
        invoice_number: 'INV-TEST-2026-01',
        seller_name: 'Tailprint ApS',
        seller_vat_id: 'DK12345678',
        seller_country: 'DK',
        buyer_name: 'Acme Europe GmbH',
        buyer_vat_id: 'DE987654321',
        buyer_country: 'DE',
        currency: 'EUR',
        line_items: [
          { name: 'API Subscription - Scale Plan', quantity: 1, unit_price: 299, vat_rate: 25 },
          { name: 'Dedicated Support Hours', quantity: 5, unit_price: 150, vat_rate: 25 },
        ],
        payment_iban: 'DK0012345678901234',
        payment_bic: 'DABA2100',
      },
    })) as any;

    expect(res.isError).toBeFalsy();
    expect(res.content[0].type).toBe('text');
    expect(res.content[0].text).toContain('Factur-X / ZUGFeRD 2.2 Compliant Hybrid E-Invoice');
    expect(res.content[0].text).toContain('INV-TEST-2026-01');
    expect(res.content[0].text).toContain('Download Hybrid PDF');
    expect(res.content[0].text).toContain('factur-x.xml');

    await client.close();
    await server.close();
  }, 25000);

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
