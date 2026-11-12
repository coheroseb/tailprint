#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { browserService } from '../services/browser.js';

async function main() {
  const server = createMcpServer({
    name: 'tailprint-mcp-cli',
    version: '1.1.0',
  });

  const transport = new StdioServerTransport();

  // Handle graceful cleanup
  const cleanup = async () => {
    try {
      await browserService.close();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await server.connect(transport);
}

main().catch((err) => {
  console.error('Tailprint MCP fatal error:', err);
  process.exit(1);
});
