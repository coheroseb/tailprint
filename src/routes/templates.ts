import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TEMPLATES } from '../config/templates.js';
import { PLANS } from '../config/plans.js';
import { browserService } from '../services/browser.js';
import { stripeService } from '../services/stripe.js';
import { env } from '../config/env.js';

export const templateRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /templates - Return JSON catalog of templates
  fastify.get(
    '/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'List Ready-to-Use Tailwind Templates',
        description: 'Returns pre-designed Tailwind CSS templates for Invoices, Certificates, Executive Reports, Resumes, OG Banners, and Shipping Labels.',
      },
    },
    async () => {
      return {
        templates: TEMPLATES.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          description: t.description,
          format: t.format,
          landscape: t.landscape,
        })),
      };
    }
  );

  // GET /templates/:id/download - Live render and download PDF
  fastify.get(
    '/templates/:id/download',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Download Rendered PDF for Template',
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const template = TEMPLATES.find((t) => t.id === id);
      if (!template) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Template '${id}' not found. Available: ${TEMPLATES.map((t) => t.id).join(', ')}`,
        });
      }

      if (template.id === 'og-card') {
        // Special case: OG card renders as high-res PNG image
        const imgBuffer = await browserService.renderImage({
          html: template.html,
          width: 1200,
          height: 630,
          type: 'png',
        });

        return reply
          .code(200)
          .header('Content-Type', 'image/png')
          .header('Content-Disposition', `attachment; filename="${template.id}-preview.png"`)
          .header('Content-Length', String(imgBuffer.length))
          .send(imgBuffer);
      }

      const pdfBuffer = await browserService.renderPdf({
        html: template.html,
        format: template.format,
        landscape: template.landscape,
        print_background: true,
      });

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${template.id}-preview.pdf"`)
        .header('Content-Length', String(pdfBuffer.length))
        .send(pdfBuffer);
    }
  );

  // Internal checkout endpoints for frontend landing page pricing buttons
  fastify.post('/v1/billing/checkout', { schema: { hide: true } }, async (request, reply) => {
    const { planId, customerEmail } = request.body as any;
    const session = await stripeService.createCheckoutSession({
      planId,
      customerEmail,
    });

    return reply.code(200).send({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.url,
      isMock: session.isMock,
    });
  });

  fastify.post('/billing/create-checkout-session', { schema: { hide: true } }, async (request, reply) => {
    const { planId, customerEmail } = request.body as any;
    const session = await stripeService.createCheckoutSession({
      planId,
      customerEmail,
    });

    return reply.code(200).send({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.url,
      isMock: session.isMock,
    });
  });

  // GET / - Showcase Landing Page & Template Gallery
  fastify.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async (_request, reply) => {
      const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tailprint - Tailwind-Native Render & PDF Engine</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='8' fill='%23090d16'/%3E%3Cpath d='M11 9L6 16l5 7' stroke='%23818cf8' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 9l5 7-5 7' stroke='%23f472b6' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='18' y1='8' x2='14' y2='24' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='16' r='1.5' fill='%23f43f5e'/%3E%3C/svg%3E" />
  <meta name="description" content="Tailprint is the high-performance Tailwind-Native Render & PDF Engine + AI Web Scraper. Convert HTML with Tailwind to vector PDFs, Open Graph images, or LLM-clean Markdown with MCP." />
  <meta property="og:title" content="Tailprint - Tailwind-Native Render & PDF Engine" />
  <meta property="og:description" content="Sub-500ms PDF & Open Graph image generation from Tailwind CSS, plus LLM-ready web scraping with 90%+ token savings. Model Context Protocol (MCP) ready." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tailprint.com" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Tailprint - Tailwind-Native Render & PDF Engine" />
  <meta name="twitter:description" content="Turn Tailwind CSS into high-fidelity PDFs and Open Graph images. Scrape web pages to clean Markdown for AI agents." />
  <script>
    const _warn = console.warn;
    console.warn = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
      _warn.apply(console, args);
    };
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eef2ff',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          }
        }
      }
    }
  </script>
  <style>
    pre code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">

  <!-- Navigation -->
  <header class="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      
      <!-- Brand Logo & Main Navigation -->
      <div class="flex items-center space-x-8">
        <a href="/" class="flex items-center group transition hover:opacity-90">
          <span class="font-extrabold text-2xl tracking-tight text-white flex items-center">
            <span class="text-indigo-400 font-mono font-bold mr-1">&lt;</span>tail<span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">print</span><span class="text-pink-400 font-mono font-bold ml-1">/&gt;</span>
          </span>
        </a>

        <!-- Main Product Links (Desktop) -->
        <nav class="hidden md:flex items-center space-x-1 text-sm font-medium">
          <a href="#playground" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>Playground</span>
          </a>
          <a href="#templates" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5">
            <span>Templates</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono leading-none">${TEMPLATES.length}</span>
          </a>
          <a href="#scraper" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/80 transition">
            Scraper
          </a>
          <a href="#mcp" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5">
            <span>MCP Server</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold uppercase tracking-wider leading-none">AI</span>
          </a>
          <a href="#pricing" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/80 transition">
            Pricing
          </a>
          <a href="/docs" target="_blank" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1">
            <span>Docs</span>
            <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </nav>
      </div>

      <!-- User Actions & CTA -->
      <div class="flex items-center space-x-3">
        <a href="/dashboard" class="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition">
          Customer Portal
        </a>
        <button onclick="openFreeKeyModal()" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5">
          <span class="text-xs">⚡</span>
          <span>Claim Free Key</span>
        </button>

        <!-- Mobile Menu Toggle Button -->
        <button onclick="document.getElementById('mobile-menu').classList.toggle('hidden')" class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800" aria-label="Toggle navigation">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

    </div>

    <!-- Mobile Slide-down Navigation -->
    <div id="mobile-menu" class="hidden md:hidden border-t border-slate-800/80 bg-slate-950/95 px-6 py-4 space-y-2">
      <a href="#playground" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900">Live Playground</a>
      <a href="#templates" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">Templates (${TEMPLATES.length})</a>
      <a href="#scraper" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">URL Scraper</a>
      <a href="#mcp" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">MCP Server (AI)</a>
      <a href="#pricing" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">Pricing</a>
      <a href="/docs" target="_blank" class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">API Documentation</a>
      <a href="/dashboard" class="block px-3 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:bg-slate-900">Customer Dashboard</a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-20 pb-16 overflow-hidden">
    <div class="max-w-5xl mx-auto px-6 text-center">
      <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold mb-6">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Production-Grade Chromium Engine (Sub-500ms Execution)</span>
      </div>

      <h1 class="text-5xl sm:text-6xl font-black tracking-tight text-white leading-tight">
        Send <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Tailwind HTML</span>.<br>
        Receive Pixel-Perfect <span class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">PDFs & OG Images</span>.
      </h1>

      <p class="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Eliminate complex browser infrastructure and build steps. Submit raw HTML with arbitrary utility classes and generate print-ready PDFs or cached social preview banners instantly.
      </p>

      <div class="mt-8 flex flex-wrap justify-center items-center gap-4">
        <button onclick="openFreeKeyModal()" class="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2">
          <span>⚡ Claim 100 Free Renders</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-black uppercase">No CC</span>
        </button>
        <a href="#playground" class="px-6 py-3.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold transition shadow-lg shadow-indigo-600/20">
          Try Live Sandbox
        </a>
        <a href="#templates" class="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold transition">
          Explore Templates (${TEMPLATES.length})
        </a>
      </div>

      <!-- System Stats -->
      <div class="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p class="text-xs text-slate-400">Response Latency</p>
          <p class="text-2xl font-black text-emerald-400 mt-1">&lt; 500 ms</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p class="text-xs text-slate-400">Tailwind Engine</p>
          <p class="text-2xl font-black text-indigo-400 mt-1">v3 & v4</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p class="text-xs text-slate-400">Sandboxing</p>
          <p class="text-2xl font-black text-purple-400 mt-1">SSRF Blocked</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p class="text-xs text-slate-400">Cache Layer</p>
          <p class="text-2xl font-black text-cyan-400 mt-1">SHA-256</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Live Interactive PDF Playground Section -->
  <section id="playground" class="py-16 bg-slate-900/40 border-t border-slate-800/80">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-10">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold mb-3">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          <span>Interactive Browser Sandbox</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Live Tailwind HTML to PDF Playground</h2>
        <p class="text-slate-400 mt-2">Edit Tailwind CSS markup in real-time. Render a pixel-perfect, vector PDF in under 500ms using our Chromium engine.</p>
      </div>

      <!-- Playground Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        <!-- Left: Code Editor (6 cols) -->
        <div class="lg:col-span-6 flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl">
          <!-- Mode Tabs & Presets Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
            <!-- Mode Switcher -->
            <div class="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button onclick="setPlaygroundMode('editor')" id="mode-tab-editor" class="px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white transition">HTML Editor</button>
              <button onclick="setPlaygroundMode('url')" id="mode-tab-url" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition">URL to PDF</button>
              <button onclick="setPlaygroundMode('snippets')" id="mode-tab-snippets" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition">SDK Code</button>
            </div>

            <!-- Preset switcher (Editor mode only) -->
            <div id="playground-presets-row" class="flex flex-wrap gap-1">
              <button onclick="loadPlaygroundPreset('invoice')" id="btn-pre-invoice" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white">Invoice</button>
              <button onclick="loadPlaygroundPreset('ticket')" id="btn-pre-ticket" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white">Ticket</button>
              <button onclick="loadPlaygroundPreset('receipt')" id="btn-pre-receipt" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white">Receipt</button>
              <button onclick="loadPlaygroundPreset('certificate')" id="btn-pre-certificate" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white">Certificate</button>
              <button onclick="loadPlaygroundPreset('badge')" id="btn-pre-badge" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white">ID Badge</button>
            </div>
          </div>

          <!-- Mode 1: HTML Textarea -->
          <div id="container-mode-editor" class="flex-1 flex flex-col">
            <textarea
              id="playground-editor"
              rows="16"
              class="flex-1 w-full bg-slate-950 font-mono text-xs text-indigo-200 p-4 rounded-xl border border-slate-800/80 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none shadow-inner"
              spellcheck="false"
            ></textarea>
          </div>

          <!-- Mode 2: Direct URL Input -->
          <div id="container-mode-url" class="hidden flex-1 flex flex-col justify-center space-y-4 py-8 px-2">
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300">Target Web URL to Render</label>
              <div class="flex items-center space-x-2">
                <input
                  id="playground-url-input"
                  type="url"
                  value="https://example.com"
                  placeholder="https://yourdomain.com/dashboard/invoice"
                  class="flex-1 bg-slate-950 font-mono text-xs text-indigo-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Chromium navigates to the target URL, executes JavaScript, waits for custom fonts and networkidle, and captures a pixel-perfect vector PDF.
              </p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div class="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <span>🛡️ Enterprise SSRF Protected:</span>
              </div>
              <p>Loopback, internal IP ranges (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16) and cloud instance metadata (169.254.169.254) are automatically blocked.</p>
            </div>
          </div>

          <!-- Mode 3: Multi-Language Code Snippets -->
          <div id="container-mode-snippets" class="hidden flex-1 flex flex-col space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex space-x-1.5 text-xs">
                <button onclick="setSnippetLang('curl')" id="btn-lang-curl" class="px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white">cURL</button>
                <button onclick="setSnippetLang('node')" id="btn-lang-node" class="px-2.5 py-1 rounded-lg font-semibold bg-slate-800 text-slate-400 hover:text-white">Node / TS</button>
                <button onclick="setSnippetLang('python')" id="btn-lang-python" class="px-2.5 py-1 rounded-lg font-semibold bg-slate-800 text-slate-400 hover:text-white">Python</button>
                <button onclick="setSnippetLang('php')" id="btn-lang-php" class="px-2.5 py-1 rounded-lg font-semibold bg-slate-800 text-slate-400 hover:text-white">PHP</button>
              </div>
              <button onclick="copyCurrentSnippet()" id="btn-copy-snippet" class="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 transition flex items-center space-x-1">
                <span>📋 Copy Snippet</span>
              </button>
            </div>
            <pre id="playground-snippet-code" class="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-200 overflow-x-auto whitespace-pre leading-relaxed max-h-72"></pre>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <div class="flex items-center space-x-1.5">
                <span>Paper:</span>
                <select id="playground-format" class="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none">
                  <option value="A4">A4 Portrait</option>
                  <option value="Letter">Letter Portrait</option>
                  <option value="A4-landscape">A4 Landscape</option>
                </select>
              </div>

              <!-- Header / Footer Toggle -->
              <label class="flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-white select-none">
                <input id="playground-header-footer" type="checkbox" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 text-xs">
                <span class="text-[11px]">Header & Page #</span>
              </label>

              <!-- Password Protection Option -->
              <div class="flex items-center space-x-1">
                <span class="text-[11px] text-slate-400">🔒</span>
                <input
                  id="playground-password"
                  type="text"
                  placeholder="Password (AES-256)"
                  class="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-indigo-500 w-32 placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              id="playground-render-btn"
              onclick="renderPlaygroundPdf()"
              class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              <span>⚡ Render PDF</span>
            </button>
          </div>
        </div>

        <!-- Right: Live PDF Preview / Viewer (6 cols) -->
        <div class="lg:col-span-6 flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-slate-300">Live PDF Output</span>
              <span id="playground-status-badge" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                Ready
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <span id="playground-time" class="text-[11px] font-mono text-slate-400">~380ms</span>
              <a
                id="playground-download-btn"
                href="#"
                download="tailprint-rendered.pdf"
                class="hidden px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
              >
                ⬇️ Download PDF
              </a>
            </div>
          </div>

          <!-- Preview Area -->
          <div class="flex-1 w-full min-h-[380px] bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden relative flex items-center justify-center">
            
            <!-- Loading Indicator -->
            <div id="playground-loading" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-10">
              <div class="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
              <p class="text-xs text-indigo-300 font-medium">Compiling Tailwind & Chromium...</p>
            </div>

            <!-- PDF Viewer Iframe -->
            <iframe
              id="playground-iframe"
              class="w-full h-full min-h-[460px] border-0 rounded-xl"
              title="Tailprint Live PDF Preview"
            ></iframe>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- LLM Scraper Live Demo Section -->
  <section id="scraper" class="py-16 bg-slate-900/60 border-t border-slate-800/80">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-10">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold mb-3">
          <span>NEW: LLM-Ready Web Scraper & Markdown Cleaner</span>
        </div>
        <h2 class="text-3xl font-extrabold text-white">Turn Any Web Page into Clean Markdown</h2>
        <p class="text-slate-400 mt-2">Mozilla Readability strips 95%+ boilerplate noise (scripts, cookie banners, navbars). Drastically cuts LLM token costs for RAG & AI agents.</p>
      </div>

      <!-- Live Interactive Scraper Box -->
      <div class="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div class="flex flex-col sm:flex-row gap-3">
          <input id="scraper-input" type="url" value="https://example.com" placeholder="Enter any article or documentation URL..." class="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" />
          <button onclick="runLiveScrape()" id="scraper-btn" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-2">
            <span>⚡ Scrape to Markdown</span>
          </button>
        </div>

        <!-- Metrics & Output -->
        <div id="scraper-results" class="mt-6 border-t border-slate-800/80 pt-6">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Token Savings</span>
              <span id="metric-savings" class="text-xl font-black text-emerald-400 mt-0.5 block">94.2%</span>
            </div>
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Estimated Tokens</span>
              <span id="metric-tokens" class="text-xl font-black text-indigo-400 mt-0.5 block">181</span>
            </div>
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Word Count</span>
              <span id="metric-words" class="text-xl font-black text-slate-200 mt-0.5 block">136</span>
            </div>
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Cache Status</span>
              <span id="metric-cache" class="text-xl font-black text-cyan-400 mt-0.5 block">HIT (Redis)</span>
            </div>
          </div>

          <div class="relative">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Cleaned Markdown Output</span>
              <button onclick="copyScrapedMarkdown()" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1">
                <span>📋 Copy Clean Markdown</span>
              </button>
            </div>
            <pre id="scraper-output" class="p-4 bg-slate-900 rounded-xl text-slate-300 text-xs font-mono max-h-64 overflow-y-auto whitespace-pre-wrap border border-slate-800"># Example Domain

This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring purposes.

[Learn more](https://iana.org/help/example-domains)</pre>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Templates Section -->
  <section id="templates" class="py-20 bg-slate-900/40 border-t border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-10">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold mb-3">
          <span>Ready to Copy & Render</span>
        </div>
        <h2 class="text-3xl font-extrabold text-white">8 Production Tailwind Templates</h2>
        <p class="text-slate-400 mt-2">One-click copy for clean Tailwind HTML or cURL terminal commands. Test immediate rendering on any template.</p>
      </div>

      <!-- Tab Buttons Grid -->
      <div class="flex flex-wrap justify-center mb-8 gap-2.5 max-w-5xl mx-auto">
        ${TEMPLATES.map(
          (t, index) => `
          <button onclick="switchTab('${t.id}')" id="btn-${t.id}" class="px-4 py-2 rounded-xl font-bold text-xs ${
            index === 0
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white'
          } transition flex items-center space-x-2">
            <span>${
              t.id === 'invoice'
                ? '🧾'
                : t.id === 'certificate'
                ? '🎓'
                : t.id === 'report'
                ? '📊'
                : t.id === 'resume'
                ? '👤'
                : t.id === 'ticket'
                ? '🎟️'
                : t.id === 'receipt'
                ? '🏷️'
                : t.id === 'og-card'
                ? '🖼️'
                : '📦'
            }</span>
            <span>${t.title}</span>
          </button>
        `
        ).join('')}
      </div>

      <!-- Template Panels -->
      ${TEMPLATES.map(
        (t, index) => `
        <div id="tab-${t.id}" class="template-panel ${index === 0 ? '' : 'hidden'} grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-7 bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50 max-h-[640px] overflow-y-auto">
            ${t.html}
          </div>
          <div class="lg:col-span-5 space-y-4">
            <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div class="flex justify-between items-start">
                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800/40">${t.category}</span>
                <span class="text-xs text-slate-400 font-mono">${t.format} ${t.landscape ? 'Landscape' : 'Portrait'}</span>
              </div>
              <h3 class="text-xl font-bold text-white mt-3">${t.title}</h3>
              <p class="text-slate-400 text-xs mt-1.5 leading-relaxed">${t.description}</p>
              
              <div class="mt-6 flex flex-wrap gap-2.5">
                <button onclick="copyHtml('${t.id}')" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30">
                  <span>📋 Copy HTML</span>
                </button>
                <button onclick="copyCurl('${t.id}')" class="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center space-x-1.5">
                  <span>💻 Copy cURL</span>
                </button>
                <a href="/templates/${t.id}/download" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/30">
                  <span>⬇️ Download ${t.id === 'og-card' ? 'PNG' : 'PDF'}</span>
                </a>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px]">
              <p class="font-bold text-slate-300 uppercase tracking-wider mb-1.5">cURL API Request</p>
              <pre class="bg-slate-950 p-3 rounded-lg text-slate-300 overflow-x-auto leading-relaxed border border-slate-800 font-mono text-[10px]">curl -X POST ${env.APP_URL}${t.id === 'og-card' ? '/v1/render/image' : '/v1/render/pdf'} \\
  -H "Authorization: Bearer sec_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"html":"..."}' \\
  --output ${t.id}.${t.id === 'og-card' ? 'png' : 'pdf'}</pre>
            </div>
          </div>
        </div>
      `
      ).join('')}

    </div>
  </section>

  <!-- Model Context Protocol (MCP) Section -->
  <section id="mcp" class="py-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-400 text-xs font-semibold mb-3">
          <span>AI Native Standard</span>
        </div>
        <h2 class="text-3xl font-extrabold text-white">Model Context Protocol (MCP) Support</h2>
        <p class="text-slate-400 mt-2">Connect Tailprint directly to Claude Desktop, Cursor, Windsurf, or autonomous LLM agents in seconds.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Left: Capabilities & Prompts -->
        <div class="lg:col-span-5 space-y-6">
          <div class="space-y-4">
            <h3 class="text-xl font-bold text-white">5 Powerful Tools in Your AI Assistant</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Once connected, your AI model can scrape websites without token bloat and render PDFs or Open Graph social images on-demand.
            </p>
          </div>

          <div class="space-y-3">
            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3">
              <span class="text-lg">⚡</span>
              <div>
                <h4 class="text-xs font-bold text-white">scrape_markdown</h4>
                <p class="text-xs text-slate-400 mt-0.5">Scrapes any page, strips cookie walls & ads, returns token-efficient Markdown with savings analytics.</p>
              </div>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3">
              <span class="text-lg">📄</span>
              <div>
                <h4 class="text-xs font-bold text-white">render_pdf & render_image</h4>
                <p class="text-xs text-slate-400 mt-0.5">Turns Tailwind CSS markup into vector PDFs or OG banners with base64 data URIs.</p>
              </div>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start space-x-3">
              <span class="text-lg">📑</span>
              <div>
                <h4 class="text-xs font-bold text-white">list_templates & get_template_source</h4>
                <p class="text-xs text-slate-400 mt-0.5">Lets your AI agent pull our invoice, certificate, or report templates and customize them on the fly.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Config Snippets & Code Box -->
        <div class="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div class="flex space-x-2">
              <button onclick="switchMcpTab('claude')" id="btn-mcp-claude" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">Claude Desktop</button>
              <button onclick="switchMcpTab('cursor')" id="btn-mcp-cursor" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white">Cursor / Windsurf</button>
              <button onclick="switchMcpTab('sse')" id="btn-mcp-sse" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white">Remote SSE Endpoint</button>
            </div>
            <button onclick="copyMcpSnippet()" id="mcp-copy-btn" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1">
              <span>📋 Copy Config</span>
            </button>
          </div>

          <pre id="mcp-code-block" class="p-4 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800/80">{
  "mcpServers": {
    "renderengine": {
      "command": "node",
      "args": ["/opt/renderengine/dist/mcp/stdio.js"],
      "env": {
        "RENDERENGINE_API_KEY": "sec_live_your_key_here"
      }
    }
  }
}</pre>
          <p id="mcp-hint" class="text-[11px] text-slate-400 mt-3">
            Add this snippet to <code class="text-indigo-300">~/Library/Application Support/Claude/claude_desktop_config.json</code> on macOS.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="py-24">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-16">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold mb-4">
          <span>High-Margin, Conversion-Optimized Tiers</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Simple, High-Value Pricing</h2>
        <p class="text-slate-400 mt-3">Underbidding competitors while delivering instant sub-500ms Chromium execution. Automatic API key provisioning via Stripe Checkout.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <!-- Free / Developer Sandbox Plan -->
        <div class="p-6 rounded-2xl bg-slate-900/70 border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-500/50 transition relative">
          <div class="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-black tracking-wider uppercase">
            NO CREDIT CARD
          </div>
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.free.name}</h3>
            </div>
            <p class="text-xs text-emerald-400 font-medium mt-1">${PLANS.free.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$0</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ forever</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">100 renders / month</p>
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${PLANS.free.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-300">
              ${PLANS.free.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="openFreeKeyModal()" class="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow-lg shadow-emerald-600/20">
            Claim 100 Free Renders ⚡
          </button>
        </div>

        <!-- Starter Plan -->
        <div class="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.starter.name}</h3>
            </div>
            <p class="text-xs text-indigo-400 font-medium mt-1">${PLANS.starter.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$${PLANS.starter.priceUsd}</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ mo</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">2,500 renders / month</p>
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${PLANS.starter.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-300">
              ${PLANS.starter.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('starter')" class="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs">
            Start with Starter ($14/mo)
          </button>
        </div>

        <!-- Pro Plan (Most Popular) -->
        <div class="p-6 rounded-2xl bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-900 border-2 border-indigo-500 flex flex-col justify-between relative shadow-xl shadow-indigo-500/10 lg:-translate-y-2">
          <div class="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
            MOST POPULAR
          </div>
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.pro.name}</h3>
            </div>
            <p class="text-xs text-indigo-300 font-medium mt-1">${PLANS.pro.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$${PLANS.pro.priceUsd}</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ mo</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">20,000 renders / month</p>
            <p class="text-xs text-slate-300 mt-3 leading-relaxed">${PLANS.pro.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-200">
              ${PLANS.pro.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('pro')" class="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-xs shadow-lg shadow-indigo-600/30">
            Get Pro (20k Renders)
          </button>
        </div>

        <!-- Business / Scale Plan -->
        <div class="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition relative">
          <div class="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-black tracking-wider uppercase">
            SCALE VALUE
          </div>
          <div>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-white">${PLANS.business.name}</h3>
            </div>
            <p class="text-xs text-emerald-400 font-medium mt-1">${PLANS.business.targetAudience}</p>
            <div class="mt-5 flex items-baseline">
              <span class="text-4xl font-extrabold text-white">$${PLANS.business.priceUsd}</span>
              <span class="text-slate-400 ml-1.5 text-sm">/ mo</span>
            </div>
            <p class="text-xs text-emerald-400 font-bold mt-1">75,000 renders / month</p>
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${PLANS.business.description}</p>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-300">
              ${PLANS.business.features.map((f) => `<li class="flex items-start space-x-2"><span class="text-emerald-400 font-bold mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
          <button onclick="startCheckout('business')" class="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs">
            Scale with Business ($99/mo)
          </button>
        </div>
      </div>

      <!-- Enterprise Callout Banner -->
      <div class="mt-10 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span>Enterprise & Custom Pools</span>
          </div>
          <h4 class="text-white font-bold text-base">Need 100,000+ monthly renders, dedicated browser workers or strict 99.9% uptime SLA?</h4>
          <p class="text-xs text-slate-400 mt-1">Enterprise plans start at $199/mo with dedicated Chromium instances and private Slack/Discord technical channel.</p>
        </div>
        <button onclick="startCheckout('enterprise')" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition whitespace-nowrap border border-slate-700">
          Deploy Enterprise ($199/mo)
        </button>
      </div>
    </div>
  </section>

  <!-- Stripe Checkout Success Modal -->
  <div id="success-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div class="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-emerald-500/40 p-8 shadow-2xl shadow-emerald-500/10 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
        🎉
      </div>
      <h3 class="text-2xl font-black text-white">Payment Successful!</h3>
      <p class="text-slate-400 text-sm mt-1">Welcome to Tailprint. Your live API key is ready below:</p>

      <div class="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-left">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Live API Key</span>
          <button onclick="copyRevealedKey()" id="copy-revealed-key-btn" class="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1">
            <span>📋 Copy Key</span>
          </button>
        </div>
        <div id="revealed-api-key" class="font-mono text-sm text-emerald-300 break-all bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          Provisioning your API key...
        </div>
      </div>

      <div class="mt-4 text-left">
        <span class="text-xs font-semibold text-slate-400">Quickstart cURL:</span>
        <pre id="revealed-curl" class="mt-1.5 p-3 rounded-xl bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">curl -X POST https://tailprint.com/v1/render/pdf \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html":"&lt;h1 class=\"text-2xl font-bold\"&gt;Hello Tailprint&lt;/h1&gt;"}' \
  --output test.pdf</pre>
      </div>

      <div class="mt-6 flex justify-end">
        <button onclick="closeSuccessModal()" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30">
          Start Building 🚀
        </button>
      </div>
    </div>
  </div>

  <!-- Claim Free API Key Modal -->
  <div id="free-key-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div class="relative w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/40 p-6 sm:p-8 shadow-2xl shadow-emerald-500/10">
      <button onclick="closeFreeKeyModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg">✕</button>

      <div id="free-key-form-view">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
          ⚡
        </div>
        <h3 class="text-xl font-bold text-white">Claim 100 Free Renders / mo</h3>
        <p class="text-xs text-slate-400 mt-1">Instant developer sandbox key. No credit card required. Works with cURL, Node.js, Python, and MCP.</p>

        <form onsubmit="handleClaimFreeKey(event)" class="mt-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Developer Email</label>
            <input id="free-key-email" type="email" required placeholder="alex@company.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500" />
          </div>
          <div id="free-key-error" class="hidden text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg"></div>
          <button id="free-key-submit-btn" type="submit" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2">
            <span>Claim 100 Free Renders ⚡</span>
          </button>
        </form>
      </div>

      <div id="free-key-success-view" class="hidden text-left">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
          ✓
        </div>
        <h3 class="text-xl font-bold text-white">Your Free API Key is Active!</h3>
        <p class="text-xs text-slate-400 mt-1">100 monthly renders unlocked. Use it immediately in your code or terminal:</p>

        <div class="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 break-all flex items-center justify-between">
          <span id="free-key-display"></span>
          <button onclick="copyFreeKey()" id="copy-free-key-btn" class="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-sans font-semibold">Copy</button>
        </div>

        <div class="mt-4">
          <span class="text-xs font-semibold text-slate-400">cURL Quickstart:</span>
          <pre id="free-key-curl" class="mt-1.5 p-3 rounded-xl bg-slate-950 text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800"></pre>
        </div>

        <div class="mt-6 flex space-x-3">
          <a href="/dashboard" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold text-center transition">
            Open Dashboard →
          </a>
          <button onclick="closeFreeKeyModal()" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
            Done
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="py-12 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). Built with Fastify, Playwright Chromium, Upstash Redis & Stripe.</p>
  </footer>

  <!-- Script for Interactivity -->
  <script>
    const templatesData = {
      ${TEMPLATES.map((t) => `'${t.id}': ${JSON.stringify(t.html)}`).join(',\n      ')}
    };

    const templateMeta = {
      ${TEMPLATES.map((t) => `'${t.id}': { landscape: ${t.landscape}, isImage: ${t.id === 'og-card'} }`).join(',\n      ')}
    };

    window.playgroundPresets = {
      invoice: templatesData['invoice'] || '',
      ticket: templatesData['ticket'] || '',
      receipt: templatesData['receipt'] || '',
      certificate: templatesData['certificate'] || '',
      badge: '<div class="max-w-xs mx-auto p-6 bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-3xl shadow-2xl border border-indigo-500/30 text-center font-sans"><div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-500 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/50">⚡</div><h3 class="text-xl font-black mt-4">Alex Morgan</h3><p class="text-xs text-indigo-300 font-semibold mt-0.5">Staff Platform Architect</p><div class="mt-6 p-2 rounded-xl bg-slate-950/60 font-mono text-[11px] text-slate-400 border border-slate-800">ACCESS TIER: VIP DEVELOPER</div></div>'
    };

    window.currentPlaygroundMode = 'editor';
    window.currentSnippetLang = 'curl';

    window.setPlaygroundMode = function(mode) {
      window.currentPlaygroundMode = mode;
      ['editor', 'url', 'snippets'].forEach(function(m) {
        const btn = document.getElementById('mode-tab-' + m);
        const container = document.getElementById('container-mode-' + m);
        if (btn && container) {
          if (m === mode) {
            btn.className = 'px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white transition';
            container.classList.remove('hidden');
          } else {
            btn.className = 'px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition';
            container.classList.add('hidden');
          }
        }
      });

      const presetsRow = document.getElementById('playground-presets-row');
      if (presetsRow) {
        if (mode === 'editor') {
          presetsRow.classList.remove('hidden');
        } else {
          presetsRow.classList.add('hidden');
        }
      }

      if (mode === 'snippets') {
        window.updateSnippetCode();
      }
    };

    window.setSnippetLang = function(lang) {
      window.currentSnippetLang = lang;
      ['curl', 'node', 'python', 'php'].forEach(function(l) {
        const btn = document.getElementById('btn-lang-' + l);
        if (btn) {
          if (l === lang) {
            btn.className = 'px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white';
          } else {
            btn.className = 'px-2.5 py-1 rounded-lg font-semibold bg-slate-800 text-slate-400 hover:text-white';
          }
        }
      });
      window.updateSnippetCode();
    };

    window.updateSnippetCode = function() {
      const pre = document.getElementById('playground-snippet-code');
      if (!pre) return;

      const editor = document.getElementById('playground-editor');
      const urlInput = document.getElementById('playground-url-input');
      const formatSelect = document.getElementById('playground-format');
      const passwordInput = document.getElementById('playground-password');

      const isUrl = window.currentPlaygroundMode === 'url';
      const targetParam = isUrl
        ? '"url": "' + (urlInput && urlInput.value ? urlInput.value.trim() : 'https://example.com') + '"'
        : '"html": "<div class=\\"...\\">...</div>"';

      const format = formatSelect ? formatSelect.value : 'A4';
      const isLandscape = format.includes('landscape');
      const paperFormat = isLandscape ? 'A4' : format;
      const pass = passwordInput && passwordInput.value.trim() ? passwordInput.value.trim() : null;

      let code = '';
      if (window.currentSnippetLang === 'curl') {
        code = 'curl -X POST https://api.tailprint.com/v1/render/pdf \\\n' +
          '  -H "Authorization: Bearer sec_live_YOUR_API_KEY" \\\n' +
          '  -H "Content-Type: application/json" \\\n' +
          '  -d \'{\n' +
          '    ' + targetParam + ',\n' +
          '    "format": "' + paperFormat + '",\n' +
          '    "landscape": ' + isLandscape +
          (pass ? ',\n    "password": "' + pass + '"' : '') + '\n' +
          '  }\' \\\n' +
          '  --output output.pdf';
      } else if (window.currentSnippetLang === 'node') {
        code = 'import fs from "node:fs/promises";\n\n' +
          'const response = await fetch("https://api.tailprint.com/v1/render/pdf", {\n' +
          '  method: "POST",\n' +
          '  headers: {\n' +
          '    "Authorization": "Bearer " + (process.env.TAILPRINT_API_KEY || "sec_live_YOUR_KEY"),\n' +
          '    "Content-Type": "application/json",\n' +
          '  },\n' +
          '  body: JSON.stringify({\n' +
          '    ' + targetParam + ',\n' +
          '    format: "' + paperFormat + '",\n' +
          '    landscape: ' + isLandscape +
          (pass ? ',\n    password: "' + pass + '"' : '') + '\n' +
          '  }),\n' +
          '});\n\n' +
          'const buffer = Buffer.from(await response.arrayBuffer());\n' +
          'await fs.writeFile("document.pdf", buffer);';
      } else if (window.currentSnippetLang === 'python') {
        code = 'import requests\nimport os\n\n' +
          'api_key = os.environ.get("TAILPRINT_API_KEY", "sec_live_YOUR_KEY")\n' +
          'res = requests.post(\n' +
          '    "https://api.tailprint.com/v1/render/pdf",\n' +
          '    headers={\n' +
          '        "Authorization": f"Bearer {api_key}",\n' +
          '        "Content-Type": "application/json",\n' +
          '    },\n' +
          '    json={\n' +
          '        ' + targetParam + ',\n' +
          '        "format": "' + paperFormat + '",\n' +
          '        "landscape": ' + (isLandscape ? 'True' : 'False') +
          (pass ? ',\n        "password": "' + pass + '"' : '') + '\n' +
          '    },\n' +
          ')\n\n' +
          'with open("document.pdf", "wb") as f:\n' +
          '    f.write(res.content)';
      } else if (window.currentSnippetLang === 'php') {
        code = '<?php\n' +
          '$ch = curl_init("https://api.tailprint.com/v1/render/pdf");\n' +
          'curl_setopt($ch, CURLOPT_HTTPHEADER, [\n' +
          '    "Authorization: Bearer " . getenv("TAILPRINT_API_KEY"),\n' +
          '    "Content-Type: application/json"\n' +
          ']);\n' +
          'curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n' +
          '    ' + targetParam + ',\n' +
          '    "format" => "' + paperFormat + '",\n' +
          '    "landscape" => ' + (isLandscape ? 'true' : 'false') +
          (pass ? ',\n    "password" => "' + pass + '"' : '') + '\n' +
          ']));\n' +
          'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n' +
          '$pdf = curl_exec($ch);\n' +
          'file_put_contents("document.pdf", $pdf);';
      }

      pre.innerText = code;
    };

    window.copyCurrentSnippet = function() {
      const pre = document.getElementById('playground-snippet-code');
      const btn = document.getElementById('btn-copy-snippet');
      if (pre && btn) {
        navigator.clipboard.writeText(pre.innerText);
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>✅ Copied!</span>';
        setTimeout(function() {
          btn.innerHTML = originalText;
        }, 1800);
      }
    };

    window.loadPlaygroundPreset = function(presetName) {
      window.setPlaygroundMode('editor');
      const editor = document.getElementById('playground-editor');
      const formatSelect = document.getElementById('playground-format');
      if (editor && window.playgroundPresets[presetName]) {
        editor.value = window.playgroundPresets[presetName];
      }
      if (formatSelect) {
        if (presetName === 'ticket') {
          formatSelect.value = 'A4-landscape';
        } else {
          formatSelect.value = 'A4';
        }
      }
      ['invoice', 'ticket', 'receipt', 'certificate', 'badge'].forEach(function(p) {
        const btn = document.getElementById('btn-pre-' + p);
        if (btn) {
          if (p === presetName) {
            btn.className = 'px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white';
          } else {
            btn.className = 'px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white';
          }
        }
      });
      window.renderPlaygroundPdf();
    };

    window.renderPlaygroundPdf = async function() {
      const editor = document.getElementById('playground-editor');
      const urlInput = document.getElementById('playground-url-input');
      const formatSelect = document.getElementById('playground-format');
      const headerFooterCb = document.getElementById('playground-header-footer');
      const passwordInput = document.getElementById('playground-password');
      const btn = document.getElementById('playground-render-btn');
      const loader = document.getElementById('playground-loading');
      const iframe = document.getElementById('playground-iframe');
      const timeBadge = document.getElementById('playground-time');
      const downloadBtn = document.getElementById('playground-download-btn');
      const statusBadge = document.getElementById('playground-status-badge');

      const isUrlMode = window.currentPlaygroundMode === 'url';
      if (isUrlMode) {
        if (!urlInput || !urlInput.value.trim()) {
          alert('Please enter a target URL');
          return;
        }
      } else {
        if (!editor || !editor.value) return;
      }

      const formatVal = formatSelect ? formatSelect.value : 'A4';
      const isLandscape = formatVal.includes('landscape');
      const paperFormat = isLandscape ? 'A4' : formatVal;

      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Rendering...</span>';
      loader.classList.remove('hidden');
      statusBadge.innerText = 'Rendering...';
      statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-500/30 font-bold';

      const startTime = performance.now();

      const payload = {
        format: paperFormat,
        landscape: isLandscape
      };

      if (isUrlMode) {
        payload.url = urlInput.value.trim();
      } else {
        payload.html = editor.value;
      }

      if (headerFooterCb && headerFooterCb.checked) {
        payload.header_html = '<div style="font-size: 8px; color: #64748b; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;"><span>Tailprint PDF Engine</span><span class="date"></span></div>';
        payload.footer_html = '<div style="font-size: 8px; color: #64748b; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; border-top: 1px solid #e2e8f0; padding-top: 3px;"><span>Confidential Document</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>';
      }

      if (passwordInput && passwordInput.value.trim()) {
        payload.password = passwordInput.value.trim();
      }

      try {
        const res = await fetch('/v1/render/playground', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(function() { return {}; });
          alert('Render error: ' + (errData.message || 'Failed to render PDF'));
          statusBadge.innerText = 'Error';
          statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-500/30 font-bold';
          return;
        }

        const duration = Math.round(performance.now() - startTime);
        timeBadge.innerText = duration + 'ms';
        statusBadge.innerText = 'Rendered (' + duration + 'ms)' + (payload.password ? ' 🔒' : '');
        statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold';

        const pdfBlob = await res.blob();
        const blobUrl = URL.createObjectURL(pdfBlob);
        iframe.src = blobUrl;
        downloadBtn.href = blobUrl;
        downloadBtn.classList.remove('hidden');
      } catch (err) {
        alert('Network error: ' + err.message);
      } finally {
        loader.classList.add('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Render PDF</span>';
      }
    };

    // Auto-initialize playground editor on page load
    setTimeout(function() {
      const editor = document.getElementById('playground-editor');
      if (editor && !editor.value) {
        editor.value = window.playgroundPresets.invoice;
        window.renderPlaygroundPdf();
      }
    }, 100);

    window.runLiveScrape = async function() {
      const input = document.getElementById('scraper-input');
      const btn = document.getElementById('scraper-btn');
      const output = document.getElementById('scraper-output');
      const savings = document.getElementById('metric-savings');
      const tokens = document.getElementById('metric-tokens');
      const words = document.getElementById('metric-words');
      const cache = document.getElementById('metric-cache');

      if (!input || !input.value) {
        alert('Please enter a valid URL');
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Extracting...';

      try {
        const res = await fetch('/v1/scrape/markdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input.value, strip_images: true })
        });
        const data = await res.json();
        if (data.markdown) {
          output.innerText = data.markdown;
          savings.innerText = data.token_savings_percent;
          tokens.innerText = data.estimated_tokens;
          words.innerText = data.word_count;
          cache.innerText = data.cached ? 'HIT (Redis)' : 'MISS (Fresh)';
        } else {
          alert('Error: ' + (data.message || 'Failed to scrape page'));
        }
      } catch (err) {
        alert('Request failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = '⚡ Scrape to Markdown';
      }
    };

    window.copyScrapedMarkdown = function() {
      const output = document.getElementById('scraper-output');
      if (output && output.innerText) {
        navigator.clipboard.writeText(output.innerText).then(() => {
          alert('Cleaned Markdown copied to clipboard!');
        });
      }
    };

    window.switchTab = function(tabName) {
      document.querySelectorAll('.template-panel').forEach(function(p) {
        p.classList.add('hidden');
      });
      const activePanel = document.getElementById('tab-' + tabName);
      if (activePanel) {
        activePanel.classList.remove('hidden');
      }

      ${JSON.stringify(TEMPLATES.map((t) => t.id))}.forEach(function(id) {
        const btn = document.getElementById('btn-' + id);
        if (btn) {
          if (id === tabName) {
            btn.className = 'px-4 py-2 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition flex items-center space-x-2';
          } else {
            btn.className = 'px-4 py-2 rounded-xl font-bold text-xs bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition flex items-center space-x-2';
          }
        }
      });
    };

    window.copyHtml = function(key) {
      const html = templatesData[key];
      if (!html) return;
      navigator.clipboard.writeText(html).then(function() {
        alert('Tailwind HTML copied to clipboard!');
      }).catch(function(err) {
        console.error('Clipboard copy failed:', err);
      });
    };

    window.copyCurl = function(key) {
      const html = templatesData[key];
      if (!html) return;
      const meta = templateMeta[key] || { landscape: false, isImage: false };
      const endpoint = meta.isImage ? '/v1/render/image' : '/v1/render/pdf';
      const outputExt = meta.isImage ? 'png' : 'pdf';
      
      const payloadObj = meta.isImage
        ? { width: 1200, height: 630, type: 'png', html: html }
        : { format: 'A4', landscape: meta.landscape, html: html };

      const jsonStr = JSON.stringify(payloadObj);
      const cmd = 'curl -X POST ' + window.location.origin + endpoint + ' ' +
        '-H "Authorization: Bearer sec_live_dev_test_key_12345" ' +
        '-H "Content-Type: application/json" ' +
        '--data-raw ' + JSON.stringify(jsonStr) + ' ' +
        '--output ' + key + '.' + outputExt;

      navigator.clipboard.writeText(cmd).then(function() {
        alert('cURL command copied to clipboard!');
      }).catch(function(err) {
        console.error('Clipboard copy failed:', err);
      });
    };

    window.mcpSnippets = {
      claude: JSON.stringify({
        mcpServers: {
          renderengine: {
            command: "npx",
            args: ["-y", "eaas-render-engine", "mcp"],
            env: {
              RENDERENGINE_API_KEY: "sec_live_your_key_here"
            }
          }
        }
      }, null, 2),
      cursor: JSON.stringify({
        mcpServers: {
          renderengine: {
            command: "node",
            args: ["./dist/mcp/stdio.js"],
            env: {
              RENDERENGINE_API_KEY: "sec_live_your_key_here"
            }
          }
        }
      }, null, 2),
      sse: "# Remote MCP via Server-Sent Events (SSE)\\n" +
           "URL: " + window.location.origin + "/v1/mcp/sse?api_key=sec_live_your_key_here\\n" +
           "POST Messages: " + window.location.origin + "/v1/mcp/messages\\n\\n" +
           "# Header Auth Option:\\n" +
           "Authorization: Bearer sec_live_your_key_here"
    };

    window.switchMcpTab = function(type) {
      const block = document.getElementById('mcp-code-block');
      const hint = document.getElementById('mcp-hint');
      const tabs = ['claude', 'cursor', 'sse'];
      
      tabs.forEach(function(t) {
        const btn = document.getElementById('btn-mcp-' + t);
        if (btn) {
          if (t === type) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white';
          } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white';
          }
        }
      });

      if (type === 'claude') {
        block.innerText = window.mcpSnippets.claude;
        hint.innerHTML = 'Add this snippet to <code class="text-indigo-300">~/Library/Application Support/Claude/claude_desktop_config.json</code> on macOS.';
      } else if (type === 'cursor') {
        block.innerText = window.mcpSnippets.cursor;
        hint.innerHTML = 'Add this snippet to your project root under <code class="text-indigo-300">.cursor/mcp.json</code>.';
      } else if (type === 'sse') {
        block.innerText = window.mcpSnippets.sse;
        hint.innerHTML = 'Directly connect web agents, custom GPTs, LangChain, or remote LLM runtimes to this live endpoint.';
      }
    };

    window.copyMcpSnippet = function() {
      const block = document.getElementById('mcp-code-block');
      if (!block) return;
      navigator.clipboard.writeText(block.innerText).then(function() {
        alert('MCP configuration copied to clipboard!');
      });
    };

    window.startCheckout = async function(planId) {
      try {
        const res = await fetch('/v1/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: planId })
        });
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert('Checkout session created: ' + data.sessionId);
        }
      } catch (err) {
        alert('Failed to initiate checkout: ' + err.message);
      }
    };

    // Auto-detect Stripe Checkout return and reveal live API key
    (function checkCheckoutSuccess() {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get('checkout_success') === 'true';
      const sessionId = urlParams.get('session_id');

      if (!isSuccess || !sessionId) return;

      const modal = document.getElementById('success-modal');
      const keyEl = document.getElementById('revealed-api-key');
      const curlEl = document.getElementById('revealed-curl');
      if (modal) modal.classList.remove('hidden');

      let attempts = 0;
      const maxAttempts = 15;

      async function fetchKey() {
        try {
          const res = await fetch('/v1/billing/session-key?session_id=' + encodeURIComponent(sessionId));
          const data = await res.json();
          if (data.status === 'ready' && data.apiKey) {
            keyEl.innerText = data.apiKey;
            keyEl.className = 'font-mono text-sm text-emerald-400 break-all bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/40 font-bold';
            const sq = String.fromCharCode(39);
            const demoPayload = '{"html":"<h1 class=\\"text-2xl font-bold text-indigo-600\\">Hello from Tailprint</h1>"}';
            curlEl.innerText = 'curl -X POST ' + window.location.origin + '/v1/render/pdf \\\n' +
              '  -H "Authorization: Bearer ' + data.apiKey + '" \\\n' +
              '  -H "Content-Type: application/json" \\\n' +
              '  -d ' + sq + demoPayload + sq + ' \\\n' +
              '  --output test.pdf';
            return;
          }
        } catch {}

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(fetchKey, 1200);
        } else {
          keyEl.innerText = 'Key provisioned! Check your Stripe confirmation email.';
        }
      }

      fetchKey();
    })();

    window.copyRevealedKey = function() {
      const keyEl = document.getElementById('revealed-api-key');
      if (!keyEl || !keyEl.innerText) return;
      navigator.clipboard.writeText(keyEl.innerText).then(function() {
        const btn = document.getElementById('copy-revealed-key-btn');
        if (btn) btn.innerHTML = '<span>✅ Copied!</span>';
        setTimeout(function() { if (btn) btn.innerHTML = '<span>📋 Copy Key</span>'; }, 2000);
      });
    };

    window.closeSuccessModal = function() {
      const modal = document.getElementById('success-modal');
      if (modal) modal.classList.add('hidden');
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    window.openFreeKeyModal = function() {
      const modal = document.getElementById('free-key-modal');
      const formView = document.getElementById('free-key-form-view');
      const successView = document.getElementById('free-key-success-view');
      const errEl = document.getElementById('free-key-error');
      if (modal) modal.classList.remove('hidden');
      if (formView) formView.classList.remove('hidden');
      if (successView) successView.classList.add('hidden');
      if (errEl) errEl.classList.add('hidden');
    };

    window.closeFreeKeyModal = function() {
      const modal = document.getElementById('free-key-modal');
      if (modal) modal.classList.add('hidden');
    };

    window.handleClaimFreeKey = async function(e) {
      e.preventDefault();
      const emailInput = document.getElementById('free-key-email');
      const btn = document.getElementById('free-key-submit-btn');
      const errEl = document.getElementById('free-key-error');
      const formView = document.getElementById('free-key-form-view');
      const successView = document.getElementById('free-key-success-view');
      const keyDisplay = document.getElementById('free-key-display');
      const curlDisplay = document.getElementById('free-key-curl');

      if (!emailInput || !emailInput.value) return;

      btn.disabled = true;
      btn.innerHTML = '<span>Provisioning Key...</span>';
      if (errEl) errEl.classList.add('hidden');

      try {
        const res = await fetch('/v1/auth/claim-free-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          errEl.innerText = data.message || 'Failed to claim key. Please try again.';
          errEl.classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = '<span>Claim 100 Free Renders ⚡</span>';
          return;
        }

        localStorage.setItem('tailprint_api_key', data.apiKey);
        keyDisplay.innerText = data.apiKey;

        const sq = String.fromCharCode(39);
        const demoPayload = '{"html":"<h1 class=\\"text-2xl font-bold text-indigo-600\\">Hello from Tailprint</h1>"}';
        curlDisplay.innerText = 'curl -X POST ' + window.location.origin + '/v1/render/pdf \\\n' +
          '  -H "Authorization: Bearer ' + data.apiKey + '" \\\n' +
          '  -H "Content-Type: application/json" \\\n' +
          '  -d ' + sq + demoPayload + sq + ' \\\n' +
          '  --output invoice.pdf';

        formView.classList.add('hidden');
        successView.classList.remove('hidden');
      } catch (err) {
        errEl.innerText = 'Network error. Please try again.';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<span>Claim 100 Free Renders ⚡</span>';
      }
    };

    window.copyFreeKey = function() {
      const keyDisplay = document.getElementById('free-key-display');
      if (!keyDisplay || !keyDisplay.innerText) return;
      navigator.clipboard.writeText(keyDisplay.innerText).then(function() {
        const btn = document.getElementById('copy-free-key-btn');
        if (btn) btn.innerText = 'Copied!';
        setTimeout(function() { if (btn) btn.innerText = 'Copy'; }, 2000);
      });
    };
  </script>
</body>
</html>`;

      return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
    }
  );
};
