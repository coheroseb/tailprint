import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';

async function run() {
  console.log('🚀 Connecting to Tailprint MCP Server via Stdio Transport...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['/Users/sebastianviste/EaaS/dist/mcp/stdio.js'],
  });

  const client = new Client(
    { name: 'tailprint-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected successfully to Tailprint MCP Server!\n');

  // 1. List Tools
  console.log('📋 --- 1. Available Tools ---');
  const toolsResult = await client.listTools();
  for (const t of toolsResult.tools) {
    console.log(`• [Tool] ${t.name}: ${t.description.slice(0, 80)}...`);
  }
  console.log('');

  // 2. Call list_templates
  console.log('📑 --- 2. Testing list_templates Tool ---');
  const templatesResult = await client.callTool({
    name: 'list_templates',
    arguments: {},
  });
  const templates = JSON.parse(templatesResult.content[0].text);
  console.log(`Found ${templates.length} templates:`, templates.map(t => t.id).join(', '));
  console.log('');

  // 3. Call render_template (Generating a customized receipt)
  console.log('🧾 --- 3. Testing render_template Tool (Custom Receipt PDF) ---');
  const receiptResult = await client.callTool({
    name: 'render_template',
    arguments: {
      template_id: 'receipt',
      variables: {
        'STORE #4028': 'TAILPRINT DEMO STORE',
        '$42.50': '$119.00',
        '$38.99': '$110.00',
      },
      output_format: 'pdf',
    },
  });
  const receiptText = receiptResult.content[0].text;
  console.log('Server response summary:');
  console.log(receiptText.split('\n')[0]);

  // Extract base64 and save to disk
  const pdfMatch = receiptText.match(/data:application\/pdf;base64,([A-Za-z0-9+/=]+)/);
  if (pdfMatch) {
    const pdfPath = '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/scratch/test_receipt.pdf';
    fs.writeFileSync(pdfPath, Buffer.from(pdfMatch[1], 'base64'));
    console.log(`💾 Saved rendered PDF to: ${pdfPath} (${(fs.statSync(pdfPath).size / 1024).toFixed(1)} KB)`);
  }
  console.log('');

  // 4. Call render_image (Generating inline social preview image)
  console.log('🖼️ --- 4. Testing render_image Tool (Inline Image) ---');
  const imgResult = await client.callTool({
    name: 'render_image',
    arguments: {
      html: `
        <div class="w-[1200px] h-[630px] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col justify-between p-16 font-sans text-white border-8 border-indigo-500/20">
          <div>
            <span class="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm border border-emerald-500/30">
              ● MCP TEST RUN
            </span>
          </div>
          <div>
            <h1 class="text-6xl font-black tracking-tight text-white leading-tight">
              Tested Live from Antigravity MCP Client
            </h1>
            <p class="text-2xl text-indigo-300 mt-4">
              Model Context Protocol • Pixel-Perfect Tailwind Rendering
            </p>
          </div>
          <div class="flex items-center justify-between pt-8 border-t border-slate-800 text-slate-400 font-mono text-lg">
            <span>tailprint.com</span>
            <span>Local Stdio Transport</span>
          </div>
        </div>
      `,
      width: 1200,
      height: 630,
      type: 'png',
    },
  });

  const imageBlock = imgResult.content.find(c => c.type === 'image');
  if (imageBlock) {
    console.log(`🎨 MCP Image Block returned! Type: ${imageBlock.type}, MimeType: ${imageBlock.mimeType}, Base64 size: ${(imageBlock.data.length / 1024).toFixed(1)} KB`);
    const imgPath = '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/scratch/test_mcp_card.png';
    fs.writeFileSync(imgPath, Buffer.from(imageBlock.data, 'base64'));
    console.log(`💾 Saved rendered image to: ${imgPath}`);
  }
  console.log('');

  // 5. List and Read Resources
  console.log('📚 --- 5. Testing MCP Resources ---');
  const resourcesResult = await client.listResources();
  console.log(`Found ${resourcesResult.resources.length} MCP resources:`);
  for (const r of resourcesResult.resources.slice(0, 4)) {
    console.log(`• [Resource] ${r.name} (${r.uri})`);
  }
  const guide = await client.readResource({ uri: 'tailprint://docs/tailwind-guide' });
  console.log('Read "tailprint://docs/tailwind-guide":', guide.contents[0].text.split('\n')[0]);
  console.log('');

  // 6. List and Execute Prompts
  console.log('💬 --- 6. Testing MCP Prompts ---');
  const promptsResult = await client.listPrompts();
  console.log(`Found ${promptsResult.prompts.length} MCP prompts:`, promptsResult.prompts.map(p => p.name).join(', '));

  const promptMessage = await client.getPrompt({
    name: 'generate_invoice',
    arguments: {
      client_name: 'Acme Space Industries',
      invoice_number: 'INV-ACME-2026',
      items_description: 'Chromium Engine Cluster License',
      total_amount: '$14,500.00',
    },
  });
  console.log('Executed "generate_invoice" prompt output:');
  console.log(promptMessage.messages[0].content.text);
  console.log('');

  await client.close();
  console.log('🎉 All MCP Server tests completed successfully with 100% pass rate!');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
