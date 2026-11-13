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

  it('lists all 11 registered PDF & Document MCP tools correctly', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain('render_pdf');
    expect(toolNames).toContain('list_templates');
    expect(toolNames).toContain('get_template_source');
    expect(toolNames).toContain('render_template');
    expect(toolNames).toContain('stamp_pdf');
    expect(toolNames).toContain('generate_einvoice');
    expect(toolNames).toContain('merge_pdfs');
    expect(toolNames).toContain('split_pdf');
    expect(toolNames).toContain('fill_pdf_form');
    expect(toolNames).toContain('compress_pdf');
    expect(toolNames).toContain('render_presentation');
    expect(toolNames).toContain('verify_pdf');
    expect(toolNames.length).toBe(12);

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
    expect(parsedList.some((t: any) => t.id === 'og-card')).toBe(false);

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

  it('renders a hosted template via render_pdf template_id + data and reports invalid data', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const ok = (await client.callTool({
      name: 'render_pdf',
      arguments: {
        template_id: 'certificate-classic',
        data: { recipient_name: 'Ada Lovelace' },
      },
    })) as any;
    expect(ok.isError).toBeFalsy();
    expect(ok.content[0].text).toContain('data:application/pdf;base64,');

    const bad = (await client.callTool({
      name: 'render_pdf',
      arguments: { template_id: 'invoice-modern', data: { invoice_number: 'only' } },
    })) as any;
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toContain('Invalid data for template "invoice-modern"');

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

  it('lists and executes MCP Prompts (PDF & E-Invoice workflows)', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // List prompts
    const promptList = await client.listPrompts();
    const promptNames = promptList.prompts.map((p) => p.name);

    expect(promptNames).toContain('generate_invoice');
    expect(promptNames).toContain('generate_b2b_invoice');
    expect(promptNames.length).toBe(2);

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
        watermark_text: 'CONFIDENTIAL',
        opacity: 0.2,
        color: 'red',
      },
    })) as any;

    expect(stampRes.isError).toBeFalsy();
    expect(stampRes.content[0].text).toContain('CONFIDENTIAL');
    expect(stampRes.content[0].text).toContain('data:application/pdf;base64,');

    await client.close();
    await server.close();
  });

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

  it('GET /v1/mcp/tools returns catalog of all 11 PDF & Document tools', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/mcp/tools',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalTools).toBe(11);
    expect(body.tools.length).toBe(11);
    const names = body.tools.map((t: any) => t.name);
    expect(names).toContain('render_pdf');
    expect(names).toContain('generate_einvoice');
    expect(names).toContain('merge_pdfs');
    expect(names).toContain('split_pdf');
    expect(names).toContain('render_presentation');
  });

  it('executes merge_pdfs and split_pdf tools', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    // Create 2 small test PDFs
    const pdf1 = (await client.callTool({
      name: 'render_pdf',
      arguments: { html: '<h1>Doc 1 Page</h1>' },
    })) as any;
    const pdf1Base64 = pdf1.content[0].text.match(/data:application\/pdf;base64,([A-Za-z0-9+/=]+)/)[1];

    const pdf2 = (await client.callTool({
      name: 'render_pdf',
      arguments: { html: '<h1>Doc 2 Page</h1>' },
    })) as any;
    const pdf2Base64 = pdf2.content[0].text.match(/data:application\/pdf;base64,([A-Za-z0-9+/=]+)/)[1];

    // Merge them
    const mergeRes = (await client.callTool({
      name: 'merge_pdfs',
      arguments: {
        pdfs: [pdf1Base64, pdf2Base64],
        output_filename: 'combined.pdf',
      },
    })) as any;

    expect(mergeRes.isError).toBeFalsy();
    expect(mergeRes.content[0].text).toContain('Successfully merged 2 PDF documents');
    const mergedBase64 = mergeRes.content[0].text.match(/data:application\/pdf;base64,([A-Za-z0-9+/=]+)/)[1];

    // Split page 1
    const splitRes = (await client.callTool({
      name: 'split_pdf',
      arguments: {
        pdf: mergedBase64,
        pages: '1',
      },
    })) as any;

    expect(splitRes.isError).toBeFalsy();
    expect(splitRes.content[0].text).toContain('Successfully extracted pages (1)');

    await client.close();
    await server.close();
  }, 30000);

  it('lists MCP resources and prompts including PDF guides', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);

    const resources = await client.listResources();
    const resourceUris = resources.resources.map((r) => r.uri);
    expect(resourceUris).toContain('tailprint://templates/catalog');
    expect(resourceUris).toContain('tailprint://docs/tailwind-guide');
    expect(resourceUris).toContain('tailprint://docs/smart-pagination');
    expect(resourceUris).toContain('tailprint://templates/all');

    const prompts = await client.listPrompts();
    const promptNames = prompts.prompts.map((p) => p.name);
    expect(promptNames).toContain('generate_invoice');
    expect(promptNames).toContain('generate_b2b_invoice');

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
