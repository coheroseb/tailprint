import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { carouselService } from '../services/carousel.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { visualDiffService } from '../services/visualDiff.js';
import { mockupService } from '../services/mockup.js';
import { reelService } from '../services/reel.js';
import { canvaLogoService } from '../services/canvaLogo.js';
import { storageService } from '../services/storage.js';
import { redisService } from '../services/redis.js';
import { qrService } from '../services/qr.js';
import { env } from '../config/env.js';
import { renderGlobalNavbar } from '../components/navbar.js';

const reelSessionEmitter = new EventEmitter();
reelSessionEmitter.setMaxListeners(200);

export const toolsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Shared Header & Navigation Component
  function renderHeader(activeTool?: string) {
    return renderGlobalNavbar({ activeSection: 'tools', activeTool });
  }

  // Shared Conversion Callout Box
  function renderConversionCallout(featureName: string, exampleCode: string) {
    return `
  <section class="max-w-5xl mx-auto px-6 py-12">
    <div class="p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div class="md:col-span-7 space-y-4">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
            <span>Automate ${featureName} via API & MCP</span>
          </div>
          <h3 class="text-2xl font-black text-white tracking-tight">Need to generate thousands of ${featureName} automatically?</h3>
          <p class="text-slate-400 text-sm leading-relaxed">
            Tailprint provides high-speed cloud execution, sub-500ms caching, and 13 native MCP tools for Claude Desktop, Cursor, and backend microservices.
          </p>
          <div class="flex flex-wrap items-center gap-3 pt-2">
            <a href="/#pricing" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2">
              <span>Claim 100 Free API Renders</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-700 font-black uppercase">No Card</span>
            </a>
            <a href="/docs" target="_blank" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition flex items-center space-x-1.5 border border-slate-700">
              <span>View API Docs</span>
              <span>→</span>
            </a>
          </div>
        </div>
        <div class="md:col-span-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-indigo-200 overflow-x-auto shadow-inner leading-relaxed">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-500">
            <span>cURL Integration</span>
            <span class="text-emerald-400 font-bold">HTTP/2</span>
          </div>
          <pre class="whitespace-pre">${exampleCode}</pre>
        </div>
      </div>
    </div>
  </section>`;
  }

  // ==========================================
  // PAGE 1: /tools (Tools Hub)
  // ==========================================
  fastify.get('/tools', { schema: { hide: true } }, async (_request, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Free Developer Tools - Tailprint</title>
  <meta name="description" content="Free online tools powered by Tailprint API: LinkedIn Carousel Generator, EU Factur-X & PEPPOL E-Invoice Creator, and Visual Regression Diff Heatmap." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader()}

  <main class="max-w-6xl mx-auto px-6 py-16 flex-1 w-full space-y-16">
    <div class="text-center max-w-3xl mx-auto space-y-4">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
        <span>100% Free Online Utilities • No Account Required</span>
      </div>
      <h1 class="text-4xl sm:text-5xl font-black text-white tracking-tight">
        Free Document &amp; Testing <span class="bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Superpowers</span>
      </h1>
      <p class="text-slate-400 text-base leading-relaxed">
        High-utility developer and creator tools running directly on Tailprint's Chromium engine. Try them in the browser or automate them via our native MCP server and REST API.
      </p>
    </div>

    <!-- 5 Core Tools Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Tool Card 0: Live Interactive Template Studio (Featured Banner) -->
      <a href="/studio" class="md:col-span-2 p-8 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 hover:border-purple-400 transition shadow-2xl group flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
        <div class="space-y-4 max-w-xl">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            <span>Flagship Feature • Zero-Latency Live Preview</span>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-300 transition">Interactive Template Studio</h2>
            <p class="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              In-browser visual Tailwind CSS code editor with instant live canvas preview. Features the <strong>Smart Pagination Shield</strong> to eliminate broken table rows, repeat <code>&lt;thead&gt;</code> headers on multi-page PDFs, and export instant vector PDFs, PNGs, and API code.
            </p>
          </div>
          <div class="flex items-center space-x-3 text-xs font-bold text-purple-400 pt-2">
            <span>Launch Studio Workspace</span>
            <span class="group-hover:translate-x-1.5 transition">→</span>
          </div>
        </div>
        <div class="mt-6 md:mt-0 px-6 py-5 rounded-2xl bg-slate-950/80 border border-purple-500/30 text-center shrink-0">
          <span class="text-4xl">⚡</span>
          <p class="text-sm font-bold text-white mt-2">43 Templates</p>
          <p class="text-[11px] text-purple-300 font-medium">Smart Pagination Ready</p>
        </div>
      </a>

      <!-- Tool Card 1: LinkedIn Carousel -->
      <a href="/tools/carousel" class="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500 transition shadow-xl group flex flex-col justify-between relative overflow-hidden">
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl border border-indigo-500/20 group-hover:scale-110 transition">
            📱
          </div>
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 uppercase">LinkedIn &amp; Instagram</span>
            <h2 class="text-xl font-bold text-white mt-2 group-hover:text-indigo-400 transition">Multi-Slide Carousel Maker</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Transform simple Markdown bullet points into a high-converting 1080x1350 px portrait multi-page PDF ready to upload directly to LinkedIn.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400">
          <span>Open Carousel Maker</span>
          <span class="group-hover:translate-x-1 transition">→</span>
        </div>
      </a>

      <!-- Tool Card 1.5: AI Social Reel & Short Video Maker -->
      <a href="/tools/reel" class="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-rose-500 transition shadow-xl group flex flex-col justify-between relative overflow-hidden">
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-2xl border border-rose-500/20 group-hover:scale-110 transition">
            🎬
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40 uppercase">Reels, TikTok &amp; Shorts</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">NEW</span>
            </div>
            <h2 class="text-xl font-bold text-white mt-2 group-hover:text-rose-400 transition">AI Social Reel &amp; Video Maker</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Paste any URL or article and convert it into a vertical 9:16 (1080×1920) animated Reel / Story with live screen recordings, visual layouts, and instant MP4 download.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-rose-400">
          <span>Create 9:16 Reel</span>
          <span class="group-hover:translate-x-1 transition">→</span>
        </div>
      </a>

      <!-- Tool Card 1.8: AI Logo to Canva Vector Studio -->
      <a href="/tools/canva-logo" class="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500 transition shadow-xl group flex flex-col justify-between relative overflow-hidden">
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl border border-cyan-500/20 group-hover:scale-110 transition">
            🎨
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">Canva &amp; Brand Design</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">NEW</span>
            </div>
            <h2 class="text-xl font-bold text-white mt-2 group-hover:text-cyan-400 transition">AI Logo to Canva Vector Studio</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Convert any flat AI-generated logo (Midjourney, ChatGPT, Ideogram) into 100% editable Canva vector color layers and real double-clickable text boxes.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-400">
          <span>Vectorize Logo for Canva</span>
          <span class="group-hover:translate-x-1 transition">→</span>
        </div>
      </a>

      <!-- Tool Card 2: EU Factur-X / PEPPOL -->
      <a href="/tools/factur-x" class="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500 transition shadow-xl group flex flex-col justify-between relative overflow-hidden">
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl border border-emerald-500/20 group-hover:scale-110 transition">
            🇪🇺
          </div>
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 uppercase">EN 16931 Standard</span>
            <h2 class="text-xl font-bold text-white mt-2 group-hover:text-emerald-400 transition">Factur-X E-Invoice Generator</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Create official European hybrid electronic invoices with embedded CrossIndustryInvoice XML. Legally compliant and auto-ingestible by DATEV, SAP &amp; Dinero.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
          <span>Create Factur-X Invoice</span>
          <span class="group-hover:translate-x-1 transition">→</span>
        </div>
      </a>

      <!-- Tool Card 3: Visual Diff -->
      <a href="/tools/visual-diff" class="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-pink-500 transition shadow-xl group flex flex-col justify-between relative overflow-hidden">
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center text-2xl border border-pink-500/20 group-hover:scale-110 transition">
            🔍
          </div>
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-800/40 uppercase">QA &amp; CI/CD</span>
            <h2 class="text-xl font-bold text-white mt-2 group-hover:text-pink-400 transition">Visual Regression Diff Heatmap</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Compare two live web URLs or staging environments pixel-by-pixel with pixelmatch. Spot unintended CSS layout shifts with a neon-pink diff heatmap.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-pink-400">
          <span>Launch Visual Diff</span>
          <span class="group-hover:translate-x-1 transition">→</span>
        </div>
      </a>

      <!-- Tool Card 4: Device Mockup Generator -->
      <a href="/tools/mockup" class="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500 transition shadow-xl group flex flex-col justify-between relative overflow-hidden">
        <div class="space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/20 group-hover:scale-110 transition">
            📸
          </div>
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 uppercase">Founders &amp; Marketers</span>
            <h2 class="text-xl font-bold text-white mt-2 group-hover:text-amber-400 transition">Instant Device Mockup Generator</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Transform any website URL into a multi-device presentation scene with 3D MacBook Pro &amp; iPhone frames. Perfect for Product Hunt, pitch decks &amp; Twitter.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400">
          <span>Create Device Mockup</span>
          <span class="group-hover:translate-x-1 transition">→</span>
        </div>
      </a>

    </div>

    ${renderConversionCallout(
      'Document Generation',
      'curl -X POST https://tailprint.com/v1/render/pdf \\\n' +
        '  -H "Authorization: Bearer sec_live_..." \\\n' +
        '  -H "Content-Type: application/json" \\\n' +
        '  -d \'{"html": "<h1 class=\\"text-2xl font-bold\\">Automated PDF</h1>"}\' \\\n' +
        '  --output output.pdf'
    )}
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>
</body>
</html>`;
    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  });

  // ==========================================
  // PAGE 2: /tools/carousel (LinkedIn Carousel Maker)
  // ==========================================
  const carouselHandler = async (_request: any, reply: any) => {
    const defaultMarkdown = `# Rule 1: Automate Visuals
Never take manual screenshots when an API can render pixel-perfect cards.
Tag: EFFICIENCY
Takeaway: Speed always wins.
---
# Rule 2: Keep LLM Contexts Lean
Strip extraneous DOM elements, trackers, and cookie banners.
Tag: TOKENS
Takeaway: 90%+ context window savings.
---
# Rule 3: Use Native Standards
Deploy hybrid Factur-X PDFs and vector assets directly.
Tag: COMPLIANCE
Takeaway: Ready for modern accounting software.
---
# Ready to Scale?
Integrate Tailprint MCP into Claude Desktop or Cursor in 30 seconds.
Tag: GET STARTED
Takeaway: Visit tailprint.com for 100 free renders.`;

    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Free LinkedIn Carousel Generator (Markdown to PDF) - Tailprint</title>
  <meta name="description" content="Turn simple Markdown text into a viral 1080x1350 px portrait multi-page PDF carousel for LinkedIn. Free online generator powered by Tailprint." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader('LinkedIn Carousel')}

  <main class="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-12">
    <!-- Header -->
    <div class="text-center max-w-3xl mx-auto space-y-3">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
        <span>1080x1350 px (4:5 Portrait Ratio) • LinkedIn Standard</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        Free LinkedIn Carousel Generator
      </h1>
      <p class="text-slate-400 text-sm">
        Write slides in clean Markdown separated by <code class="text-indigo-300 font-mono">---</code>. Download an upload-ready multi-page PDF document.
      </p>
    </div>

    <!-- Studio Grid (Editor + Preview) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left Column: Controls & Markdown Editor (6 cols) -->
      <div class="lg:col-span-6 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
        
        <!-- Metadata Row -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Author Name</label>
            <input id="carousel-author-name" type="text" value="Tailprint Insights" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Handle / Role</label>
            <input id="carousel-author-handle" type="text" value="@tailprint" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Visual Theme</label>
            <select id="carousel-theme" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium">
              <option value="dark" selected>Midnight Dark</option>
              <option value="light">Studio Light</option>
              <option value="emerald">Emerald Tech</option>
              <option value="gradient">Cosmic Gradient</option>
            </select>
          </div>
        </div>

        <!-- Markdown Input Area -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Slide Markdown Content</label>
            <span class="text-[10px] text-slate-500 font-mono">Separate slides with "---"</span>
          </div>
          <textarea id="carousel-markdown" rows="12" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-4 text-xs font-mono focus:outline-none focus:border-indigo-500 leading-relaxed">${defaultMarkdown}</textarea>
        </div>

        <!-- Action Button -->
        <div class="flex items-center justify-between pt-2">
          <span id="rate-limit-hint" class="text-[11px] text-slate-500">Free sandbox (max 25 renders/hr)</span>
          <button id="btn-generate-carousel" onclick="generateCarousel()" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2">
            <span>⚡ Generate Carousel PDF</span>
          </button>
        </div>
      </div>

      <!-- Right Column: Live Output & Download (6 cols) -->
      <div class="lg:col-span-6 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col items-center justify-center min-h-[460px] text-center space-y-4">
        
        <div id="carousel-state-empty" class="space-y-4 max-w-sm">
          <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-3xl mx-auto border border-indigo-500/20">
            📑
          </div>
          <h3 class="text-lg font-bold text-white">Your Carousel Preview</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Click <strong>"Generate Carousel PDF"</strong> on the left. Tailprint will render each slide into a 1080x1350 vector page and combine them into a single PDF.
          </p>
        </div>

        <div id="carousel-state-loading" class="hidden space-y-4">
          <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs text-indigo-300 font-semibold">Compiling high-DPI slides with Playwright...</p>
        </div>

        <div id="carousel-state-result" class="hidden w-full space-y-4 text-left">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span id="result-slide-count" class="text-xs font-bold text-white">4 Slides Generated</span>
              <p class="text-[10px] text-slate-400">1080x1350 px (Vector PDF)</p>
            </div>
            <div class="flex items-center space-x-2">
              <a id="btn-download-pdf" href="#" download="linkedin-carousel.pdf" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center space-x-1.5">
                <span>📥 Download PDF</span>
              </a>
            </div>
          </div>

          <!-- Cover Image Preview -->
          <div class="rounded-xl overflow-hidden border border-slate-800 max-h-96 flex items-center justify-center bg-slate-950">
            <img id="result-preview-img" src="" alt="Slide Preview" class="max-h-96 object-contain" />
          </div>

          <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p class="text-slate-200 font-bold">How to post on LinkedIn:</p>
            <p>1. Start a post on LinkedIn and click the <strong>Document icon</strong> (📄).</p>
            <p>2. Select the downloaded PDF file — LinkedIn turns it into an interactive swipeable carousel!</p>
          </div>
        </div>

      </div>

    </div>

    ${renderConversionCallout(
      'LinkedIn Carousels',
      '// Inside Claude Desktop or Cursor MCP:\n' +
        '"Turn my blog post into a 5-slide dark theme\n' +
        ' carousel for LinkedIn and return the PDF link"\n\n' +
        '// Tool executed: render_carousel\n' +
        '// Generated in 1.4 seconds'
    )}
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>

  <script>
    async function generateCarousel() {
      const btn = document.getElementById('btn-generate-carousel');
      const emptyState = document.getElementById('carousel-state-empty');
      const loadingState = document.getElementById('carousel-state-loading');
      const resultState = document.getElementById('carousel-state-result');
      
      const authorName = document.getElementById('carousel-author-name').value;
      const authorHandle = document.getElementById('carousel-author-handle').value;
      const theme = document.getElementById('carousel-theme').value;
      const markdown = document.getElementById('carousel-markdown').value;

      btn.disabled = true;
      emptyState.classList.add('hidden');
      resultState.classList.add('hidden');
      loadingState.classList.remove('hidden');

      try {
        const res = await fetch('/v1/tools/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author_name: authorName,
            author_handle: authorHandle,
            theme: theme,
            markdown: markdown
          })
        });

        const data = await res.json();
        if (!res.ok) {
          alert('Error: ' + (data.message || 'Generation failed'));
          emptyState.classList.remove('hidden');
          return;
        }

        document.getElementById('result-slide-count').innerText = data.slideCount + ' Slides Generated (1080x1350)';
        document.getElementById('btn-download-pdf').href = data.pdfUrl;
        document.getElementById('result-preview-img').src = data.previewUrl;

        resultState.classList.remove('hidden');
      } catch (err) {
        alert('Network error: ' + err.message);
        emptyState.classList.remove('hidden');
      } finally {
        loadingState.classList.add('hidden');
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/tools/carousel', { schema: { hide: true } }, carouselHandler);
  fastify.get('/carousel', { schema: { hide: true } }, carouselHandler);

  // ==========================================
  // PAGE 3: /tools/factur-x (EU E-Invoice Generator)
  // ==========================================
  const facturXHandler = async (_request: any, reply: any) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Free EU Factur-X / PEPPOL E-Invoice Generator - Tailprint</title>
  <meta name="description" content="Generate legally compliant European hybrid electronic invoices (Factur-X / ZUGFeRD 2.2 / EN 16931) with embedded CII XML. Free generator powered by Tailprint." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader('Factur-X E-Invoice')}

  <main class="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-12">
    <!-- Header -->
    <div class="text-center max-w-3xl mx-auto space-y-3">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
        <span>🇪🇺 Standard EN 16931 • Factur-X / ZUGFeRD 2.2 • PEPPOL Compliant</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        Free EU Factur-X E-Invoice Generator
      </h1>
      <p class="text-slate-400 text-sm">
        Renders a beautiful visual PDF with valid machine-readable <code class="text-emerald-300 font-mono">factur-x.xml</code> embedded in the PDF catalog. Ingestible by SAP, DATEV, Dinero, and Chorus Pro.
      </p>
    </div>

    <!-- Generator Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Form Controls (7 cols) -->
      <div class="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6">
        
        <!-- Row 1: Invoice Meta -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-800">
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Number</label>
            <input id="fe-invoice-num" type="text" value="INV-2026-0042" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Currency</label>
            <select id="fe-currency" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500">
              <option value="EUR" selected>EUR (€)</option>
              <option value="DKK">DKK (kr.)</option>
              <option value="USD">USD ($)</option>
              <option value="SEK">SEK (kr)</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
            <input id="fe-due-date" type="date" value="2026-03-31" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <!-- Row 2: Seller & Buyer Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4 border-b border-slate-800">
          <!-- Seller -->
          <div class="space-y-3">
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Seller (Supplier)</span>
            <input id="fe-seller-name" type="text" value="Nordic Software ApS" placeholder="Company Name" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
            <input id="fe-seller-vat" type="text" value="DK12345678" placeholder="VAT / CVR Number" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono" />
            <input id="fe-seller-street" type="text" value="Vesterbrogade 12" placeholder="Street Address" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
            <div class="grid grid-cols-2 gap-2">
              <input id="fe-seller-city" type="text" value="Copenhagen" placeholder="City" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
              <input id="fe-seller-country" type="text" value="DK" placeholder="Country (2-letter)" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs uppercase font-mono" />
            </div>
          </div>

          <!-- Buyer -->
          <div class="space-y-3">
            <span class="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Buyer (Customer)</span>
            <input id="fe-buyer-name" type="text" value="Enterprise Client GmbH" placeholder="Client Name" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
            <input id="fe-buyer-vat" type="text" value="DE987654321" placeholder="Buyer VAT ID" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono" />
            <input id="fe-buyer-street" type="text" value="Friedrichstraße 40" placeholder="Street Address" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
            <div class="grid grid-cols-2 gap-2">
              <input id="fe-buyer-city" type="text" value="Berlin" placeholder="City" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
              <input id="fe-buyer-country" type="text" value="DE" placeholder="Country (2-letter)" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs uppercase font-mono" />
            </div>
          </div>
        </div>

        <!-- Row 3: Line Items -->
        <div class="space-y-3 pb-4 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Line Items</span>
          </div>
          <div class="grid grid-cols-12 gap-2 text-[11px]">
            <input id="fe-item-name" type="text" value="Cloud Engineering & Security Retainer" placeholder="Item Description" class="col-span-6 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs" />
            <input id="fe-item-qty" type="number" value="20" placeholder="Qty" class="col-span-2 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-center" />
            <input id="fe-item-price" type="number" value="150" placeholder="Unit Price" class="col-span-2 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-right" />
            <input id="fe-item-vat" type="number" value="25" placeholder="VAT %" class="col-span-2 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-center" />
          </div>
        </div>

        <!-- Row 4: Bank Payment Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank IBAN</label>
            <input id="fe-iban" type="text" value="DK5000400440116243" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank BIC / SWIFT</label>
            <input id="fe-bic" type="text" value="DABA2100" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono" />
          </div>
        </div>

        <button id="btn-generate-einvoice" onclick="generateEInvoice()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2">
          <span>⚡ Generate Factur-X Hybrid PDF</span>
        </button>
      </div>

      <!-- Result View (5 cols) -->
      <div class="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col items-center justify-center min-h-[500px] text-center space-y-4">
        
        <div id="einvoice-state-empty" class="space-y-4 max-w-sm">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/20">
            🧾
          </div>
          <h3 class="text-lg font-bold text-white">Hybrid E-Invoice Preview</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Fill in the billing details and click <strong>"Generate Factur-X Hybrid PDF"</strong>. Your file will have the valid EN 16931 XML directly embedded in the PDF catalog.
          </p>
        </div>

        <div id="einvoice-state-loading" class="hidden space-y-4">
          <div class="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs text-emerald-300 font-semibold">Generating visual A4 PDF &amp; embedding factur-x.xml...</p>
        </div>

        <div id="einvoice-state-result" class="hidden w-full space-y-4 text-left">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span id="result-invoice-total" class="text-base font-black text-emerald-400">Total: 3,750.00 EUR</span>
              <p class="text-[10px] text-slate-400">Factur-X / ZUGFeRD 2.2 Compliant</p>
            </div>
            <a id="btn-download-einvoice" href="#" download="factur-x-invoice.pdf" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center space-x-1.5">
              <span>📥 Download PDF</span>
            </a>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div class="flex items-center justify-between text-slate-400">
              <span>Embedded Attachment:</span>
              <span class="font-mono text-emerald-300 font-bold">factur-x.xml</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Standard:</span>
              <span class="font-mono text-slate-200">urn:cen.eu:en16931:2017</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Object Compression:</span>
              <span class="text-slate-200">Uncompressed XRef (Legacy ERP Safe)</span>
            </div>
          </div>

          <!-- XML Preview Snippet -->
          <div>
            <span class="text-[11px] font-bold text-slate-400 block mb-1">Embedded XML Snippet:</span>
            <pre id="result-xml-preview" class="p-3 bg-slate-950 rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 border border-slate-800 leading-relaxed"></pre>
          </div>
        </div>

      </div>

    </div>

    ${renderConversionCallout(
      'Factur-X Invoicing',
      '// Inside Claude Desktop or Cursor MCP:\n' +
        '"Issue a Factur-X invoice to BMW AG for\n' +
        ' 40h consulting at 150 EUR/hr with 25% VAT"\n\n' +
        '// Tool executed: generate_einvoice\n' +
        '// PDF + factur-x.xml compiled in 800ms'
    )}
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>

  <script>
    async function generateEInvoice() {
      const btn = document.getElementById('btn-generate-einvoice');
      const emptyState = document.getElementById('einvoice-state-empty');
      const loadingState = document.getElementById('einvoice-state-loading');
      const resultState = document.getElementById('einvoice-state-result');

      const payload = {
        invoiceNumber: document.getElementById('fe-invoice-num').value,
        currency: document.getElementById('fe-currency').value,
        dueDate: document.getElementById('fe-due-date').value,
        seller: {
          name: document.getElementById('fe-seller-name').value,
          vatId: document.getElementById('fe-seller-vat').value,
          street: document.getElementById('fe-seller-street').value,
          city: document.getElementById('fe-seller-city').value,
          country: document.getElementById('fe-seller-country').value,
        },
        buyer: {
          name: document.getElementById('fe-buyer-name').value,
          vatId: document.getElementById('fe-buyer-vat').value,
          street: document.getElementById('fe-buyer-street').value,
          city: document.getElementById('fe-buyer-city').value,
          country: document.getElementById('fe-buyer-country').value,
        },
        lineItems: [
          {
            name: document.getElementById('fe-item-name').value,
            quantity: Number(document.getElementById('fe-item-qty').value),
            unitPrice: Number(document.getElementById('fe-item-price').value),
            vatRate: Number(document.getElementById('fe-item-vat').value),
          }
        ],
        paymentIban: document.getElementById('fe-iban').value,
        paymentBic: document.getElementById('fe-bic').value,
      };

      btn.disabled = true;
      emptyState.classList.add('hidden');
      resultState.classList.add('hidden');
      loadingState.classList.remove('hidden');

      try {
        const res = await fetch('/v1/tools/factur-x', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          alert('Error: ' + (data.message || 'Generation failed'));
          emptyState.classList.remove('hidden');
          return;
        }

        document.getElementById('result-invoice-total').innerText = 'Total Due: ' + data.grossTotal.toFixed(2) + ' ' + data.currency;
        document.getElementById('btn-download-einvoice').href = data.pdfUrl;
        document.getElementById('result-xml-preview').innerText = data.xmlSnippet;

        resultState.classList.remove('hidden');
      } catch (err) {
        alert('Network error: ' + err.message);
        emptyState.classList.remove('hidden');
      } finally {
        loadingState.classList.add('hidden');
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/tools/factur-x', { schema: { hide: true } }, facturXHandler);
  fastify.get('/factur-x', { schema: { hide: true } }, facturXHandler);

  // ==========================================
  // PAGE 4: /tools/visual-diff (Visual Regression Diff)
  // ==========================================
  const visualDiffHandler = async (_request: any, reply: any) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Free Visual Regression Diff Testing Tool - Tailprint</title>
  <meta name="description" content="Compare two website URLs pixel-by-pixel with pixelmatch. Generates a 3-panel visual diff heatmap with neon-pink highlights. Free online tool by Tailprint." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader('Visual Regression Diff')}

  <main class="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-12">
    <!-- Header -->
    <div class="text-center max-w-3xl mx-auto space-y-3">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold">
        <span>Pixelmatch Studio • 3-Panel Visual Regression Comparison</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        Free Visual Regression Diff Heatmap
      </h1>
      <p class="text-slate-400 text-sm">
        Detect unexpected layout shifts, CSS breakages, and styling regressions between two URLs. Compares pixels and highlights shifts with neon-pink.
      </p>
    </div>

    <!-- Controls & Compare Area -->
    <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div class="sm:col-span-5">
          <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Baseline URL (Before / Production)</label>
          <input id="vd-url-before" type="url" value="https://example.com" placeholder="https://example.com" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-pink-500" />
        </div>
        <div class="sm:col-span-5">
          <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comparison URL (After / Staging)</label>
          <input id="vd-url-after" type="url" value="https://iana.org" placeholder="https://staging.example.com" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-pink-500" />
        </div>
        <div class="sm:col-span-2">
          <button id="btn-run-diff" onclick="runVisualDiff()" class="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition shadow-lg shadow-pink-600/30 flex items-center justify-center space-x-1.5">
            <span>⚡ Run Diff</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Output Studio Canvas -->
    <div id="diff-container" class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl min-h-[400px] flex flex-col items-center justify-center text-center">
      <div id="diff-state-empty" class="space-y-4 max-w-sm">
        <div class="w-16 h-16 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center text-3xl mx-auto border border-pink-500/20">
          🔍
        </div>
        <h3 class="text-lg font-bold text-white">Visual Regression Studio</h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Enter two URLs above and click <strong>"Run Diff"</strong>. Tailprint captures both viewports and computes a pixel-by-pixel neon heatmap overlay.
        </p>
      </div>

      <div id="diff-state-loading" class="hidden space-y-4">
        <div class="w-10 h-10 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs text-pink-300 font-semibold">Capturing both viewports in parallel &amp; computing pixelmatch heatmap...</p>
      </div>

      <div id="diff-state-result" class="hidden w-full space-y-4 text-left">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center space-x-4">
            <span id="result-diff-badge" class="px-2.5 py-1 rounded-full bg-pink-950 text-pink-400 border border-pink-500/40 text-xs font-bold">12,410 Pixels Changed</span>
            <span id="result-diff-pct" class="text-xs font-mono text-slate-400">1.29% Layout Shift</span>
          </div>
          <a id="btn-download-diff" href="#" target="_blank" class="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 flex items-center space-x-1">
            <span>Open High-Res Diff ↗</span>
          </a>
        </div>

        <div class="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
          <img id="result-diff-img" src="" alt="Visual Diff Canvas" class="w-full object-contain rounded-lg" />
        </div>
      </div>
    </div>

    ${renderConversionCallout(
      'Visual Regression Testing',
      '// In Cursor or Claude MCP:\n' +
        '"Compare staging vs production to verify\n' +
        ' that my CSS changes didn\'t break mobile"\n\n' +
        '// Tool executed: compare_snapshots\n' +
        '// Pixelmatch diff rendered in 1.8 seconds'
    )}
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>

  <script>
    async function runVisualDiff() {
      const btn = document.getElementById('btn-run-diff');
      const emptyState = document.getElementById('diff-state-empty');
      const loadingState = document.getElementById('diff-state-loading');
      const resultState = document.getElementById('diff-state-result');

      const beforeUrl = document.getElementById('vd-url-before').value;
      const afterUrl = document.getElementById('vd-url-after').value;

      btn.disabled = true;
      emptyState.classList.add('hidden');
      resultState.classList.add('hidden');
      loadingState.classList.remove('hidden');

      try {
        const res = await fetch('/v1/tools/visual-diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            before_url: beforeUrl,
            after_url: afterUrl
          })
        });

        const data = await res.json();
        if (!res.ok) {
          alert('Error: ' + (data.message || 'Comparison failed'));
          emptyState.classList.remove('hidden');
          return;
        }

        document.getElementById('result-diff-badge').innerText = data.diffPixels.toLocaleString() + ' Pixels Changed';
        document.getElementById('result-diff-pct').innerText = data.diffPercentage.toFixed(2) + '% Layout Shift';
        document.getElementById('result-diff-img').src = data.diffImageUrl;
        document.getElementById('btn-download-diff').href = data.diffImageUrl;

        resultState.classList.remove('hidden');
      } catch (err) {
        alert('Network error: ' + err.message);
        emptyState.classList.remove('hidden');
      } finally {
        loadingState.classList.add('hidden');
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/tools/visual-diff', { schema: { hide: true } }, visualDiffHandler);
  fastify.get('/visual-diff', { schema: { hide: true } }, visualDiffHandler);

  // ==========================================
  // PAGE 5: /tools/mockup (Instant Device Mockup Generator)
  // ==========================================
  const mockupHandler = async (_request: any, reply: any) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Free Website Device Mockup Generator - MacBook &amp; iPhone | Tailprint</title>
  <meta name="description" content="Generate instant 3D device mockups from any live URL. Realistic MacBook Pro and iPhone 15 frames with drop shadows, high-res 1600x1000 PNG download. Free online tool by Tailprint." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader('Device Mockup')}

  <main class="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-12">
    <!-- Header -->
    <div class="text-center max-w-3xl mx-auto space-y-3">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
        <span>Instant 3D Device Compositing • MacBook Pro &amp; iPhone 15 Pro</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        Free Website Device Mockup Generator
      </h1>
      <p class="text-slate-400 text-sm">
        Transform any website URL into a multi-device presentation scene in seconds. Clean shadows, dark canvas, and ready for Product Hunt, Twitter, and pitch decks.
      </p>
    </div>

    <!-- Controls -->
    <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div class="sm:col-span-6">
          <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Website URL</label>
          <input id="mockup-url" type="url" value="https://stripe.com" placeholder="https://yourwebsite.com" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-amber-500" />
        </div>
        <div class="sm:col-span-4">
          <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title / Caption (Optional)</label>
          <input id="mockup-title" type="text" value="Financial Infrastructure for the Internet" placeholder="e.g. Next-Gen Payments Platform" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500" />
        </div>
        <div class="sm:col-span-2">
          <button id="btn-gen-mockup" onclick="generateMockup()" class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-1.5">
            <span>⚡ Generate Mockup</span>
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs border-t border-slate-800/60 pt-3 text-slate-400">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="font-semibold text-slate-300">Clean Capture:</span>
          <span>Automatic Cookie Banner &amp; GDPR Popup Removal Enabled</span>
        </div>
        <div class="text-[11px] font-mono text-slate-500">
          Desktop (1280×800) + iPhone (390×844)
        </div>
      </div>
    </div>

    <!-- Output Preview Canvas -->
    <div id="mockup-container" class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl min-h-[460px] flex flex-col items-center justify-center text-center">
      <div id="mockup-state-empty" class="space-y-4 max-w-sm">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-3xl mx-auto border border-amber-500/20">
          📸
        </div>
        <h3 class="text-lg font-bold text-white">Multi-Device Presentation Studio</h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Enter your website URL above and click <strong>"Generate Mockup"</strong>. Tailprint's Chromium engine captures both responsive viewports and renders a 1600×1000px composite image.
        </p>
      </div>

      <div id="mockup-state-loading" class="hidden space-y-4 py-12">
        <div class="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-mono text-slate-300">Capturing desktop (1280×800) &amp; mobile (390×844) viewports...</p>
      </div>

      <div id="mockup-state-result" class="hidden w-full space-y-6">
        <div class="rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 max-w-5xl mx-auto">
          <img id="mockup-img" src="" alt="Generated Device Mockup" class="w-full h-auto object-cover" />
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <a id="btn-download-mockup" href="#" target="_blank" download="device-mockup.png" class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/20 flex items-center space-x-1.5">
            <span>⬇ Download High-Res PNG (1600×1000)</span>
          </a>
          <button onclick="copyMockupUrl()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 flex items-center space-x-1.5">
            <span id="copy-mockup-label">📋 Copy Public Link</span>
          </button>
        </div>
      </div>
    </div>

    ${renderConversionCallout(
      'Device Mockup API',
      '// Automated High-Res Device Mockups via Tailprint API\n' +
        'const res = await fetch("https://tailprint.com/v1/tools/mockup", {\n' +
        '  method: "POST",\n' +
        '  headers: { "Content-Type": "application/json" },\n' +
        '  body: JSON.stringify({\n' +
        '    url: "https://stripe.com",\n' +
        '    title: "Next-Gen Fintech",\n' +
        '    delay_ms: 500\n' +
        '  })\n' +
        '});\n' +
        'const { mockupUrl } = await res.json();\n' +
        'console.log("Mockup saved at:", mockupUrl);'
    )}
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>

  <script>
    let currentMockupUrl = '';

    async function generateMockup() {
      const url = document.getElementById('mockup-url').value.trim();
      const title = document.getElementById('mockup-title').value.trim();
      if (!url) {
        alert('Please enter a valid website URL');
        return;
      }

      const btn = document.getElementById('btn-gen-mockup');
      const emptyState = document.getElementById('mockup-state-empty');
      const loadingState = document.getElementById('mockup-state-loading');
      const resultState = document.getElementById('mockup-state-result');

      btn.disabled = true;
      btn.innerHTML = '<span class="animate-spin">⏳</span><span>Rendering...</span>';
      emptyState.classList.add('hidden');
      resultState.classList.add('hidden');
      loadingState.classList.remove('hidden');

      try {
        const res = await fetch('/v1/tools/mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, title }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to generate device mockup');
        }

        currentMockupUrl = data.mockupUrl;
        document.getElementById('mockup-img').src = data.mockupUrl;
        document.getElementById('btn-download-mockup').href = data.mockupUrl;

        loadingState.classList.add('hidden');
        resultState.classList.remove('hidden');
      } catch (err) {
        alert(err.message);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Generate Mockup</span>';
      }
    }

    function copyMockupUrl() {
      if (!currentMockupUrl) return;
      navigator.clipboard.writeText(currentMockupUrl);
      const label = document.getElementById('copy-mockup-label');
      label.textContent = '✓ Link Copied!';
      setTimeout(() => { label.textContent = '📋 Copy Public Link'; }, 2000);
    }
  </script>
</body>
</html>`;

    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/tools/mockup', { schema: { hide: true } }, mockupHandler);
  fastify.get('/mockup', { schema: { hide: true } }, mockupHandler);

  // ==========================================
  // PAGE 6: /tools/reel (AI Social Reel & Short Video Maker)
  // ==========================================
  const reelHandler = async (_request: any, reply: any) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Social Reel &amp; Short Video Maker (9:16) - Tailprint</title>
  <meta name="description" content="Turn any live URL, article, or topic into an animated 9:16 vertical Reel, TikTok, or YouTube Short in seconds. Auto-scraped slides, kinetic typography, and direct video export." />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,600&family=Plus+Jakarta+Sans:wght@500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.2; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(1.05); }
    }
    .ambient-glow {
      animation: pulseGlow 6s ease-in-out infinite;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader('Social Reel Maker')}

  <main class="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
    <!-- Header -->
    <div class="text-center max-w-3xl mx-auto space-y-3">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
        <span>🎬 9:16 Vertical Video &amp; Story Creator • Instagram Reels, TikTok &amp; Shorts</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        AI Social Reel &amp; Short Video Maker
      </h1>
      <p class="text-slate-400 text-sm">
        Transform any webpage, blog post, or changelog into a high-converting 9:16 animated vertical Reel in 10 seconds. Auto-extracts key takeaways with kinetic typography and instant video download.
      </p>
    </div>

    <!-- Main Studio Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left Column: URL Scraper & Script Controls (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- URL Scraper Box -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-rose-400">⚡ Auto-Generate from Any URL</span>
            <span class="text-[10px] text-slate-500 font-mono">Scrapes &amp; Summarizes</span>
          </div>
          <div class="flex flex-col sm:flex-row gap-3">
            <input
              id="reel-url-input"
              type="url"
              value="https://tailprint.com"
              placeholder="https://yourblog.com/article"
              class="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-rose-500"
            />
            <button
              id="btn-scrape-reel"
              onclick="generateReelFromUrl()"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/25 flex items-center justify-center space-x-2 shrink-0"
            >
              <span>✨ Generate Reel</span>
            </button>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <label class="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
              <input type="checkbox" id="reel-include-screenrecord" checked class="w-4 h-4 accent-rose-500 rounded bg-slate-950 border-slate-800" />
              <span class="font-semibold text-rose-300 flex items-center space-x-1.5">
                <span>Record Live Webpage Scroll (Screenrecord)</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">HOT</span>
              </span>
            </label>
            <span class="text-[10px] text-slate-500 hidden sm:inline">Chromium auto-scroller</span>
          </div>
          <div id="reel-detected-lang-pill" class="hidden items-center space-x-2 pt-2 border-t border-slate-800/80">
            <span class="text-[11px] text-slate-400">Detected Language:</span>
            <span id="reel-lang-badge" class="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold"></span>
          </div>
          <p class="text-[11px] text-slate-400">
            Tailprint detects page language, extracts core takeaways &amp; stats, and records a smooth scrolling video.
          </p>
        </div>

        <!-- Branding & Themes Configuration -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Brand &amp; Visual Theme</span>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Brand Name</label>
              <input id="reel-brand" type="text" value="Tailprint" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-semibold" oninput="updateScriptBrand()" />
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Social Handle</label>
              <input id="reel-handle" type="text" value="@tailprint" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono" oninput="updateScriptHandle()" />
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Call to Action (CTA)</label>
              <input id="reel-cta" type="text" value="Follow for more • Link in bio" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500" oninput="updateScriptCta()" />
            </div>
          </div>

          <!-- Design Archetypes & Themes Selector -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-[11px] text-slate-400 font-medium">Visual Design Archetype &amp; Aesthetic</label>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">Original Archetypes</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="setReelTheme('nordic')" id="theme-btn-nordic" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center space-x-1"><span>Nordic Editorial 🌿</span></button>
              <button onclick="setReelTheme('bento')" id="theme-btn-bento" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1"><span>Linear Bento 💎</span></button>
              <button onclick="setReelTheme('brutalist')" id="theme-btn-brutalist" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1"><span>Brutalist Impact ⚡</span></button>
              <button onclick="setReelTheme('creator')" id="theme-btn-creator" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1"><span>Creator Pop 🔥</span></button>
              <button onclick="setReelTheme('terminal')" id="theme-btn-terminal" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1"><span>Dev Terminal 💻</span></button>
              <button onclick="setReelTheme('brand')" id="theme-btn-brand" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1"><span>Brand Auto ✨</span></button>
              <button onclick="setReelTheme('sunset')" id="theme-btn-sunset" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Sunset Amber 🌅</button>
              <button onclick="setReelTheme('midnight')" id="theme-btn-midnight" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Midnight Emerald 🌑</button>
              <button onclick="setReelTheme('clean')" id="theme-btn-clean" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Clean Light ⚪</button>
            </div>
          </div>

          <!-- Visual Layout & Animation Template Selector -->
          <div class="pt-2 border-t border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] text-slate-400 font-medium">Visual Layout &amp; Animation Template</label>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">4 Layouts</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button onclick="setReelLayout('classic')" id="layout-btn-classic" class="px-3 py-2 rounded-xl font-bold bg-indigo-600 text-white border border-indigo-400/40 flex items-center justify-center space-x-1.5 shadow-md">
                <span>🎴</span><span>Classic Card</span>
              </button>
              <button onclick="setReelLayout('split')" id="layout-btn-split" class="px-3 py-2 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center space-x-1.5">
                <span>🎬</span><span>Split Cinema</span>
              </button>
              <button onclick="setReelLayout('iphone')" id="layout-btn-iphone" class="px-3 py-2 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center space-x-1.5">
                <span>📱</span><span>3D iPhone Pro</span>
              </button>
              <button onclick="setReelLayout('editorial')" id="layout-btn-editorial" class="px-3 py-2 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center space-x-1.5">
                <span>📰</span><span>Editorial Stat</span>
              </button>
            </div>
          </div>

          <!-- Screenrecord Display Mode -->
          <div class="pt-2 border-t border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] text-slate-400 font-medium">Live Screenrecord Display</label>
              <span id="screenrecord-status-badge" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold hidden">● Live WebM Loaded</span>
            </div>
            <div class="flex flex-wrap gap-2 text-xs">
              <button onclick="setScreenrecordMode('inset')" id="sr-mode-btn-inset" class="px-3 py-1.5 rounded-xl font-bold bg-rose-600 text-white border border-rose-400/40">Browser Window (Card)</button>
              <button onclick="setScreenrecordMode('backdrop')" id="sr-mode-btn-backdrop" class="px-3 py-1.5 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Video Backdrop</button>
              <button onclick="setScreenrecordMode('none')" id="sr-mode-btn-none" class="px-3 py-1.5 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Typographic Only</button>
            </div>
          </div>

          <!-- Slide Duration -->
          <div class="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span>Slide Duration: <strong id="duration-label" class="text-white">3.0s</strong></span>
            <input id="slide-duration" type="range" min="2000" max="6000" step="500" value="3000" class="w-48 accent-rose-500" oninput="updateDuration(this.value)" />
          </div>

          <!-- Clean Video Export Toggle (Omits story tabs & slide counter from download) -->
          <div class="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <div class="flex items-center space-x-2">
              <span class="text-base">🎬</span>
              <div>
                <span class="font-bold text-slate-200">Clean Video Export</span>
                <p class="text-[10px] text-slate-500">Hides story progress bars &amp; '3/4' counter for clean TikTok &amp; Reels video</p>
              </div>
            </div>
            <button id="clean-export-toggle-btn" onclick="toggleCleanExport()" class="px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30">
              <span id="clean-export-toggle-status">Clean Video ✨</span>
            </button>
          </div>
        </div>

        <!-- Slides List Editor -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Reel Slides (<span id="slide-count-badge">4</span>)</span>
            <button onclick="addNewSlide()" class="text-xs font-bold text-rose-400 hover:text-rose-300 transition">+ Add Slide</button>
          </div>

          <div id="slides-editor-container" class="space-y-3">
            <!-- Dynamically populated via JS -->
          </div>
        </div>

      </div>

      <!-- Right Column: Multi-Format Reel Player & Exporter (5 cols) -->
      <div class="lg:col-span-5 flex flex-col items-center space-y-4 sticky top-24">
        
        <!-- Multi-Format Aspect Ratio Switcher -->
        <div class="w-full max-w-[360px] bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-xl flex items-center justify-between text-[11px] font-bold">
          <button onclick="setAspectRatio('9:16')" id="format-btn-9-16" class="flex-1 py-1.5 px-2 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-1">
            <span>📱</span>
            <span>9:16</span>
          </button>
          <button onclick="setAspectRatio('1:1')" id="format-btn-1-1" class="flex-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-white transition flex items-center justify-center space-x-1">
            <span>⬛</span>
            <span>1:1</span>
          </button>
          <button onclick="setAspectRatio('16:9')" id="format-btn-16-9" class="flex-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-white transition flex items-center justify-center space-x-1">
            <span>💻</span>
            <span>16:9</span>
          </button>
          <button onclick="setAspectRatio('4:5')" id="format-btn-4-5" class="flex-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-white transition flex items-center justify-center space-x-1">
            <span>📐</span>
            <span>4:5</span>
          </button>
        </div>

        <!-- Frame Mockup (Adapts size & borders depending on aspect ratio) -->
        <div id="preview-mockup-frame" class="relative w-[320px] h-[600px] bg-slate-950 rounded-[48px] p-3 shadow-2xl shadow-rose-950/20 border-4 border-slate-800 flex flex-col justify-between overflow-hidden transition-all duration-300">
          
          <!-- Outer Titanium Rim Highlight -->
          <div id="mockup-rim" class="absolute inset-0 rounded-[44px] border border-white/10 pointer-events-none transition-all duration-300"></div>

          <!-- Top Dynamic Island Pill (Only visible in 9:16) -->
          <div id="mockup-island" class="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-end px-2 transition-all duration-300">
            <div class="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
          </div>

          <!-- Inside Screen -->
          <div id="reel-screen" class="w-full h-full rounded-[38px] p-6 flex flex-col justify-between relative overflow-hidden text-white transition-all duration-300">
            
            <!-- Live Screenrecord Ambient Video Backdrop (Only active in backdrop mode) -->
            <video id="preview-backdrop-video" src="" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none hidden transition-opacity duration-300"></video>

            <!-- Archetype Stage Decor (Nordic hairline frame / Brutalist crosshairs / Terminal grid) -->
            <div id="preview-archetype-decor" class="absolute inset-0 pointer-events-none z-10"></div>

            <!-- Editorial Giant Watermark (Only active in editorial layout) -->
            <div id="preview-editorial-watermark" class="hidden absolute top-1/3 left-3 text-7xl font-black text-white/10 pointer-events-none select-none tracking-tighter z-10">380ms</div>

            <!-- Ambient Animated Glow -->
            <div id="screen-glow" class="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/30 blur-3xl ambient-glow pointer-events-none"></div>
            <div class="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-rose-500/25 blur-3xl ambient-glow pointer-events-none"></div>

            <!-- Top Header & Progress Segments -->
            <div class="z-20 pt-6">
              <!-- Instagram Story Progress Bars -->
              <div id="progress-bars-row" class="flex items-center space-x-1.5 w-full mb-4">
                <!-- Injected via JS -->
              </div>

              <!-- Brand Bar -->
              <div id="preview-header-bar" class="flex items-center justify-between border-b border-white/10 pb-3">
                <div class="flex items-center space-x-2.5">
                  <img id="preview-logo-img" src="" class="w-8 h-8 rounded-xl object-contain bg-white/10 p-0.5 border border-white/20 hidden shadow-md" />
                  <div id="preview-avatar" class="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                    TP
                  </div>
                  <div>
                    <div id="preview-brand" class="font-extrabold text-xs text-white leading-none">Tailprint</div>
                    <div id="preview-handle" class="text-[10px] text-slate-400 font-mono mt-0.5">@tailprint</div>
                  </div>
                </div>
                <span id="preview-tag" class="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 border border-white/20 text-rose-300">
                  HOOK
                </span>
              </div>
            </div>

            <!-- Main Slide Content (Center, adapts by Archetype + Slide Role) -->
            <div id="preview-content-container" class="my-auto z-20 space-y-2.5 py-2 transition-all duration-200">
              <div id="preview-kicker-bar" class="hidden"></div>

              <div id="preview-stage-card" class="space-y-2.5 transition-all duration-200">
                <h2 id="preview-headline" class="text-xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
                  Sub-500ms Vector PDF Generation for Developers
                </h2>

                <div id="preview-stat-card" class="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-between space-x-3 shadow-lg">
                  <span id="preview-stat" class="text-2xl font-black text-cyan-400">380ms</span>
                  <span id="preview-stat-label" class="text-[9px] font-bold uppercase text-white/90 tracking-wider text-right">Average Render Time</span>
                </div>

                <!-- Floating Live Screenrecord Browser Card (Active in inset / split / iphone mode) -->
                <div id="preview-screenrecord-card" class="hidden rounded-xl border border-white/20 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
                  <div id="preview-browser-bar" class="px-2.5 py-1 bg-slate-900 border-b border-white/10 flex items-center justify-between text-[8px]">
                    <div class="flex items-center space-x-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <span id="preview-browser-url" class="font-mono text-slate-400 truncate max-w-[140px]">tailprint.com</span>
                  </div>
                  <video id="preview-screenrecord-video" src="" autoplay loop muted playsinline class="w-full h-28 object-cover object-top"></video>
                </div>

                <p id="preview-body" class="text-xs leading-relaxed text-slate-200/90 font-medium">
                  Eliminate complex browser infrastructure. Render arbitrary Tailwind HTML classes directly into vector PDFs.
                </p>

                <!-- Slide 4 Climax CTA Button Card -->
                <div id="preview-cta-card" class="hidden pt-1.5">
                  <div id="preview-cta-button" class="w-full px-3.5 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-[11px] shadow-xl flex items-center justify-between">
                    <span id="preview-cta-button-text" class="truncate pr-2">Follow for more</span>
                    <span class="text-sm font-black">→</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom CTA Footer -->
            <div id="preview-footer-bar" class="z-20 border-t border-white/10 pt-3 flex items-center justify-between text-[10px]">
              <div class="flex items-center space-x-1.5 font-bold" id="preview-footer-cta-wrap">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span id="preview-cta">Follow for more • Link in bio</span>
              </div>
              <span id="preview-slide-indicator" class="font-mono text-slate-400 font-bold">1 / 4</span>
            </div>

          </div>

        </div>

        <!-- Playback Controls -->
        <div class="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl shadow-xl">
          <button onclick="prevSlide()" class="p-2 text-slate-400 hover:text-white transition" title="Previous Slide">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          
          <button id="btn-play-pause" onclick="togglePlayPause()" class="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-600/30" title="Play / Pause">
            <svg id="icon-pause" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            <svg id="icon-play" class="w-4 h-4 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>

          <button onclick="nextSlide()" class="p-2 text-slate-400 hover:text-white transition" title="Next Slide">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <!-- Action Export Buttons -->
        <div class="w-full max-w-[360px] space-y-2">
          <!-- Mobile QR Preview Button -->
          <button
            id="btn-open-qr-modal"
            onclick="openMobilePreviewModal()"
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-between px-3 border border-white/20"
          >
            <div class="flex items-center space-x-2">
              <span class="text-sm">📱</span>
              <span>Live Mobile Preview (Scan QR)</span>
            </div>
            <span id="btn-mobile-live-badge" class="text-[9px] px-1.5 py-0.5 rounded-full bg-white/25 font-black uppercase tracking-wider">Live</span>
          </button>

          <!-- Server-Side H.264 MP4 Export -->
          <button
            id="btn-export-video"
            onclick="exportReelVideo()"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2"
          >
            <span id="btn-export-label">🎥 Download 9:16 MP4 Video</span>
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button
              onclick="downloadReelPdf()"
              id="btn-download-pdf"
              class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-slate-700 flex items-center justify-center space-x-1.5"
            >
              <span id="btn-pdf-label">📥 9:16 Story PDF</span>
            </button>
            <button
              onclick="saveCurrentSlidePng()"
              id="btn-save-png"
              class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-slate-700 flex items-center justify-center space-x-1.5"
            >
              <span id="btn-png-text">🖼️ Save 9:16 PNG</span>
            </button>
          </div>
        </div>

        <!-- Recording Progress Overlay -->
        <div id="recording-overlay" class="hidden w-full max-w-[360px] p-3 rounded-xl bg-slate-900 border border-rose-500/50 text-center space-y-2">
          <div class="flex items-center justify-center space-x-2 text-xs font-bold text-rose-400">
            <div class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
            <span id="recording-status-text">Rendering <span id="record-aspect-label">9:16</span> H.264 MP4 Video (<span id="record-percent">0%</span>)...</span>
          </div>
          <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div id="record-progress-bar" class="bg-rose-500 h-full transition-all duration-150" style="width: 0%"></div>
          </div>
        </div>

      </div>

    </div>

    <!-- Hidden High-Res Export Canvas & Source Video -->
    <canvas id="export-canvas" width="1080" height="1920" style="display: none;"></canvas>
    <video id="export-source-video" crossOrigin="anonymous" playsinline muted loop style="display: none;"></video>

    <!-- Developer cURL & API Integration Callout -->
    ${renderConversionCallout(
      'Social Reel API',
      'curl -X POST https://tailprint.com/v1/tools/reel \\\n' +
        '  -H "Authorization: Bearer sec_live_..." \\\n' +
        '  -H "Content-Type: application/json" \\\n' +
        '  -d \'{\n' +
        '    "brand": "Tailprint",\n' +
        '    "theme": "gradient",\n' +
        '    "slides": [\n' +
        '      {"headline": "Sub-500ms Vector PDFs", "body": "Render arbitrary Tailwind HTML."}\n' +
        '    ]\n' +
        '  }\' \\\n' +
        '  --output reel-story.pdf'
    )}

    <!-- Mobile QR Preview Modal -->
    <div id="qr-preview-modal" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
        <button onclick="closeMobilePreviewModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition">✕</button>
        
        <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
          📱
        </div>

        <div class="space-y-1">
          <h3 class="text-lg font-black text-white">Live Mobile Preview</h3>
          <p class="text-xs text-slate-400 leading-relaxed">Scan the QR code with your phone camera to watch the video fullscreen on your mobile device with real-time live sync.</p>
        </div>

        <div class="flex items-center justify-center space-x-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Live Sync Active • Updates instantly on any edit</span>
        </div>

        <!-- QR Code Container -->
        <div id="qr-code-display" class="bg-white p-3 rounded-2xl mx-auto w-60 h-60 flex items-center justify-center shadow-xl border border-slate-700 overflow-hidden">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Share URL input + copy -->
        <div class="flex items-center space-x-2 pt-1">
          <input id="qr-share-url-input" type="text" readonly class="w-full bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none truncate" />
          <button id="btn-copy-share-url" onclick="copyShareUrl()" class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex-shrink-0">
            Copy
          </button>
        </div>

        <p class="text-[10px] text-slate-500 leading-tight">
          💡 Touch and hold the mobile screen to pause, or tap the left/right edges to switch slides.
        </p>
      </div>
    </div>
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>

  <script>
    // State
    let reelState = {
      title: "Instant Vector PDF Generation for Developers",
      brand: "Tailprint",
      handle: "@tailprint",
      logoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='8' fill='%23090d16'/%3E%3Cpath d='M11 9L6 16l5 7' stroke='%23818cf8' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 9l5 7-5 7' stroke='%23f472b6' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='18' y1='8' x2='14' y2='24' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='16' r='1.5' fill='%23f43f5e'/%3E%3C/svg%3E",
      brandColors: {
        primary: "#4f46e5",
        secondary: "#090d16",
        accent: "#38bdf8"
      },
      theme: "brand",
      layout: "classic",
      language: "en",
      aspectRatio: "9:16",
      screenrecordUrl: null,
      screenrecordMode: "inset",
      cleanExport: true,
      sourceUrl: "https://tailprint.com",
      cta: "Follow for daily insights • Link in bio",
      duration: 3000,
      slides: [
        {
          tag: "THE BREAKTHROUGH",
          headline: "Sub-500ms Vector PDF Generation",
          body: "Stop wrestling with fragile Puppeteer instances and slow local compilers.",
          stat: "380ms",
          statLabel: "Average Render Time"
        },
        {
          tag: "THE PROBLEM",
          headline: "Why PDF Generation Sucks",
          body: "Table headers disappear on page 2. Rows get sliced in half. Memory leaks crash your servers.",
          stat: "99.9%",
          statLabel: "Headache Elimination"
        },
        {
          tag: "SMART SHIELD",
          headline: "Automatic Table Split Protection",
          body: "Tailprint automatically repeats table headers across page breaks and locks row integrity.",
          stat: "Zero",
          statLabel: "Broken Page Breaks"
        },
        {
          tag: "HOW TO USE",
          headline: "Built for Modern Developers & AI",
          body: "Connect Claude Desktop or Cursor via 22 native MCP tools or send simple cURL requests.",
          stat: "100 Free",
          statLabel: "Monthly Renders"
        }
      ]
    };

    let currentSlideIdx = 0;
    let isPlaying = true;
    let slideTimer = null;
    let progressStartTime = 0;
    let progressAnimFrame = null;
    let activeSessionSlug = null;
    let syncDebounceTimer = null;

    function debouncedSyncToMobile() {
      if (!activeSessionSlug) return;
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(async () => {
        try {
          await fetch('/v1/tools/reel/session/' + activeSessionSlug, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reelState)
          });
          const badge = document.getElementById('btn-mobile-live-badge');
          if (badge) {
            badge.classList.add('bg-emerald-500', 'text-white');
            setTimeout(() => {
              badge.classList.remove('bg-emerald-500', 'text-white');
            }, 350);
          }
        } catch (err) {}
      }, 150);
    }

    // Theme & Archetype CSS maps
    const themeMaps = {
      nordic: {
        id: 'nordic',
        name: 'Nordic Editorial 🌿',
        bg: "radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.14), transparent 55%), radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.08), transparent 55%), linear-gradient(165deg, #101726 0%, #0c111c 100%)",
        cardBg: "rgba(16, 23, 38, 0.78)",
        cardBorder: "rgba(217, 119, 6, 0.25)",
        text: "#fef3c7",
        subtext: "rgba(226, 232, 240, 0.88)",
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(245, 158, 11, 0.12)",
        tagBorder: "rgba(245, 158, 11, 0.35)",
        tagText: "#fcd34d",
        statBg: "rgba(245, 158, 11, 0.08)",
        statBorder: "rgba(245, 158, 11, 0.25)",
        statColor: "#fbbf24",
        buttonBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        buttonText: "#1c1917",
        badgeIcon: "✦",
        highlightClass: "bg-amber-400/20 text-amber-200 border-b-2 border-amber-400/60 px-1.5 py-0.5 rounded"
      },
      bento: {
        id: 'bento',
        name: 'Linear Bento 💎',
        bg: "radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.2), transparent 55%), linear-gradient(180deg, #070b14 0%, #030509 100%)",
        cardBg: "rgba(255, 255, 255, 0.04)",
        cardBorder: "rgba(255, 255, 255, 0.12)",
        text: "#ffffff",
        subtext: "rgba(203, 213, 225, 0.85)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
        tagBg: "rgba(56, 189, 248, 0.15)",
        tagBorder: "rgba(56, 189, 248, 0.35)",
        tagText: "#38bdf8",
        statBg: "rgba(56, 189, 248, 0.08)",
        statBorder: "rgba(56, 189, 248, 0.2)",
        statColor: "#38bdf8",
        buttonBg: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
        buttonText: "#ffffff",
        badgeIcon: "●",
        highlightClass: "bg-sky-500/20 text-sky-200 border border-sky-400/30 px-1.5 py-0.5 rounded-lg"
      },
      brutalist: {
        id: 'brutalist',
        name: 'Brutalist Impact ⚡',
        bg: "#000000",
        cardBg: "#09090b",
        cardBorder: "#ffffff",
        text: "#ffffff",
        subtext: "#e4e4e7",
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'Space Grotesk', monospace, sans-serif",
        tagBg: "#facc15",
        tagBorder: "#ffffff",
        tagText: "#000000",
        statBg: "#18181b",
        statBorder: "#ffffff",
        statColor: "#facc15",
        buttonBg: "#facc15",
        buttonText: "#000000",
        badgeIcon: "⚡",
        highlightClass: "bg-yellow-400 text-black font-black px-1.5 py-0.5 -rotate-1 inline-block"
      },
      creator: {
        id: 'creator',
        name: 'Creator Pop 🔥',
        bg: "radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.25), transparent 45%), radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.25), transparent 45%), linear-gradient(135deg, #180828 0%, #080310 100%)",
        cardBg: "rgba(30, 15, 45, 0.7)",
        cardBorder: "rgba(244, 63, 94, 0.35)",
        text: "#ffffff",
        subtext: "rgba(254, 205, 211, 0.9)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "linear-gradient(90deg, #f43f5e 0%, #f59e0b 100%)",
        tagBorder: "transparent",
        tagText: "#ffffff",
        statBg: "rgba(244, 63, 94, 0.12)",
        statBorder: "rgba(244, 63, 94, 0.3)",
        statColor: "#fbbf24",
        buttonBg: "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #f59e0b 100%)",
        buttonText: "#ffffff",
        badgeIcon: "🔥",
        highlightClass: "bg-gradient-to-r from-rose-500/30 to-amber-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 rounded-lg"
      },
      terminal: {
        id: 'terminal',
        name: 'Dev Terminal 💻',
        bg: "#080c14",
        cardBg: "rgba(10, 15, 26, 0.9)",
        cardBorder: "rgba(52, 211, 153, 0.35)",
        text: "#34d399",
        subtext: "#94a3b8",
        fontHead: "'JetBrains Mono', monospace",
        fontBody: "'JetBrains Mono', monospace",
        tagBg: "rgba(6, 78, 59, 0.8)",
        tagBorder: "rgba(52, 211, 153, 0.4)",
        tagText: "#34d399",
        statBg: "rgba(6, 78, 59, 0.3)",
        statBorder: "rgba(52, 211, 153, 0.3)",
        statColor: "#34d399",
        buttonBg: "#10b981",
        buttonText: "#022c22",
        badgeIcon: ">_",
        highlightClass: "bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30"
      },
      brand: {
        id: 'brand',
        name: 'Brand Auto ✨',
        bg: "linear-gradient(135deg, #4f46e5 0%, #090d16 100%)",
        cardBg: "rgba(255, 255, 255, 0.06)",
        cardBorder: "rgba(255, 255, 255, 0.15)",
        text: "#ffffff",
        subtext: "rgba(226, 232, 240, 0.85)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(255, 255, 255, 0.12)",
        tagBorder: "rgba(255, 255, 255, 0.25)",
        tagText: "#ffffff",
        statBg: "rgba(255, 255, 255, 0.08)",
        statBorder: "rgba(255, 255, 255, 0.18)",
        statColor: "#38bdf8",
        buttonBg: "#ffffff",
        buttonText: "#020617",
        badgeIcon: "✨",
        highlightClass: "bg-white/15 text-white border-b-2 border-white/50 px-1.5 py-0.5 rounded"
      },
      gradient: {
        id: 'gradient',
        name: 'Gradient Glow ✨',
        bg: "linear-gradient(145deg, #1e1b4b 0%, #31104b 50%, #030712 100%)",
        cardBg: "rgba(255, 255, 255, 0.06)",
        cardBorder: "rgba(255, 255, 255, 0.12)",
        text: "#ffffff",
        subtext: "rgba(233, 213, 255, 0.85)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(99, 102, 241, 0.2)",
        tagBorder: "rgba(99, 102, 241, 0.4)",
        tagText: "#a5b4fc",
        statBg: "rgba(255, 255, 255, 0.08)",
        statBorder: "rgba(255, 255, 255, 0.15)",
        statColor: "#38bdf8",
        buttonBg: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        buttonText: "#ffffff",
        badgeIcon: "✦",
        highlightClass: "bg-indigo-500/25 text-cyan-300 border-b-2 border-cyan-400/60 px-1.5 py-0.5 rounded"
      },
      cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon ⚡',
        bg: "#09090b",
        cardBg: "rgba(24, 24, 27, 0.85)",
        cardBorder: "rgba(250, 204, 21, 0.35)",
        text: "#facc15",
        subtext: "#d4d4d8",
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'JetBrains Mono', monospace",
        tagBg: "rgba(250, 204, 21, 0.15)",
        tagBorder: "rgba(250, 204, 21, 0.4)",
        tagText: "#fef08a",
        statBg: "rgba(250, 204, 21, 0.08)",
        statBorder: "rgba(250, 204, 21, 0.3)",
        statColor: "#ec4899",
        buttonBg: "#facc15",
        buttonText: "#000000",
        badgeIcon: "⚡",
        highlightClass: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-1.5 py-0.5 rounded"
      },
      midnight: {
        id: 'midnight',
        name: 'Midnight Emerald 🌑',
        bg: "radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15), transparent 60%), #040707",
        cardBg: "rgba(8, 16, 14, 0.85)",
        cardBorder: "rgba(16, 185, 129, 0.25)",
        text: "#fafafa",
        subtext: "#a1a1aa",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(16, 185, 129, 0.15)",
        tagBorder: "rgba(16, 185, 129, 0.3)",
        tagText: "#34d399",
        statBg: "rgba(16, 185, 129, 0.08)",
        statBorder: "rgba(16, 185, 129, 0.2)",
        statColor: "#10b981",
        buttonBg: "#10b981",
        buttonText: "#000000",
        badgeIcon: "●",
        highlightClass: "bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400/60 px-1.5 py-0.5 rounded"
      },
      sunset: {
        id: 'sunset',
        name: 'Sunset Amber 🌅',
        bg: "radial-gradient(circle at 80% 10%, rgba(244, 63, 94, 0.3), transparent 50%), linear-gradient(180deg, #2a0b18 0%, #0f0714 50%, #201006 100%)",
        cardBg: "rgba(30, 15, 25, 0.75)",
        cardBorder: "rgba(251, 146, 60, 0.25)",
        text: "#ffffff",
        subtext: "rgba(254, 205, 211, 0.85)",
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(244, 63, 94, 0.2)",
        tagBorder: "rgba(244, 63, 94, 0.4)",
        tagText: "#fda4af",
        statBg: "rgba(244, 63, 94, 0.1)",
        statBorder: "rgba(244, 63, 94, 0.25)",
        statColor: "#f59e0b",
        buttonBg: "linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)",
        buttonText: "#ffffff",
        badgeIcon: "🌅",
        highlightClass: "bg-rose-500/20 text-rose-200 border-b-2 border-rose-400/60 px-1.5 py-0.5 rounded"
      },
      clean: {
        id: 'clean',
        name: 'Clean Light ⚪',
        bg: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
        cardBg: "#ffffff",
        cardBorder: "#cbd5e1",
        text: "#0f172a",
        subtext: "#475569",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "#dbeafe",
        tagBorder: "#bfdbfe",
        tagText: "#1d4ed8",
        statBg: "#ffffff",
        statBorder: "#cbd5e1",
        statColor: "#2563eb",
        buttonBg: "#0f172a",
        buttonText: "#ffffff",
        badgeIcon: "✦",
        highlightClass: "bg-blue-100 text-blue-900 border-b-2 border-blue-400 px-1.5 py-0.5 rounded"
      }
    };

    function formatHighlightedHtml(text, highlightWords, markClass) {
      if (!text) return '';
      let formatted = escapeHtml(text);
      const cls = markClass || 'bg-amber-400/20 text-amber-200 px-1 rounded';
      const escReg = new RegExp('[.*+?^' + '\\$' + '{}()|[\\]\\\\]', 'g');
      const list = Array.isArray(highlightWords) ? highlightWords.slice() : [];
      let matched = false;
      for (const word of list) {
        if (!word || String(word).trim().length < 2) continue;
        const cleanWord = escapeHtml(String(word).trim()).replace(escReg, '\\\\$&');
        const regex = new RegExp('(' + cleanWord + ')', 'gi');
        if (regex.test(formatted)) {
          formatted = formatted.replace(regex, '<mark class="' + cls + '">$1</mark>');
          matched = true;
          break;
        }
      }
      if (!matched) {
        const words = escapeHtml(text).split(/\\s+/).map(w => w.replace(/[,.!?«»"']/g, '')).filter(w => w.length >= 6);
        if (words.length > 0) {
          const fallbackWord = words[words.length - 1].replace(escReg, '\\\\$&');
          const regex = new RegExp('(' + fallbackWord + ')', 'i');
          formatted = formatted.replace(regex, '<mark class="' + cls + '">$1</mark>');
        }
      }
      return formatted;
    }

    // Initialize UI
    window.addEventListener('DOMContentLoaded', () => {
      renderSlidesEditor();
      updatePreviewDisplay();
      startPlayback();
    });

    function updateScriptBrand() {
      reelState.brand = document.getElementById('reel-brand').value || 'Brand';
      updatePreviewDisplay();
      debouncedSyncToMobile();
    }

    function updateScriptHandle() {
      reelState.handle = document.getElementById('reel-handle').value || '@brand';
      updatePreviewDisplay();
      debouncedSyncToMobile();
    }

    function updateScriptCta() {
      reelState.cta = document.getElementById('reel-cta').value || 'Link in bio';
      updatePreviewDisplay();
      debouncedSyncToMobile();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function toggleCleanExport() {
      reelState.cleanExport = reelState.cleanExport === false ? true : false;
      const btn = document.getElementById('clean-export-toggle-btn');
      const status = document.getElementById('clean-export-toggle-status');
      if (btn && status) {
        if (reelState.cleanExport !== false) {
          btn.className = 'px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30';
          status.textContent = 'Clean Video ✨';
        } else {
          btn.className = 'px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 bg-slate-950 text-slate-400 border border-slate-800 hover:text-white';
          status.textContent = 'Story Tabs On';
        }
      }
      debouncedSyncToMobile();
    }

    function updateDuration(val) {
      reelState.duration = parseInt(val, 10);
      document.getElementById('duration-label').textContent = (reelState.duration / 1000).toFixed(1) + 's';
      if (isPlaying) {
        restartCurrentSlide();
      }
      debouncedSyncToMobile();
    }

    function setReelTheme(themeName) {
      reelState.theme = themeName;
      ['nordic', 'bento', 'brutalist', 'creator', 'terminal', 'brand', 'sunset', 'midnight', 'clean', 'gradient', 'cyberpunk'].forEach((t) => {
        const btn = document.getElementById('theme-btn-' + t);
        if (btn) {
          if (t === themeName) {
            btn.className = t === 'nordic'
              ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-md flex items-center space-x-1'
              : t === 'bento'
              ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/25 text-sky-200 border border-sky-500/50 shadow-md flex items-center space-x-1'
              : t === 'brutalist'
              ? 'px-3 py-1.5 rounded-xl text-xs font-black bg-yellow-400 text-black border-2 border-white shadow-md flex items-center space-x-1'
              : t === 'creator'
              ? 'px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md flex items-center space-x-1'
              : t === 'terminal'
              ? 'px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md flex items-center space-x-1'
              : t === 'brand'
              ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-md border border-white/40 flex items-center space-x-1'
              : 'px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white border border-indigo-400/40 shadow-md flex items-center space-x-1';
          } else {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center space-x-1';
          }
        }
      });
      updatePreviewDisplay();
      debouncedSyncToMobile();
    }

    function setReelLayout(layoutName) {
      reelState.layout = layoutName;
      ['classic', 'split', 'iphone', 'editorial'].forEach(l => {
        const btn = document.getElementById('layout-btn-' + l);
        if (btn) {
          if (l === layoutName) {
            btn.className = 'px-3 py-2 rounded-xl font-bold bg-indigo-600 text-white border border-indigo-400/40 flex items-center justify-center space-x-1.5 shadow-md';
          } else {
            btn.className = 'px-3 py-2 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center space-x-1.5';
          }
        }
      });
      updatePreviewDisplay();
      debouncedSyncToMobile();
    }

    function renderSlidesEditor() {
      const container = document.getElementById('slides-editor-container');
      document.getElementById('slide-count-badge').textContent = reelState.slides.length;

      container.innerHTML = reelState.slides.map((s, idx) => {
        return '<div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative group">' +
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-bold text-rose-400 font-mono">Slide ' + (idx + 1) + '</span>' +
            '<div class="flex items-center space-x-2">' +
              '<button onclick="jumpToSlide(' + idx + ')" class="text-[11px] text-slate-400 hover:text-white transition">Preview 👁️</button>' +
              (reelState.slides.length > 2 ? '<button onclick="deleteSlide(' + idx + ')" class="text-[11px] text-rose-400 hover:text-rose-300">Delete ✕</button>' : '') +
            '</div>' +
          '</div>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
            '<div>' +
              '<label class="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Tag / Category</label>' +
              '<input type="text" value="' + (s.tag || '') + '" data-idx="' + idx + '" data-field="tag" oninput="onSlideInput(this)" class="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500" />' +
            '</div>' +
            '<div>' +
              '<label class="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Headline</label>' +
              '<input type="text" value="' + (s.headline || '') + '" data-idx="' + idx + '" data-field="headline" oninput="onSlideInput(this)" class="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-semibold" />' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label class="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Body Description</label>' +
            '<textarea rows="2" data-idx="' + idx + '" data-field="body" oninput="onSlideInput(this)" class="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 leading-relaxed">' + (s.body || '') + '</textarea>' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2">' +
            '<div>' +
              '<label class="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Stat Value (Optional)</label>' +
              '<input type="text" value="' + (s.stat || '') + '" data-idx="' + idx + '" data-field="stat" oninput="onSlideInput(this)" placeholder="e.g. 99%+" class="w-full bg-slate-900 text-cyan-300 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500" />' +
            '</div>' +
            '<div>' +
              '<label class="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Stat Label (Optional)</label>' +
              '<input type="text" value="' + (s.statLabel || '') + '" data-idx="' + idx + '" data-field="statLabel" oninput="onSlideInput(this)" placeholder="e.g. Efficiency" class="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500" />' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function onSlideInput(el) {
      const idx = parseInt(el.getAttribute('data-idx'));
      const field = el.getAttribute('data-field');
      if (reelState.slides[idx]) {
        reelState.slides[idx][field] = el.value;
        if (currentSlideIdx === idx) {
          updatePreviewDisplay();
        }
        debouncedSyncToMobile();
      }
    }

    function addNewSlide() {
      reelState.slides.push({
        tag: 'HIGHLIGHT',
        headline: 'Next Big Breakthrough',
        body: 'Explain your insight clearly to capture attention on TikTok and Reels.',
        stat: '10x',
        statLabel: 'Productivity'
      });
      renderSlidesEditor();
      jumpToSlide(reelState.slides.length - 1);
      debouncedSyncToMobile();
    }

    function deleteSlide(idx) {
      if (reelState.slides.length <= 2) return;
      reelState.slides.splice(idx, 1);
      if (currentSlideIdx >= reelState.slides.length) {
        currentSlideIdx = reelState.slides.length - 1;
      }
      renderSlidesEditor();
      updatePreviewDisplay();
      restartCurrentSlide();
      debouncedSyncToMobile();
    }

    function updatePreviewDisplay() {
      const slide = reelState.slides[currentSlideIdx] || reelState.slides[0];
      if (reelState.brandColors) {
        themeMaps.brand.bg = "linear-gradient(135deg, " + reelState.brandColors.primary + " 0%, " + reelState.brandColors.secondary + " 100%)";
        themeMaps.brand.statColor = reelState.brandColors.accent;
      }
      const themeKey = reelState.theme || 'brand';
      const isLight = themeKey === 'clean';
      const theme = themeMaps[themeKey] || themeMaps.brand || themeMaps.gradient;
      const slideType = slide.slideType || (currentSlideIdx === 0 ? 'hook' : currentSlideIdx === 1 ? 'problem' : currentSlideIdx === 2 ? 'stat' : 'cta');
      const screen = document.getElementById('reel-screen');

      // Apply theme background & base text color
      screen.style.background = theme.bg;
      screen.style.color = theme.text;

      // Archetype Stage Decor (Nordic hairline border / Brutalist crosshairs / Terminal grid)
      const decorEl = document.getElementById('preview-archetype-decor');
      if (decorEl) {
        if (themeKey === 'nordic') {
          decorEl.innerHTML = '<div class="absolute inset-2.5 border border-amber-500/20 rounded-[30px]"></div>';
        } else if (themeKey === 'brutalist') {
          decorEl.innerHTML =
            '<span class="absolute top-3 left-3 font-mono text-[10px] font-black text-white/60">+</span>' +
            '<span class="absolute top-3 right-3 font-mono text-[10px] font-black text-white/60">+</span>' +
            '<span class="absolute bottom-3 left-3 font-mono text-[10px] font-black text-white/60">+</span>' +
            '<span class="absolute bottom-3 right-3 font-mono text-[10px] font-black text-white/60">+</span>';
        } else {
          decorEl.innerHTML = '';
        }
      }

      // Brand & Avatar + Header/Footer contrast
      const brandEl = document.getElementById('preview-brand');
      const handleEl = document.getElementById('preview-handle');
      const headerBar = document.getElementById('preview-header-bar');
      const footerBar = document.getElementById('preview-footer-bar');
      const footerCtaWrap = document.getElementById('preview-footer-cta-wrap');
      if (brandEl) {
        brandEl.textContent = reelState.brand;
        brandEl.style.color = theme.text;
        brandEl.style.fontFamily = theme.fontHead || 'system-ui, sans-serif';
      }
      if (handleEl) {
        handleEl.textContent = reelState.handle;
        handleEl.style.color = theme.subtext;
      }
      if (headerBar) {
        headerBar.style.borderColor = isLight ? 'rgba(15, 23, 42, 0.12)' : (themeKey === 'brutalist' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)');
      }
      if (footerBar) {
        footerBar.style.borderColor = isLight ? 'rgba(15, 23, 42, 0.12)' : (themeKey === 'brutalist' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)');
      }
      if (footerCtaWrap) {
        footerCtaWrap.style.color = theme.text;
      }

      const logoImg = document.getElementById('preview-logo-img');
      const avatarDiv = document.getElementById('preview-avatar');
      if (reelState.logoUrl) {
        if (logoImg) {
          logoImg.src = reelState.logoUrl;
          logoImg.classList.remove('hidden');
        }
        if (avatarDiv) avatarDiv.classList.add('hidden');
      } else {
        if (logoImg) logoImg.classList.add('hidden');
        if (avatarDiv) {
          avatarDiv.classList.remove('hidden');
          avatarDiv.textContent = reelState.brand.slice(0, 2).toUpperCase();
        }
      }

      // Tag & Karaoke Badge
      const tagEl = document.getElementById('preview-tag');
      const badgeIcon = theme.badgeIcon ? '<span class="mr-1">' + theme.badgeIcon + '</span>' : '';
      tagEl.innerHTML = badgeIcon + escapeHtml(slide.tag || ('0' + (currentSlideIdx + 1)));
      tagEl.style.backgroundColor = theme.tagBg;
      tagEl.style.borderColor = theme.tagBorder;
      tagEl.style.color = theme.tagText;
      tagEl.style.borderRadius = themeKey === 'brutalist' ? '0px' : '9999px';

      // Archetype Kicker Bar (Nordic chapter / Terminal window bar / Brutalist frame header)
      const kickerBar = document.getElementById('preview-kicker-bar');
      if (kickerBar) {
        if (themeKey === 'terminal') {
          const slugBrand = (reelState.brand || 'app').toLowerCase().replace(/[^a-z0-9_-]/g, '');
          kickerBar.className = 'flex items-center justify-between px-2.5 py-1.5 rounded-t-xl bg-slate-900/95 border border-b-0 border-emerald-500/40 font-mono text-[9px] text-emerald-400 -mb-2.5';
          kickerBar.innerHTML =
            '<div class="flex items-center space-x-1">' +
              '<span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>' +
              '<span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>' +
              '<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>' +
              '<span class="ml-1.5 text-slate-400">~/' + escapeHtml(slugBrand) + '/0' + (currentSlideIdx + 1) + '.sh</span>' +
            '</div>' +
            '<span>[0' + (currentSlideIdx + 1) + '/0' + reelState.slides.length + ']</span>';
        } else if (themeKey === 'nordic') {
          kickerBar.className = 'flex items-center space-x-2 text-[10px] tracking-widest uppercase text-amber-300/90 mb-1';
          kickerBar.innerHTML =
            '<span class="italic font-serif lowercase text-xs text-amber-200">kap. 0' + (currentSlideIdx + 1) + '</span>' +
            '<span class="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent"></span>';
        } else if (themeKey === 'brutalist') {
          kickerBar.className = 'flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-yellow-400 mb-1';
          kickerBar.innerHTML =
            '<span>+ ' + escapeHtml(slide.tag || 'RAW') + ' +</span>' +
            '<span class="px-1.5 py-0.5 bg-white text-black">0' + (currentSlideIdx + 1) + '</span>';
        } else {
          kickerBar.className = 'hidden';
          kickerBar.innerHTML = '';
        }
      }

      // Headline & Body with Dynamic Archetype Typography & Keyword Highlighting
      const headlineEl = document.getElementById('preview-headline');
      const bodyEl = document.getElementById('preview-body');
      const stageCard = document.getElementById('preview-stage-card');
      headlineEl.innerHTML = formatHighlightedHtml(slide.headline, slide.highlightWords, theme.highlightClass);
      headlineEl.style.color = theme.text;
      headlineEl.style.fontFamily = theme.fontHead || 'system-ui, -apple-system, sans-serif';
      headlineEl.style.textAlign = slideType === 'cta' ? 'center' : 'left';

      bodyEl.textContent = (themeKey === 'terminal' ? '> ' : '') + (slide.body || '');
      bodyEl.style.color = theme.subtext;
      bodyEl.style.fontFamily = theme.fontBody || 'system-ui, -apple-system, sans-serif';
      bodyEl.style.textAlign = slideType === 'cta' ? 'center' : 'left';

      // Per-Slide-Role & Archetype Stage Card Styling
      if (stageCard) {
        const shouldFrameStage = themeKey === 'terminal' || themeKey === 'brutalist' || slideType === 'problem' || (themeKey === 'bento' && slideType !== 'hook');
        if (shouldFrameStage) {
          stageCard.style.background = theme.cardBg || 'rgba(255,255,255,0.06)';
          stageCard.style.border = theme.cardBorder || '1px solid rgba(255,255,255,0.14)';
          stageCard.style.boxShadow = theme.cardShadow || 'none';
          stageCard.style.padding = '12px';
          stageCard.style.borderRadius = themeKey === 'brutalist' ? '0px' : (themeKey === 'terminal' ? '0 0 14px 14px' : '18px');
        } else {
          stageCard.style.background = 'transparent';
          stageCard.style.border = 'none';
          stageCard.style.boxShadow = 'none';
          stageCard.style.padding = '0px';
          stageCard.style.borderRadius = '0px';
        }
      }

      // Stat card
      const statCard = document.getElementById('preview-stat-card');
      const statVal = document.getElementById('preview-stat');
      const statLabel = document.getElementById('preview-stat-label');

      if (slide.stat) {
        statCard.classList.remove('hidden');
        statCard.style.backgroundColor = theme.statBg;
        statCard.style.borderColor = theme.statBorder;
        statCard.style.borderRadius = themeKey === 'brutalist' ? '0px' : '16px';
        statVal.textContent = slide.stat;
        statVal.style.color = theme.statColor;
        statVal.style.fontFamily = theme.fontHead || 'system-ui, -apple-system, sans-serif';
        statLabel.textContent = slide.statLabel || 'METRIC';
        statLabel.style.color = theme.text;
      } else {
        statCard.classList.add('hidden');
      }

      // Climax CTA Card (Visible on Slide 4 / 'cta' slideType)
      const ctaCard = document.getElementById('preview-cta-card');
      const ctaBtn = document.getElementById('preview-cta-button');
      const ctaBtnText = document.getElementById('preview-cta-button-text');
      if (ctaCard && ctaBtn && ctaBtnText) {
        if (slideType === 'cta') {
          ctaCard.classList.remove('hidden');
          ctaBtnText.textContent = reelState.cta || 'Learn more';
          ctaBtn.style.borderRadius = themeKey === 'brutalist' ? '0px' : '16px';
          ctaBtn.style.background = theme.statColor || '#38bdf8';
          ctaBtn.style.color = (themeKey === 'brutalist' || themeKey === 'nordic' || themeKey === 'terminal' || themeKey === 'creator') ? '#090d16' : '#ffffff';
          ctaBtn.style.border = themeKey === 'brutalist' ? '2px solid #ffffff' : 'none';
        } else {
          ctaCard.classList.add('hidden');
        }
      }

      // Apply Visual Layout template styling (classic, split, iphone, editorial)
      const layout = reelState.layout || 'classic';
      const contentBox = document.getElementById('preview-content-container');
      const watermark = document.getElementById('preview-editorial-watermark');
      const srCard = document.getElementById('preview-screenrecord-card');
      const browserBar = document.getElementById('preview-browser-bar');

      if (watermark) {
        if (layout === 'editorial') {
          watermark.textContent = slide.stat || ('0' + (currentSlideIdx + 1));
          watermark.style.fontFamily = theme.fontHead || 'serif';
          watermark.style.color = isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.08)';
          watermark.classList.remove('hidden');
        } else {
          watermark.classList.add('hidden');
        }
      }

      if (contentBox) {
        if (layout === 'editorial') {
          contentBox.style.borderLeft = (themeKey === 'brutalist' ? '5px solid ' : '3px solid ') + (theme.statColor || '#38bdf8');
          contentBox.style.paddingLeft = '12px';
          contentBox.style.background = 'transparent';
          contentBox.style.borderTop = 'none';
          contentBox.style.borderRadius = '0px';
        } else if (layout === 'split') {
          contentBox.style.borderLeft = 'none';
          contentBox.style.paddingLeft = '0px';
          contentBox.style.background = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(9, 13, 22, 0.72)';
          contentBox.style.padding = '12px';
          contentBox.style.borderRadius = themeKey === 'brutalist' ? '0px' : '16px';
          contentBox.style.borderTop = '3px solid ' + (theme.statColor || '#38bdf8');
        } else {
          contentBox.style.borderLeft = 'none';
          contentBox.style.borderTop = 'none';
          contentBox.style.paddingLeft = '0px';
          contentBox.style.padding = '8px 0';
          contentBox.style.background = 'transparent';
        }
      }

      if (srCard && browserBar) {
        if (layout === 'iphone') {
          srCard.className = 'mx-auto w-40 rounded-[26px] border-4 border-slate-600 bg-slate-950 shadow-2xl overflow-hidden transition-all duration-300';
          browserBar.innerHTML = '<div class="mx-auto w-12 h-2.5 bg-black rounded-full my-0.5"></div>';
        } else {
          srCard.className = (themeKey === 'brutalist' ? 'rounded-none border-2 border-white' : 'rounded-xl border border-white/20') + ' bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300';
          browserBar.innerHTML = '<div class="flex items-center space-x-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span></div><span id="preview-browser-url" class="font-mono text-slate-400 truncate max-w-[140px]">tailprint.com</span>';
        }
      }

      // CTA & Slide indicator
      document.getElementById('preview-cta').textContent = reelState.cta;
      document.getElementById('preview-slide-indicator').textContent = (currentSlideIdx + 1) + ' / ' + reelState.slides.length;

      // Render top progress bar segments
      renderProgressBars();
      updateScreenrecordDisplay();
      debouncedSyncToMobile();
    }

    function setScreenrecordMode(mode) {
      reelState.screenrecordMode = mode;
      ['inset', 'backdrop', 'none'].forEach(m => {
        const btn = document.getElementById('sr-mode-btn-' + m);
        if (btn) {
          if (m === mode) {
            btn.className = 'px-3 py-1.5 rounded-xl font-bold bg-rose-600 text-white border border-rose-400/40';
          } else {
            btn.className = 'px-3 py-1.5 rounded-xl font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800';
          }
        }
      });
      updateScreenrecordDisplay();
      debouncedSyncToMobile();
    }

    function updateScreenrecordDisplay() {
      const badge = document.getElementById('screenrecord-status-badge');
      const card = document.getElementById('preview-screenrecord-card');
      const video = document.getElementById('preview-screenrecord-video');
      const backdrop = document.getElementById('preview-backdrop-video');
      const exportVid = document.getElementById('export-source-video');
      const urlLabel = document.getElementById('preview-browser-url');

      if (!reelState.screenrecordUrl || reelState.screenrecordMode === 'none') {
        if (badge) badge.classList.add('hidden');
        if (card) card.classList.add('hidden');
        if (backdrop) backdrop.classList.add('hidden');
        return;
      }

      if (badge) badge.classList.remove('hidden');

      if (video && video.src !== reelState.screenrecordUrl) {
        video.src = reelState.screenrecordUrl;
        video.play().catch(() => {});
      }
      if (backdrop && backdrop.src !== reelState.screenrecordUrl) {
        backdrop.src = reelState.screenrecordUrl;
        backdrop.play().catch(() => {});
      }
      if (exportVid && exportVid.src !== reelState.screenrecordUrl) {
        exportVid.src = reelState.screenrecordUrl;
      }

      if (urlLabel && reelState.sourceUrl) {
        try {
          urlLabel.textContent = new URL(reelState.sourceUrl).hostname.replace(/^www\./, '');
        } catch {
          urlLabel.textContent = reelState.brand.toLowerCase() + '.com';
        }
      }

      if (reelState.screenrecordMode === 'inset') {
        if (card) card.classList.remove('hidden');
        if (backdrop) backdrop.classList.add('hidden');
      } else if (reelState.screenrecordMode === 'backdrop') {
        if (card) card.classList.add('hidden');
        if (backdrop) backdrop.classList.remove('hidden');
      }
    }

    function renderProgressBars() {
      const row = document.getElementById('progress-bars-row');
      row.innerHTML = reelState.slides.map((_, i) => {
        let barClass = 'h-1 flex-1 rounded-full overflow-hidden bg-white/20 relative';
        let fillWidth = '0%';
        if (i < currentSlideIdx) {
          fillWidth = '100%';
        } else if (i === currentSlideIdx) {
          fillWidth = '0%';
        }
        return '<div class="' + barClass + '">' +
          '<div id="progress-fill-' + i + '" class="h-full bg-white transition-none" style="width: ' + fillWidth + '"></div>' +
        '</div>';
      }).join('');
    }

    // Playback loop
    function startPlayback() {
      isPlaying = true;
      document.getElementById('icon-pause').classList.remove('hidden');
      document.getElementById('icon-play').classList.add('hidden');
      restartCurrentSlide();
    }

    function pausePlayback() {
      isPlaying = false;
      document.getElementById('icon-pause').classList.add('hidden');
      document.getElementById('icon-play').classList.remove('hidden');
      if (slideTimer) clearTimeout(slideTimer);
      if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
    }

    function togglePlayPause() {
      if (isPlaying) {
        pausePlayback();
      } else {
        startPlayback();
      }
    }

    function restartCurrentSlide() {
      if (slideTimer) clearTimeout(slideTimer);
      if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);

      progressStartTime = performance.now();
      const duration = reelState.duration;

      function updateBar(now) {
        if (!isPlaying) return;
        const elapsed = now - progressStartTime;
        const progress = Math.min(1.0, elapsed / duration);
        const pct = Math.min(100, progress * 100);
        const fillEl = document.getElementById('progress-fill-' + currentSlideIdx);
        if (fillEl) {
          fillEl.style.width = pct + '%';
        }

        if (elapsed < duration) {
          progressAnimFrame = requestAnimationFrame(updateBar);
        }
      }
      progressAnimFrame = requestAnimationFrame(updateBar);

      slideTimer = setTimeout(() => {
        if (isPlaying) {
          nextSlide();
        }
      }, duration);
    }

    function nextSlide() {
      currentSlideIdx = (currentSlideIdx + 1) % reelState.slides.length;
      updatePreviewDisplay();
      if (isPlaying) {
        restartCurrentSlide();
      }
    }

    function prevSlide() {
      currentSlideIdx = (currentSlideIdx - 1 + reelState.slides.length) % reelState.slides.length;
      updatePreviewDisplay();
      if (isPlaying) {
        restartCurrentSlide();
      }
    }

    function jumpToSlide(idx) {
      currentSlideIdx = idx;
      updatePreviewDisplay();
      if (isPlaying) {
        restartCurrentSlide();
      }
    }

    // URL Scraper Auto-Generator (with optional live screenrecord)
    async function generateReelFromUrl() {
      const input = document.getElementById('reel-url-input');
      const btn = document.getElementById('btn-scrape-reel');
      const includeRecord = document.getElementById('reel-include-screenrecord')?.checked ?? true;
      const url = input.value.trim();

      if (!url) {
        alert('Please enter a valid web URL.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = includeRecord
        ? '<span>⏳ Scraping & Recording Live Scroll...</span>'
        : '<span>⚡ Scraping & Synthesizing...</span>';

      try {
        const res = await fetch('/v1/tools/reel/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, record_video: includeRecord })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Error generating reel from URL');
        }

        if (data.script) {
          reelState.title = data.script.title || reelState.title;
          reelState.brand = data.script.brand || reelState.brand;
          reelState.handle = data.script.handle || reelState.handle;
          reelState.slides = data.script.slides || reelState.slides;
          reelState.cta = data.script.cta || reelState.cta;
          reelState.sourceUrl = data.script.sourceUrl || url;
          if (data.script.language) {
            reelState.language = data.script.language;
          }
          if (data.script.logoUrl) {
            reelState.logoUrl = data.script.logoUrl;
          }
          if (data.script.brandColors) {
            reelState.brandColors = data.script.brandColors;
          }
          if (data.script.theme) {
            setReelTheme(data.script.theme);
          }
          if (data.script.layout) {
            setReelLayout(data.script.layout);
          }
          if (data.script.screenrecordUrl) {
            reelState.screenrecordUrl = data.script.screenrecordUrl;
            setScreenrecordMode(data.script.screenrecordMode || 'inset');
          } else {
            reelState.screenrecordUrl = '';
            setScreenrecordMode('none');
          }

          document.getElementById('reel-brand').value = reelState.brand;
          document.getElementById('reel-handle').value = reelState.handle;
          document.getElementById('reel-cta').value = reelState.cta;

          if (data.script.languageLabel) {
            const pill = document.getElementById('reel-detected-lang-pill');
            const badge = document.getElementById('reel-lang-badge');
            if (pill && badge) {
              badge.textContent = data.script.languageLabel;
              pill.classList.remove('hidden');
              pill.classList.add('flex');
            }
          }

          currentSlideIdx = 0;
          renderSlidesEditor();
          updatePreviewDisplay();
          startPlayback();
          debouncedSyncToMobile();
        }
      } catch (err) {
        alert('Failed to generate reel: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>✨ Generate Reel</span>';
      }
    }

    function getCanvasDimensions(ratio) {
      if (ratio === '1:1') return { w: 1080, h: 1080 };
      if (ratio === '16:9') return { w: 1920, h: 1080 };
      if (ratio === '4:5') return { w: 1080, h: 1350 };
      return { w: 1080, h: 1920 };
    }

    function setAspectRatio(ratio) {
      reelState.aspectRatio = ratio;

      ['9:16', '1:1', '16:9', '4:5'].forEach((r) => {
        const btn = document.getElementById('format-btn-' + r.replace(':', '-'));
        if (btn) {
          if (r === ratio) {
            btn.className = 'flex-1 py-1.5 px-2 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-1';
          } else {
            btn.className = 'flex-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-white transition flex items-center justify-center space-x-1';
          }
        }
      });

      const frame = document.getElementById('preview-mockup-frame');
      const rim = document.getElementById('mockup-rim');
      const island = document.getElementById('mockup-island');
      const screen = document.getElementById('reel-screen');
      const contentContainer = document.getElementById('preview-content-container');

      if (ratio === '9:16') {
        frame.style.width = '320px';
        frame.style.height = '600px';
        frame.style.borderRadius = '48px';
        if (rim) rim.style.borderRadius = '44px';
        if (screen) screen.style.borderRadius = '38px';
        if (island) island.style.display = 'flex';
        if (contentContainer) {
          contentContainer.className = 'my-auto z-20 space-y-3.5 py-3';
        }
      } else if (ratio === '1:1') {
        frame.style.width = '380px';
        frame.style.height = '380px';
        frame.style.borderRadius = '32px';
        if (rim) rim.style.borderRadius = '28px';
        if (screen) screen.style.borderRadius = '24px';
        if (island) island.style.display = 'none';
        if (contentContainer) {
          contentContainer.className = 'my-auto z-20 space-y-2 py-1';
        }
      } else if (ratio === '16:9') {
        frame.style.width = '480px';
        frame.style.height = '270px';
        frame.style.borderRadius = '24px';
        if (rim) rim.style.borderRadius = '20px';
        if (screen) screen.style.borderRadius = '16px';
        if (island) island.style.display = 'none';
        if (contentContainer) {
          contentContainer.className = 'my-auto z-20 grid grid-cols-2 gap-4 items-center space-y-0 py-1';
        }
      } else if (ratio === '4:5') {
        frame.style.width = '340px';
        frame.style.height = '425px';
        frame.style.borderRadius = '32px';
        if (rim) rim.style.borderRadius = '28px';
        if (screen) screen.style.borderRadius = '24px';
        if (island) island.style.display = 'none';
        if (contentContainer) {
          contentContainer.className = 'my-auto z-20 space-y-2.5 py-1';
        }
      }

      const btnExportLabel = document.getElementById('btn-export-label');
      if (btnExportLabel) btnExportLabel.textContent = '🎥 Download ' + ratio + ' MP4 Video';
      const btnPdfLabel = document.getElementById('btn-pdf-label');
      if (btnPdfLabel) btnPdfLabel.textContent = '📥 ' + ratio + ' Story PDF';
      const btnPngText = document.getElementById('btn-png-text');
      if (btnPngText) btnPngText.textContent = '🖼️ Save ' + ratio + ' PNG';
      const recordAspectLabel = document.getElementById('record-aspect-label');
      if (recordAspectLabel) recordAspectLabel.textContent = ratio;

      const canvas = document.getElementById('export-canvas');
      const dim = getCanvasDimensions(ratio);
      canvas.width = dim.w;
      canvas.height = dim.h;

      updatePreviewDisplay();
      debouncedSyncToMobile();
    }

    // 1. Export Real H.264 + AAC .MP4 Video via Server-Side FFmpeg + AI Voiceover (with Client Fallback)
    async function exportReelVideo() {
      pausePlayback();
      const ratio = reelState.aspectRatio || '9:16';
      const overlay = document.getElementById('recording-overlay');
      const percentEl = document.getElementById('record-percent');
      const progressBar = document.getElementById('record-progress-bar');
      const btn = document.getElementById('btn-export-video');

      overlay.classList.remove('hidden');
      btn.disabled = true;
      if (percentEl) percentEl.textContent = '15%';
      if (progressBar) progressBar.style.width = '15%';

      let fakeProg = 15;
      const progInterval = setInterval(() => {
        fakeProg = Math.min(92, fakeProg + 6);
        if (percentEl) percentEl.textContent = fakeProg + '%';
        if (progressBar) progressBar.style.width = fakeProg + '%';
      }, 450);

      try {
        const res = await fetch('/v1/tools/reel/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reelState)
        });
        clearInterval(progInterval);

        if (res.ok) {
          const data = await res.json();
          if (data.downloadUrl || data.videoUrl) {
            if (percentEl) percentEl.textContent = '100%';
            if (progressBar) progressBar.style.width = '100%';
            const dlUrl = data.downloadUrl || (data.videoUrl + '?download=true');
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = 'social-' + ratio.replace(':', '-') + '-' + (reelState.brand || 'reel').toLowerCase() + '.mp4';
            document.body.appendChild(a);
            a.click();
            a.remove();

            overlay.classList.add('hidden');
            btn.disabled = false;
            startPlayback();
            return;
          }
        }
      } catch (err) {
        clearInterval(progInterval);
        console.warn('Server MP4 render fallback to local canvas:', err);
      }

      // Fallback: local canvas recording if server endpoint is unreachable
      const dim = getCanvasDimensions(ratio);
      const canvas = document.getElementById('export-canvas');
      canvas.width = dim.w;
      canvas.height = dim.h;
      const ctx = canvas.getContext('2d');

      const exportVid = document.getElementById('export-source-video');
      const hasVideo = reelState.screenrecordUrl && reelState.screenrecordMode !== 'none' && exportVid;
      if (hasVideo) {
        if (exportVid.src !== reelState.screenrecordUrl) {
          exportVid.src = reelState.screenrecordUrl;
          await new Promise((resolve) => {
            exportVid.onloadeddata = () => resolve();
            setTimeout(resolve, 2000);
          });
        }
        exportVid.currentTime = 0;
        try {
          await exportVid.play();
        } catch {}
      }

      const totalSlides = reelState.slides.length;
      const slideDurationMs = 2500;
      const fps = 30;
      const framesPerSlide = (slideDurationMs / 1000) * fps;
      const totalFrames = totalSlides * framesPerSlide;

      const stream = canvas.captureStream(fps);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const finishedPromise = new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'social-' + ratio.replace(':', '-') + '-' + reelState.brand.toLowerCase() + '.webm';
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        };
      });

      recorder.start();

      let frameCount = 0;
      for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
        const slide = reelState.slides[sIdx];
        const theme = themeMaps[reelState.theme] || themeMaps.gradient;

        for (let f = 0; f < framesPerSlide; f++) {
          frameCount++;
          const progress = f / framesPerSlide;
          drawReelFrame(ctx, slide, sIdx, totalSlides, progress, theme, dim.w, dim.h);
          const overallPct = Math.round((frameCount / totalFrames) * 100);
          percentEl.textContent = overallPct + '%';
          progressBar.style.width = overallPct + '%';
          await new Promise((r) => setTimeout(r, 1000 / fps));
        }
      }

      recorder.stop();
      await finishedPromise;

      if (hasVideo && exportVid) {
        exportVid.pause();
      }

      overlay.classList.add('hidden');
      btn.disabled = false;
      startPlayback();
    }

    // Helper: Draws single frame on Canvas with dynamic W and H
    function drawReelFrame(ctx, slide, slideIdx, totalSlides, slideProgress, theme, W, H) {
      if (!W || !H) {
        const dim = getCanvasDimensions(reelState.aspectRatio || '9:16');
        W = dim.w;
        H = dim.h;
      }
      const aspect = reelState.aspectRatio || '9:16';
      const exportVid = document.getElementById('export-source-video');
      const hasBackdrop = reelState.screenrecordUrl && reelState.screenrecordMode === 'backdrop' && exportVid && exportVid.readyState >= 2;

      // 1. Background Fill
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);

      if (hasBackdrop) {
        ctx.save();
        ctx.drawImage(exportVid, 0, 0, W, H);
        ctx.fillStyle = 'rgba(3, 7, 18, 0.72)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        // Gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        if (reelState.theme === 'nordic') {
          grad.addColorStop(0, '#101726');
          grad.addColorStop(0.5, '#0e141f');
          grad.addColorStop(1, '#080c14');
        } else if (reelState.theme === 'bento') {
          grad.addColorStop(0, '#070b14');
          grad.addColorStop(1, '#020408');
        } else if (reelState.theme === 'brutalist') {
          grad.addColorStop(0, '#000000');
          grad.addColorStop(1, '#000000');
        } else if (reelState.theme === 'creator') {
          grad.addColorStop(0, '#1c082c');
          grad.addColorStop(0.5, '#120420');
          grad.addColorStop(1, '#08020e');
        } else if (reelState.theme === 'terminal') {
          grad.addColorStop(0, '#080c14');
          grad.addColorStop(1, '#04070a');
        } else if (reelState.theme === 'brand' && reelState.brandColors) {
          grad.addColorStop(0, reelState.brandColors.primary);
          grad.addColorStop(1, reelState.brandColors.secondary);
        } else if (reelState.theme === 'cyberpunk') {
          grad.addColorStop(0, '#09090b');
          grad.addColorStop(1, '#18181b');
        } else if (reelState.theme === 'midnight') {
          grad.addColorStop(0, '#000000');
          grad.addColorStop(1, '#050505');
        } else if (reelState.theme === 'sunset') {
          grad.addColorStop(0, '#4c0519');
          grad.addColorStop(0.5, '#030712');
          grad.addColorStop(1, '#451a03');
        } else if (reelState.theme === 'clean') {
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(1, '#e2e8f0');
        } else {
          grad.addColorStop(0, '#1e1b4b');
          grad.addColorStop(0.5, '#2e1065');
          grad.addColorStop(1, '#020617');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Radial glow
        if (reelState.theme === 'nordic') {
          const radial = ctx.createRadialGradient(W * 0.8, H * 0.15, 50, W * 0.8, H * 0.15, 600);
          radial.addColorStop(0, 'rgba(217, 119, 6, 0.18)');
          radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, W, H);
        } else if (reelState.theme === 'bento') {
          const radial = ctx.createRadialGradient(W * 0.5, H * 0.1, 50, W * 0.5, H * 0.1, 700);
          radial.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
          radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, W, H);
        } else if (reelState.theme === 'terminal') {
          const radial = ctx.createRadialGradient(W * 0.8, H * 0.15, 50, W * 0.8, H * 0.15, 600);
          radial.addColorStop(0, 'rgba(52, 211, 153, 0.2)');
          radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, W, H);
        } else if (reelState.theme === 'creator') {
          const radial = ctx.createRadialGradient(W * 0.2, H * 0.2, 50, W * 0.2, H * 0.2, 600);
          radial.addColorStop(0, 'rgba(244, 63, 94, 0.25)');
          radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, W, H);
        } else if (reelState.theme !== 'brutalist') {
          const radial = ctx.createRadialGradient(W * 0.8, H * 0.15, 50, W * 0.8, H * 0.15, 600);
          radial.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
          radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, W, H);
        }
      }

      const themeKey = reelState.theme || 'brand';
      const isLight = themeKey === 'clean';
      const fontHead = theme.fontHead || 'system-ui, -apple-system, sans-serif';
      const fontBody = theme.fontBody || 'system-ui, -apple-system, sans-serif';
      const slideType = slide.slideType || (slideIdx === 0 ? 'hook' : slideIdx === 1 ? 'problem' : slideIdx === 2 ? 'stat' : 'cta');
      const cardRadius = themeKey === 'brutalist' ? 0 : 28;

      // Archetype Stage Backdrop Chrome
      if (themeKey === 'terminal') {
        ctx.save();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.05)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < W; gx += 40) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 40) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }
        ctx.restore();
      } else if (themeKey === 'brutalist') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        for (let gx = 24; gx < W; gx += 32) {
          for (let gy = 24; gy < H; gy += 32) {
            ctx.fillRect(gx, gy, 2, 2);
          }
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '900 30px ' + fontHead;
        ctx.textAlign = 'left';
        ctx.fillText('+', 34, 52);
        ctx.fillText('+', W - 56, 52);
        ctx.fillText('+', 34, H - 30);
        ctx.fillText('+', W - 56, H - 30);
        ctx.restore();
      } else if (themeKey === 'nordic') {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 38, 38, W - 76, H - 76, 22, false, true);
        ctx.restore();
      }

      // 2. Progress bars (Skipped in clean video export mode)
      const isClean = reelState.cleanExport !== false;
      const barMargin = aspect === '1:1' ? 60 : aspect === '4:5' ? 70 : 80;

      if (!isClean) {
        const barTop = aspect === '9:16' ? 90 : aspect === '4:5' ? 60 : 50;
        const barHeight = aspect === '1:1' ? 7 : 8;
        const barSpacing = 16;
        const totalBarWidth = W - (barMargin * 2);
        const singleBarWidth = (totalBarWidth - (barSpacing * (totalSlides - 1))) / totalSlides;

        for (let i = 0; i < totalSlides; i++) {
          const x = barMargin + i * (singleBarWidth + barSpacing);
          ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.2)';
          roundRect(ctx, x, barTop, singleBarWidth, barHeight, themeKey === 'brutalist' ? 0 : 4, true, false);

          let fillW = 0;
          if (i < slideIdx) {
            fillW = singleBarWidth;
          } else if (i === slideIdx) {
            fillW = singleBarWidth * slideProgress;
          }
          if (fillW > 0) {
            ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : (isLight ? '#0f172a' : '#ffffff');
            roundRect(ctx, x, barTop, fillW, barHeight, themeKey === 'brutalist' ? 0 : 4, true, false);
          }
        }
      }

      // 3. Header: Brand Avatar & Name
      const headerY = isClean
        ? (aspect === '9:16' ? 100 : aspect === '4:5' ? 80 : 70)
        : (aspect === '9:16' ? 160 : aspect === '4:5' ? 120 : 100);
      const avatarSize = aspect === '9:16' ? 80 : 70;
      
      // Avatar or Brand Logo
      const logoImg = document.getElementById('preview-logo-img');
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0 && !logoImg.classList.contains('hidden')) {
        ctx.save();
        roundRect(ctx, barMargin, headerY, avatarSize, avatarSize, themeKey === 'brutalist' ? 0 : 20, false, false);
        ctx.clip();
        ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(barMargin, headerY, avatarSize, avatarSize);
        ctx.drawImage(logoImg, barMargin, headerY, avatarSize, avatarSize);
        ctx.restore();
      } else {
        ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : '#6366f1';
        roundRect(ctx, barMargin, headerY, avatarSize, avatarSize, themeKey === 'brutalist' ? 0 : 22, true, false);
        ctx.fillStyle = themeKey === 'brutalist' ? '#000000' : '#ffffff';
        ctx.font = 'bold ' + (avatarSize === 80 ? '36px ' : '32px ') + fontHead;
        ctx.textAlign = 'center';
        ctx.fillText(reelState.brand.slice(0, 2).toUpperCase(), barMargin + avatarSize / 2, headerY + (avatarSize * 0.65));
      }

      // Brand text
      ctx.textAlign = 'left';
      ctx.font = 'bold ' + (avatarSize === 80 ? '38px ' : '34px ') + fontHead;
      ctx.fillStyle = theme.text;
      ctx.fillText(reelState.brand, barMargin + avatarSize + 20, headerY + (avatarSize * 0.48));

      ctx.font = '500 24px ' + fontBody;
      ctx.fillStyle = theme.subtext;
      ctx.fillText(reelState.handle, barMargin + avatarSize + 20, headerY + (avatarSize * 0.88));

      // Tag Pill
      const tagText = (theme.badgeIcon ? theme.badgeIcon + ' ' : '') + (slide.tag || 'HOOK').toUpperCase();
      ctx.font = 'bold 22px ' + fontBody;
      const tagWidth = ctx.measureText(tagText).width + 48;
      ctx.fillStyle = theme.tagBg;
      roundRect(ctx, W - barMargin - tagWidth, headerY + 10, tagWidth, 50, themeKey === 'brutalist' ? 0 : 25, true, false);
      ctx.fillStyle = theme.tagText;
      ctx.textAlign = 'center';
      ctx.fillText(tagText, W - barMargin - tagWidth / 2, headerY + 43);

      // 4. Content Area adapted to Aspect Ratio & Visual Layout Template
      const hWords = (slide.headline || '').split(' ').filter(Boolean).length;
      const bWords = (slide.body || '').split(' ').filter(Boolean).length;
      const totalW = hWords + bWords;
      const layout = reelState.layout || 'classic';
      const hasInsetVid = !!(reelState.screenrecordUrl && reelState.screenrecordMode === 'inset' && exportVid && exportVid.readyState >= 2);
      const hiWords = Array.isArray(slide.highlightWords) ? slide.highlightWords : [];

      if (layout === 'editorial' && aspect === '9:16') {
        const watermark = slide.stat || ('0' + (slideIdx + 1));
        ctx.save();
        ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)';
        ctx.font = '900 280px ' + fontHead;
        ctx.textAlign = 'left';
        ctx.fillText(watermark, barMargin - 10, H * 0.45);
        ctx.restore();

        const editX = barMargin + 42;
        const editW = W - editX - barMargin;
        ctx.fillStyle = theme.statColor || '#38bdf8';
        roundRect(ctx, barMargin, 410, themeKey === 'brutalist' ? 16 : 12, 680, themeKey === 'brutalist' ? 0 : 6, true, false);

        if (themeKey === 'nordic') {
          ctx.save();
          ctx.fillStyle = theme.statColor || '#fbbf24';
          ctx.font = 'italic 600 26px ' + fontHead;
          ctx.textAlign = 'left';
          ctx.fillText('kap. 0' + (slideIdx + 1), editX, 415);
          ctx.restore();
        }

        ctx.textAlign = 'left';
        ctx.font = '900 68px ' + fontHead;
        drawKaraokeText(ctx, slide.headline, editX, 480, editW, 86, 0, totalW, slideProgress, theme, hiWords, themeKey);

        let bodyY = 820;
        if (slide.stat) {
          ctx.font = '900 84px ' + fontHead;
          const statW = ctx.measureText(slide.stat).width;
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, editX, 895);
          ctx.font = 'bold 30px ' + fontBody;
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'METRIC').toUpperCase(), editX + statW + 30, 885);
          bodyY = 1010;
        }
        ctx.font = '500 38px ' + fontBody;
        drawKaraokeText(ctx, slide.body, editX, bodyY, editW, 60, hWords, totalW, slideProgress, theme, [], themeKey);

      } else if (layout === 'split' && aspect === '9:16') {
        const splitY = Math.round(H * 0.43);
        ctx.save();
        if (hasInsetVid) {
          ctx.drawImage(exportVid, 0, 220, W, splitY - 220);
        } else {
          ctx.fillStyle = isLight ? 'rgba(226, 232, 240, 0.7)' : 'rgba(9, 13, 22, 0.35)';
          ctx.fillRect(0, 220, W, splitY - 220);
          ctx.fillStyle = theme.statColor || '#38bdf8';
          ctx.font = '900 120px ' + fontHead;
          ctx.textAlign = 'center';
          ctx.fillText(slide.stat || ('0' + (slideIdx + 1)), W / 2, splitY - 190);
        }
        ctx.fillStyle = theme.statColor || '#38bdf8';
        ctx.fillRect(0, splitY - 3, W, 6);
        ctx.fillStyle = isLight ? 'rgba(248, 250, 252, 0.92)' : 'rgba(9, 13, 22, 0.85)';
        ctx.fillRect(0, splitY + 3, W, H - splitY);
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.font = '900 62px ' + fontHead;
        drawKaraokeText(ctx, slide.headline, barMargin, splitY + 110, W - (barMargin * 2), 78, 0, totalW, slideProgress, theme, hiWords, themeKey);
        ctx.font = '500 38px ' + fontBody;
        drawKaraokeText(ctx, slide.body, barMargin, splitY + 380, W - (barMargin * 2), 58, hWords, totalW, slideProgress, theme, [], themeKey);

      } else if (layout === 'iphone' && aspect === '9:16') {
        ctx.textAlign = 'left';
        ctx.font = '900 52px ' + fontHead;
        drawKaraokeText(ctx, slide.headline, barMargin, 285, W - (barMargin * 2), 66, 0, totalW, slideProgress, theme, hiWords, themeKey);

        const pW = 440, pH = 740, pX = (W - pW) / 2, pY = 430;
        ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : '#334155';
        roundRect(ctx, pX - 10, pY - 10, pW + 20, pH + 20, 64, true, false);
        ctx.fillStyle = '#090d16';
        roundRect(ctx, pX, pY, pW, pH, 54, true, false);
        if (hasInsetVid) {
          ctx.save();
          roundRect(ctx, pX + 8, pY + 8, pW - 16, pH - 16, 46, false, false);
          ctx.clip();
          ctx.drawImage(exportVid, pX + 8, pY + 8, pW - 16, pH - 16);
          ctx.restore();
        } else {
          ctx.fillStyle = theme.statColor || '#38bdf8';
          ctx.font = '900 84px ' + fontHead;
          ctx.textAlign = 'center';
          ctx.fillText(slide.stat || ('0' + (slideIdx + 1)), W / 2, pY + pH * 0.5);
        }
        ctx.fillStyle = '#000000';
        roundRect(ctx, W / 2 - 65, pY + 20, 130, 32, 16, true, false);

        ctx.textAlign = 'left';
        ctx.font = '500 36px ' + fontBody;
        drawKaraokeText(ctx, slide.body, barMargin, pY + pH + 85, W - (barMargin * 2), 54, hWords, totalW, slideProgress, theme, [], themeKey);

      } else if (aspect === '16:9') {
        // 2-Column Wide Cinematic Layout
        ctx.textAlign = 'left';
        ctx.font = '900 58px ' + fontHead;
        drawKaraokeText(ctx, slide.headline, barMargin, 290, 820, 74, 0, totalW, slideProgress, theme, hiWords, themeKey);

        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 580, 820, 140, cardRadius, true, false);

          ctx.font = '900 78px ' + fontHead;
          const statW = ctx.measureText(slide.stat).width;
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 40, 680);

          ctx.font = 'bold 28px ' + fontBody;
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'METRIC').toUpperCase(), barMargin + 40 + statW + 30, 670);
        }

        // Right Column Body Text
        ctx.font = '500 36px ' + fontBody;
        drawKaraokeText(ctx, slide.body, W / 2 + 30, 310, W / 2 - barMargin - 40, 58, hWords, totalW, slideProgress, theme, [], themeKey);

      } else if (aspect === '1:1') {
        // Square Post Layout
        ctx.textAlign = 'left';
        ctx.font = '900 52px ' + fontHead;
        drawKaraokeText(ctx, slide.headline, barMargin, 270, W - (barMargin * 2), 68, 0, totalW, slideProgress, theme, hiWords, themeKey);

        let bodyY = 460;
        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 430, W - (barMargin * 2), 125, cardRadius, true, false);

          ctx.font = '900 70px ' + fontHead;
          const statW = ctx.measureText(slide.stat).width;
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 35, 520);

          ctx.font = 'bold 26px ' + fontBody;
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'GROWTH').toUpperCase(), barMargin + 35 + statW + 25, 510);

          bodyY = 620;
        }

        ctx.font = '500 32px ' + fontBody;
        drawKaraokeText(ctx, slide.body, barMargin, bodyY, W - (barMargin * 2), 50, hWords, totalW, slideProgress, theme, [], themeKey);

      } else if (aspect === '4:5') {
        // 4:5 Feed Portrait Layout
        ctx.textAlign = 'left';
        ctx.font = '900 58px ' + fontHead;
        drawKaraokeText(ctx, slide.headline, barMargin, 320, W - (barMargin * 2), 76, 0, totalW, slideProgress, theme, hiWords, themeKey);

        let bodyY = 540;
        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 530, W - (barMargin * 2), 135, cardRadius, true, false);

          ctx.font = '900 76px ' + fontHead;
          const statW = ctx.measureText(slide.stat).width;
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 35, 625);

          ctx.font = 'bold 28px ' + fontBody;
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'GROWTH').toUpperCase(), barMargin + 35 + statW + 30, 615);

          bodyY = 740;
        }

        ctx.font = '500 34px ' + fontBody;
        drawKaraokeText(ctx, slide.body, barMargin, bodyY, W - (barMargin * 2), 54, hWords, totalW, slideProgress, theme, [], themeKey);

      } else {
        // 9:16 Full Vertical Reel (Classic Card with Archetype Chrome & Slide-Role Framing)
        const shouldCardFrame = (themeKey === 'terminal' || themeKey === 'brutalist' || slideType === 'problem') && !hasInsetVid;
        const innerPad = shouldCardFrame ? 36 : 0;

        if (shouldCardFrame) {
          ctx.save();
          if (themeKey === 'brutalist') {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(barMargin + 10, 386, W - (barMargin * 2), 620);
            ctx.fillStyle = '#050505';
            ctx.fillRect(barMargin, 376, W - (barMargin * 2), 620);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(barMargin, 376, W - (barMargin * 2), 620);
          } else {
            ctx.fillStyle = theme.cardBg || 'rgba(15, 23, 42, 0.85)';
            roundRect(ctx, barMargin, 376, W - (barMargin * 2), 620, 28, true, false);
            ctx.strokeStyle = theme.statBorder || 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 2;
            roundRect(ctx, barMargin, 376, W - (barMargin * 2), 620, 28, false, true);
            if (themeKey === 'terminal') {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
              roundRect(ctx, barMargin + 2, 378, W - (barMargin * 2) - 4, 42, 24, true, false);
              ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(barMargin + 26, 399, 6, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(barMargin + 46, 399, 6, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#34d399'; ctx.beginPath(); ctx.arc(barMargin + 66, 399, 6, 0, Math.PI * 2); ctx.fill();
            }
          }
          ctx.restore();
        }

        ctx.textAlign = 'left';
        ctx.font = '900 ' + (hasInsetVid ? '58px ' : '68px ') + fontHead;
        const hRes = drawKaraokeText(ctx, slide.headline, barMargin + innerPad, hasInsetVid ? 320 : 480, W - ((barMargin + innerPad) * 2), hasInsetVid ? 74 : 88, 0, totalW, slideProgress, theme, hiWords, themeKey);

        let curY = hasInsetVid ? Math.max(460, hRes.endY + 20) : Math.max(760, hRes.endY + 24);
        if (hasInsetVid) {
          const winW = W - (barMargin * 2);
          const winH = 420;
          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          roundRect(ctx, barMargin, curY, winW, winH, cardRadius, true, false);
          roundRect(ctx, barMargin, curY, winW, winH, cardRadius, false, false);
          ctx.clip();
          ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
          ctx.fillRect(barMargin, curY, winW, 42);
          ctx.drawImage(exportVid, barMargin, curY + 42, winW, winH - 42);
          ctx.restore();
          curY += winH + 40;
        }

        let bodyY = curY + 20;
        if (slide.stat) {
          const boxH = hasInsetVid ? 128 : 150;
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin + innerPad, curY, W - ((barMargin + innerPad) * 2), boxH, cardRadius, true, false);

          ctx.font = '900 ' + (hasInsetVid ? '70px ' : '84px ') + fontHead;
          const statW = ctx.measureText(slide.stat).width;
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + innerPad + 40, curY + (hasInsetVid ? 90 : 105));

          ctx.font = 'bold 32px ' + fontBody;
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'GROWTH').toUpperCase(), barMargin + innerPad + 40 + statW + 40, curY + (hasInsetVid ? 80 : 95));

          bodyY = curY + boxH + (hasInsetVid ? 70 : 90);
        }

        ctx.font = '500 38px ' + fontBody;
        drawKaraokeText(ctx, (themeKey === 'terminal' ? '> ' : '') + (slide.body || ''), barMargin + innerPad, bodyY, W - ((barMargin + innerPad) * 2), 60, hWords, totalW, slideProgress, theme, [], themeKey);
      }

      // 5. Footer CTA
      const footerY = aspect === '16:9' ? H - 70 : aspect === '1:1' ? H - 70 : aspect === '4:5' ? H - 90 : H - 120;

      if (!isClean) {
        ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(barMargin, footerY - 40);
        ctx.lineTo(W - barMargin, footerY - 40);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(barMargin + 15, footerY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 28px ' + fontBody;
        ctx.fillStyle = theme.text;
        ctx.textAlign = 'left';
        ctx.fillText(reelState.cta, barMargin + 40, footerY + 10);

        ctx.textAlign = 'right';
        ctx.font = 'bold 26px ' + fontBody;
        ctx.fillStyle = theme.subtext;
        ctx.fillText((slideIdx + 1) + ' / ' + totalSlides, W - barMargin, footerY + 10);
      } else {
        // Clean professional video footer: Floating glass pill without horizontal line and without slide number
        if (reelState.cta) {
          ctx.save();
          const ctaText = reelState.cta;
          ctx.font = 'bold 28px ' + fontBody;
          const textW = ctx.measureText(ctaText).width;
          const pillH = 58;
          const pillW = Math.min(W - (barMargin * 2), textW + 68);
          const pillX = barMargin;
          const pillY = footerY - 26;
          const pillR = themeKey === 'brutalist' ? 0 : 29;

          ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : (isLight ? '#0f172a' : 'rgba(255, 255, 255, 0.12)');
          roundRect(ctx, pillX, pillY, pillW, pillH, pillR, true, false);
          ctx.strokeStyle = themeKey === 'brutalist' ? '#ffffff' : (isLight ? '#0f172a' : 'rgba(255, 255, 255, 0.22)');
          ctx.lineWidth = themeKey === 'brutalist' ? 3 : 1.5;
          roundRect(ctx, pillX, pillY, pillW, pillH, pillR, false, true);

          // Green live dot
          ctx.fillStyle = themeKey === 'brutalist' ? '#000000' : '#10b981';
          ctx.beginPath();
          ctx.arc(pillX + 26, pillY + pillH / 2, 8, 0, Math.PI * 2);
          ctx.fill();

          // CTA text
          ctx.fillStyle = themeKey === 'brutalist' ? '#000000' : '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(ctaText, pillX + 46, pillY + 39);
          ctx.restore();
        }
      }
    }

    // Canvas drawKaraokeText helper (supports keyword highlighting on headlines when highlightWords provided)
    function drawKaraokeText(ctx, text, startX, startY, maxWidth, lineHeight, wordOffset, totalWords, slideProgress, theme, highlightWords, themeKey) {
      if (!text) return { endY: startY, wordCount: 0 };
      const words = text.split(' ').filter(Boolean);
      if (words.length === 0) return { endY: startY, wordCount: 0 };

      const hiSet = new Set();
      if (Array.isArray(highlightWords)) {
        highlightWords.forEach(function(ph) {
          String(ph || '').toLowerCase().split(/\s+/).forEach(function(w) {
            const clean = w.replace(/[^a-zæøåäöü0-9-]/gi, '');
            if (clean.length >= 3) hiSet.add(clean);
          });
        });
      }

      let curX = startX;
      let curY = startY;
      const spaceWidth = ctx.measureText(' ').width;
      const baseColor = wordOffset > 0 ? (theme.subtext || '#cbd5e1') : (theme.text || '#ffffff');

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = ctx.measureText(word).width;
        if (curX + wordWidth > startX + maxWidth && curX > startX) {
          curX = startX;
          curY += lineHeight;
        }
        const cleanTok = word.toLowerCase().replace(/[^a-zæøåäöü0-9-]/gi, '');
        if (wordOffset === 0 && cleanTok.length >= 3 && hiSet.has(cleanTok)) {
          ctx.save();
          if (themeKey === 'brutalist') {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(curX - 6, curY - lineHeight * 0.68, wordWidth + 12, lineHeight * 0.85);
            ctx.fillStyle = '#000000';
          } else {
            ctx.fillStyle = (theme.statColor || '#38bdf8') + '2e';
            roundRect(ctx, curX - 6, curY - lineHeight * 0.68, wordWidth + 12, lineHeight * 0.85, 8, true, false);
            ctx.fillStyle = themeKey === 'nordic' ? '#fde68a' : (themeKey === 'clean' ? (theme.statColor || '#2563eb') : '#ffffff');
          }
          ctx.fillText(word, curX, curY);
          ctx.restore();
        } else {
          ctx.fillStyle = baseColor;
          ctx.fillText(word, curX, curY);
        }
        curX += wordWidth + spaceWidth;
      }

      return { endY: curY + lineHeight, wordCount: words.length };
    }

    // Canvas roundRect helper
    function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
      if (!radius || radius <= 0) {
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    }

    // Canvas wrapText helper
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    }

    // 2. Download Multi-Page Vector PDF
    async function downloadReelPdf() {
      const btn = document.getElementById('btn-download-pdf');
      btn.disabled = true;
      const ratio = reelState.aspectRatio || '9:16';
      btn.textContent = 'Generating PDF...';

      try {
        const res = await fetch('/v1/tools/reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reelState)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error generating PDF');
        if (data.pdfUrl) {
          window.open(data.pdfUrl, '_blank');
        }
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>📥 ' + ratio + ' Story PDF</span>';
      }
    }

    // 3. Save Current Frame as PNG
    function saveCurrentSlidePng() {
      const ratio = reelState.aspectRatio || '9:16';
      const dim = getCanvasDimensions(ratio);
      const canvas = document.getElementById('export-canvas');
      canvas.width = dim.w;
      canvas.height = dim.h;
      const ctx = canvas.getContext('2d');
      const theme = themeMaps[reelState.theme] || themeMaps.gradient;
      const slide = reelState.slides[currentSlideIdx];

      drawReelFrame(ctx, slide, currentSlideIdx, reelState.slides.length, 1.0, theme, dim.w, dim.h);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'social-' + ratio.replace(':', '-') + '-slide-' + (currentSlideIdx + 1) + '.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    }

    // 4. Mobile QR Preview Modal
    async function openMobilePreviewModal() {
      const modal = document.getElementById('qr-preview-modal');
      modal.classList.remove('hidden');
      const display = document.getElementById('qr-code-display');
      const urlInput = document.getElementById('qr-share-url-input');

      if (!activeSessionSlug) {
        display.innerHTML = '<div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>';

        try {
          const res = await fetch('/v1/tools/reel/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reelState)
          });
          const data = await res.json();
          if (data.qrSvg && data.previewUrl) {
            activeSessionSlug = data.slug;
            display.innerHTML = data.qrSvg;
            urlInput.value = data.previewUrl;
          } else {
            throw new Error('Failed to generate QR code');
          }
        } catch (err) {
          display.innerHTML = '<div class="text-xs text-rose-500 font-bold p-4">Failed to generate QR: ' + err.message + '</div>';
        }
      } else {
        debouncedSyncToMobile();
      }
    }

    function closeMobilePreviewModal() {
      document.getElementById('qr-preview-modal').classList.add('hidden');
    }

    function copyShareUrl() {
      const urlInput = document.getElementById('qr-share-url-input');
      if (!urlInput || !urlInput.value) return;
      navigator.clipboard.writeText(urlInput.value);
      const btn = document.getElementById('btn-copy-share-url');
      btn.textContent = 'Copied! ✓';
      btn.classList.add('bg-emerald-600');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('bg-emerald-600');
      }, 2000);
    }
  </script>
</body>
</html>`;

    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/tools/reel', { schema: { hide: true } }, reelHandler);
  fastify.get('/reel', { schema: { hide: true } }, reelHandler);

  // ==========================================
  // FREE API ENDPOINTS (IP Rate-limited)
  // ==========================================

  const ErrorResponseSchema = z.object({
    statusCode: z.number(),
    error: z.string(),
    message: z.string(),
  });

  // 1. POST /v1/tools/carousel
  fastify.post(
    '/v1/tools/carousel',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Generate LinkedIn / Instagram Carousel PDF',
        description: 'Generates a multi-slide 1080x1350 px portrait document from Markdown slides (separated by "---") with custom branding and themes. Returns a hosted PDF link and cover image URL.',
        body: z.object({
          author_name: z.string().optional().default('Tailprint Insights').describe('Author name to brand each slide'),
          author_handle: z.string().optional().default('@tailprint').describe('Author social handle (e.g. @company)'),
          author_role: z.string().optional().default('High-Performance Engine').describe('Author title or subtitle'),
          theme: z.enum(['dark', 'light', 'emerald', 'gradient']).optional().default('dark').describe('Visual slide theme'),
          markdown: z.string().min(5).describe('Markdown slide content separated by ---'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            pdfUrl: z.string().optional().describe('Direct CDN URL to multi-page carousel PDF'),
            previewUrl: z.string().optional().describe('Direct CDN URL to slide 1 cover PNG'),
            slideCount: z.number().describe('Total slides generated'),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const result = await carouselService.renderCarousel({
        author: {
          name: body.author_name || 'Tailprint Insights',
          handle: body.author_handle || '@tailprint',
          role: body.author_role || 'High-Performance Engine',
        },
        theme: body.theme || 'dark',
        markdown: body.markdown,
      });

      return reply.code(200).send({
        success: true,
        pdfUrl: result.pdfStored?.hostedUrl,
        previewUrl: result.previewStored?.hostedUrl,
        slideCount: result.slideCount,
      });
    }
  );

  // 2. POST /v1/tools/factur-x
  fastify.post(
    '/v1/tools/factur-x',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Generate Factur-X / PEPPOL Hybrid E-Invoice',
        description: 'Generates an EU-compliant hybrid electronic invoice conforming to EN 16931 / Factur-X / ZUGFeRD 2.2 with embedded XML and visual PDF layout.',
        body: z.object({
          invoiceNumber: z.string().min(1).describe('Unique invoice identifier'),
          currency: z.string().length(3).default('EUR').describe('3-letter ISO currency code (e.g. EUR, DKK, USD)'),
          dueDate: z.string().optional().describe('Payment due date in YYYY-MM-DD'),
          seller: z.object({
            name: z.string().min(1).describe('Supplier/seller company name'),
            vatId: z.string().optional().describe('Supplier VAT / CVR number'),
            street: z.string().optional(),
            city: z.string().optional(),
            country: z.string().length(2).default('DK').describe('2-letter ISO country code'),
          }),
          buyer: z.object({
            name: z.string().min(1).describe('Buyer company name'),
            vatId: z.string().optional().describe('Buyer VAT number'),
            street: z.string().optional(),
            city: z.string().optional(),
            country: z.string().length(2).default('DE').describe('2-letter ISO country code'),
          }),
          lineItems: z.array(
            z.object({
              name: z.string().describe('Item or service description'),
              quantity: z.number().positive().describe('Quantity billed'),
              unitPrice: z.number().nonnegative().describe('Unit price excluding VAT'),
              vatRate: z.number().nonnegative().default(25).describe('VAT rate percentage (e.g. 25 for 25%)'),
            })
          ),
          paymentIban: z.string().optional().describe('Bank IBAN for wire transfer'),
          paymentBic: z.string().optional().describe('Bank SWIFT/BIC code'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            pdfUrl: z.string().optional().describe('Hosted hybrid PDF link'),
            xmlSnippet: z.string().describe('Snippet of embedded CrossIndustryInvoice XML'),
            grossTotal: z.number().describe('Total invoice amount including VAT'),
            currency: z.string().describe('Invoice currency'),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const result = await eInvoiceService.generateHybridInvoice({
        invoiceNumber: body.invoiceNumber,
        currency: body.currency,
        dueDate: body.dueDate,
        seller: body.seller,
        buyer: body.buyer,
        lineItems: body.lineItems,
        paymentIban: body.paymentIban,
        paymentBic: body.paymentBic,
      });

      return reply.code(200).send({
        success: true,
        pdfUrl: result.pdfStored?.hostedUrl,
        xmlSnippet: result.xml.slice(0, 800) + '...',
        grossTotal: result.grossTotal,
        currency: result.currency,
      });
    }
  );

  // 3. POST /v1/tools/visual-diff
  fastify.post(
    '/v1/tools/visual-diff',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Generate Visual Regression Diff Heatmap',
        description: 'Captures two public URLs and generates a 3-panel comparison image (Baseline, Modified, Diff Overlay) highlighting visual changes in neon-pink.',
        body: z.object({
          before_url: z.string().url().describe('Baseline URL before code or styling changes'),
          after_url: z.string().url().describe('Target URL after changes'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            diffImageUrl: z.string().describe('Hosted URL of the 3-panel diff heatmap image'),
            diffPixels: z.number().describe('Number of mismatched pixels'),
            diffPercentage: z.number().describe('Percentage of visual deviation'),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const result = await visualDiffService.compareSnapshots({
        beforeUrl: body.before_url,
        afterUrl: body.after_url,
        width: 1200,
        height: 800,
      });

      const stored = await storageService.saveFile(result.compositeImageBuffer, {
        mimeType: 'image/png',
        extension: 'png',
        filename: 'visual-diff.png',
      });

      return reply.code(200).send({
        success: true,
        diffImageUrl: stored.hostedUrl,
        diffPixels: result.differentPixels,
        diffPercentage: result.diffPercentage,
      });
    }
  );

  // 4. POST /v1/tools/mockup
  fastify.post(
    '/v1/tools/mockup',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Generate 3D Device Mockup (MacBook & iPhone)',
        description: 'Captures any public web URL and renders a photorealistic 3D presentation scene containing a MacBook Pro and floating iPhone on a studio gradient canvas.',
        body: z.object({
          url: z.string().url().describe('Public web URL to render inside the device frames'),
          title: z.string().optional().describe('Headline text displayed at the top of the canvas'),
          delay_ms: z.number().min(0).max(10000).optional().default(500).describe('Render wait time in milliseconds'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            mockupUrl: z.string().describe('Hosted URL of the generated 1600x1000 mockup PNG'),
            width: z.number(),
            height: z.number(),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const buffer = await mockupService.renderDeviceMockup({
        url: body.url,
        title: body.title,
        delay_ms: body.delay_ms ?? 500,
      });

      const stored = await storageService.saveFile(buffer, {
        mimeType: 'image/png',
        extension: 'png',
        filename: 'device-mockup.png',
      });

      return reply.code(200).send({
        success: true,
        mockupUrl: stored.hostedUrl,
        width: 1600,
        height: 1000,
      });
    }
  );

  // 5. POST /v1/tools/reel/script
  fastify.post(
    '/v1/tools/reel/script',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Generate Social Reel Script & Live Screenrecord from URL',
        description: 'Scrapes a given URL, synthesizes a punchy 4-5 slide script with tags, headlines, body insights, and optionally captures a live scrolling video of the target site.',
        body: z.object({
          url: z.string().url().describe('Public web URL to extract insights from'),
          record_video: z.boolean().optional().default(false).describe('Whether to capture a live scrolling screen recording of the target website'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            script: z.object({
              title: z.string(),
              brand: z.string(),
              handle: z.string().optional(),
              theme: z.string(),
              layout: z.string().optional(),
              aspectRatio: z.string().optional(),
              screenrecordUrl: z.string().optional(),
              screenrecordMode: z.string().optional(),
              language: z.string().optional(),
              languageLabel: z.string().optional(),
              logoUrl: z.string().optional(),
              brandColors: z
                .object({
                  primary: z.string(),
                  secondary: z.string(),
                  accent: z.string(),
                })
                .optional(),
              slides: z.array(
                z.object({
                  tag: z.string().optional(),
                  headline: z.string(),
                  body: z.string(),
                  stat: z.string().optional(),
                  statLabel: z.string().optional(),
                  slideType: z.string().optional(),
                  highlightWords: z.array(z.string()).optional(),
                })
              ),
              cta: z.string(),
              sourceUrl: z.string().optional(),
            }),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const script = await reelService.generateScriptFromUrl(body.url, Boolean(body.record_video));
      return reply.code(200).send({
        success: true,
        script,
      });
    }
  );

  // 5.5 POST /v1/tools/reel/screenrecord
  fastify.post(
    '/v1/tools/reel/screenrecord',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Capture Live Scrolling Screenrecord of any Webpage',
        description: 'Navigates to any public URL, suppresses cookie dialogs, and records a smooth scrolling video exported as WebM on CDN.',
        body: z.object({
          url: z.string().url().describe('Webpage URL to record'),
          width: z.number().optional().default(720),
          height: z.number().optional().default(1280),
          durationMs: z.number().optional().default(3500),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            screenrecordUrl: z.string(),
            width: z.number(),
            height: z.number(),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const result = await reelService.captureLiveScreenrecord(body.url, {
        width: body.width,
        height: body.height,
        durationMs: body.durationMs,
      });

      return reply.code(200).send({
        success: true,
        screenrecordUrl: result.hostedUrl,
        width: result.width,
        height: result.height,
      });
    }
  );

  // 6. POST /v1/tools/reel
  fastify.post(
    '/v1/tools/reel',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Render Multi-Format Social Video/Reel PDF & Preview PNG',
        description: 'Generates a full-bleed vector PDF story deck and cover PNG from structured slide data in 9:16, 1:1, 16:9 or 4:5.',
        body: z.object({
          title: z.string().default('Social Reel Deck'),
          brand: z.string().default('Brand'),
          handle: z.string().optional().default('@brand'),
          logoUrl: z.string().optional(),
          brandColors: z
            .object({
              primary: z.string(),
              secondary: z.string(),
              accent: z.string(),
            })
            .optional(),
          theme: z.enum(['brand', 'nordic', 'bento', 'brutalist', 'creator', 'terminal', 'cyberpunk', 'midnight', 'gradient', 'sunset', 'clean']).default('brand'),
          aspectRatio: z.enum(['9:16', '1:1', '16:9', '4:5']).optional().default('9:16'),
          screenrecordUrl: z.string().optional(),
          screenrecordMode: z.enum(['inset', 'backdrop', 'none']).optional().default('inset'),
          cleanExport: z.boolean().optional().default(true),
          slides: z
            .array(
              z.object({
                tag: z.string().optional(),
                headline: z.string(),
                body: z.string(),
                stat: z.string().optional(),
                statLabel: z.string().optional(),
                slideType: z.string().optional(),
                highlightWords: z.array(z.string()).optional(),
              })
            )
            .min(1),
          cta: z.string().default('Follow for more • Link in bio'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            pdfUrl: z.string().optional().describe('Hosted URL of the multi-page 9:16 PDF story deck'),
            previewUrl: z.string().optional().describe('Hosted URL of the cover PNG preview'),
            slideCount: z.number().describe('Total slides generated'),
          }),
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI script limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = request.body as any;
      const result = await reelService.renderReelDeck(body);
      return reply.code(200).send({
        success: true,
        pdfUrl: result.pdfStored?.hostedUrl,
        previewUrl: result.previewStored?.hostedUrl,
        slideCount: result.script.slides.length,
      });
    }
  );

  // 6.5 POST /v1/tools/reel/video (Server-Side H.264 MP4 + AAC AI Voiceover & Beat Render)
  fastify.post(
    '/v1/tools/reel/video',
    async (request: any, reply: any) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest video rendering limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = (request.body || {}) as any;
      const rawDur = Number(body.duration) || 3000;
      const durationSec = rawDur > 50 ? rawDur / 1000 : rawDur;

      const result = await reelService.renderReelVideoMp4({
        title: body.title || 'Social Reel',
        brand: body.brand || 'Tailprint',
        handle: body.handle || '@tailprint',
        logoUrl: body.logoUrl || undefined,
        brandColors: body.brandColors || undefined,
        theme: body.theme || 'brand',
        layout: body.layout || 'classic',
        duration: durationSec,
        aspectRatio: body.aspectRatio || '9:16',
        screenrecordUrl: body.screenrecordUrl || undefined,
        screenrecordMode: body.screenrecordMode || 'inset',
        cleanExport: body.cleanExport !== false,
        language: body.language || 'da',
        slides: Array.isArray(body.slides) && body.slides.length > 0 ? body.slides : [
          { tag: '01', headline: body.title || 'Highlights', body: body.cta || '' },
        ],
        cta: body.cta || 'Follow for more • Link in bio',
        sourceUrl: body.sourceUrl || undefined,
      });

      return reply.code(200).send({
        success: true,
        videoUrl: result.videoStored.hostedUrl,
        downloadUrl: result.videoStored.downloadUrl,
        durationSec: result.durationSec,
      });
    }
  );

  // 6.6 POST /v1/tools/reel/from-url (All-in-One Automation Endpoint for Make.com, Zapier & Instagram Reels)
  fastify.post(
    '/v1/tools/reel/from-url',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Generate 9:16 Video Reel & Instagram Caption Directly from Article URL',
        description:
          'Scrapes the given URL, extracts key insights, captures live screen recording, renders a high-res 1080x1920 MP4 video, and formats an Instagram-ready caption.',
        body: z.object({
          url: z.string().url().describe('Article or page URL to transform into an Instagram Reel'),
          theme: z.enum(['brand', 'cyberpunk', 'midnight', 'gradient', 'sunset', 'clean']).optional().default('brand'),
          layout: z.enum(['classic', 'split', 'iphone', 'editorial']).optional().default('classic'),
          aspectRatio: z.enum(['9:16', '1:1', '16:9', '4:5']).optional().default('9:16'),
          duration: z.coerce.number().optional().default(15),
          record_video: z.boolean().optional().default(true),
          brand: z.string().optional(),
          handle: z.string().optional(),
        }),
      },
    },
    async (request: any, reply: any) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'AI video generation limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = (request.body || {}) as any;
      const targetUrl = body.url;

      // 1. Synthesize script and live screen recording from URL
      const script = await reelService.generateScriptFromUrl(targetUrl, body.record_video !== false);

      // 2. Apply any custom overrides
      if (body.theme) script.theme = body.theme;
      if (body.layout) script.layout = body.layout;
      if (body.aspectRatio) script.aspectRatio = body.aspectRatio;
      if (body.brand) script.brand = body.brand;
      if (body.handle) script.handle = body.handle;
      if (body.cleanExport !== undefined) script.cleanExport = body.cleanExport;
      else script.cleanExport = true;

      const rawDur = Number(body.duration) || 15;
      const durationSec = rawDur > 50 ? rawDur / 1000 : rawDur;
      script.duration = durationSec;

      // 3. Render video MP4 & PDF story deck in parallel
      const [videoResult, deckResult] = await Promise.all([
        reelService.renderReelVideoMp4(script),
        reelService.renderReelDeck(script).catch(() => null),
      ]);

      // 4. Construct Instagram-ready formatted caption with hashtags
      const captionLines: string[] = [
        `🚀 ${script.title}`,
        '',
      ];

      if (Array.isArray(script.slides)) {
        script.slides.slice(0, 4).forEach((s, idx) => {
          const tag = s.tag ? `[${s.tag}] ` : '';
          captionLines.push(`${idx + 1}. ${tag}${s.headline}`);
          if (s.body) captionLines.push(`   ${s.body}`);
        });
        captionLines.push('');
      }

      captionLines.push(`👉 ${script.cta || 'Link in bio for full article & code!'}`);
      captionLines.push('');
      captionLines.push(`🔗 ${targetUrl}`);
      captionLines.push('');
      captionLines.push('#webdev #tailwindcss #programming #fullstack #saas #automation #coding #frontend #reels');

      const caption = captionLines.join('\n');

      return reply.code(200).send({
        success: true,
        videoUrl: videoResult.videoStored.hostedUrl,
        downloadUrl: videoResult.videoStored.downloadUrl,
        durationSec: videoResult.durationSec,
        caption,
        title: script.title,
        brand: script.brand,
        pdfUrl: deckResult?.pdfStored?.hostedUrl,
        previewUrl: deckResult?.previewStored?.hostedUrl,
        slidesCount: script.slides?.length || 0,
        script,
      });
    }
  );

  // 7. POST /v1/tools/reel/share (Generates Mobile QR & Shareable Preview Link)
  fastify.post(
    '/v1/tools/reel/share',
    async (request: any, reply: any) => {
      const state = request.body || {};
      const slug = state.slug || crypto.randomBytes(4).toString('hex');
      const baseUrl = env.APP_URL || 'https://tailprint.com';
      const previewUrl = `${baseUrl}/tools/reel/p/${slug}`;

      state.updatedAt = Date.now();
      // Save to Redis with 24-hour expiration (86400s)
      await redisService.setJson(`reel_preview:${slug}`, state, 86400);
      reelSessionEmitter.emit(`update:${slug}`, state);

      // Generate SVG QR Code (high-DPI, dark on white for crisp phone camera scanning)
      const qrSvg = await qrService.generateSvg({
        text: previewUrl,
        size: 320,
        darkColor: '#030712',
        lightColor: '#ffffff',
        errorCorrection: 'M',
      });

      return reply.code(200).send({
        success: true,
        slug,
        previewUrl,
        qrSvg,
      });
    }
  );

  // PUT /v1/tools/reel/session/:slug (Desktop Live State Push)
  fastify.put(
    '/v1/tools/reel/session/:slug',
    async (request: any, reply: any) => {
      const slug = (request.params as any)?.slug;
      if (!slug) return reply.code(400).send({ error: 'Missing session slug' });
      const state = request.body || {};
      state.updatedAt = Date.now();
      await redisService.setJson(`reel_preview:${slug}`, state, 86400);
      reelSessionEmitter.emit(`update:${slug}`, state);
      return reply.code(200).send({ success: true, slug, updatedAt: state.updatedAt });
    }
  );

  // GET /v1/tools/reel/session/:slug (State Fetch Fallback)
  fastify.get(
    '/v1/tools/reel/session/:slug',
    async (request: any, reply: any) => {
      const slug = (request.params as any)?.slug;
      if (!slug) return reply.code(400).send({ error: 'Missing session slug' });
      const session = await redisService.getJson(`reel_preview:${slug}`);
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      return reply.code(200).send({ success: true, session });
    }
  );

  // GET /v1/tools/reel/stream/:slug (Live SSE Push Stream)
  fastify.get(
    '/v1/tools/reel/stream/:slug',
    async (request: any, reply: any) => {
      const slug = (request.params as any)?.slug;
      if (!slug) return reply.code(400).send({ error: 'Missing session slug' });

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('X-Accel-Buffering', 'no');

      // Send initial connected event with state from Redis
      const session = await redisService.getJson(`reel_preview:${slug}`);
      if (session) {
        reply.raw.write(`event: init\ndata: ${JSON.stringify(session)}\n\n`);
      } else {
        reply.raw.write(`event: ping\ndata: {}\n\n`);
      }

      const onUpdate = (updatedState: any) => {
        try {
          reply.raw.write(`event: update\ndata: ${JSON.stringify(updatedState)}\n\n`);
        } catch (err) {}
      };

      reelSessionEmitter.on(`update:${slug}`, onUpdate);

      const pingTimer = setInterval(() => {
        try {
          reply.raw.write(`: ping\n\n`);
        } catch (err) {
          clearInterval(pingTimer);
        }
      }, 15000);

      request.raw.on('close', () => {
        reelSessionEmitter.off(`update:${slug}`, onUpdate);
        clearInterval(pingTimer);
      });
    }
  );

  // 8. GET /tools/reel/p/:slug (Standalone Mobile Fullscreen Reel Player)
  const mobilePlayerHandler = async (request: any, reply: any) => {
    const slug = (request.params as any)?.slug || '';
    const session = slug ? await redisService.getJson(`reel_preview:${slug}`) : null;

    const defaultReel = {
      title: 'Vector PDF Generation for Developers',
      brand: 'Tailprint',
      handle: '@tailprint',
      theme: 'brand',
      aspectRatio: '9:16',
      karaoke: true,
      duration: 3500,
      brandColors: {
        primary: '#4f46e5',
        secondary: '#090d16',
        accent: '#38bdf8',
      },
      slides: [
        {
          tag: 'THE BREAKTHROUGH',
          headline: 'Sub-500ms Vector PDF Generation',
          body: 'Stop wrestling with fragile Puppeteer instances and slow local compilers.',
          stat: '380ms',
          statLabel: 'Average Render Time',
        },
        {
          tag: 'THE PROBLEM',
          headline: 'Why PDF Generation Sucks',
          body: 'Table headers disappear on page 2. Rows get sliced in half. Memory leaks crash your servers.',
          stat: '99.9%',
          statLabel: 'Headache Elimination',
        },
        {
          tag: 'HOW TO SCALE',
          headline: 'Built for Modern Developers & AI',
          body: 'Connect Claude Desktop, Cursor or your API in seconds with 22 native MCP tools.',
          stat: '100 Free',
          statLabel: 'Monthly Renders',
        },
      ],
      cta: 'Follow for more • Link in bio',
      sourceUrl: 'https://tailprint.com',
    };

    const initialData = session || defaultReel;
    const initialJson = JSON.stringify(initialData).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#030712" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>${String(initialData.brand || 'Tailprint').replace(/</g, '&lt;').replace(/>/g, '&gt;')} - Live Reel Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,600&family=Plus+Jakarta+Sans:wght@500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
    }
    body, html {
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      background-color: #030712;
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    @keyframes ambientPulse {
      0%, 100% { transform: scale(1); opacity: 0.35; }
      50% { transform: scale(1.15); opacity: 0.55; }
    }
    .ambient-glow {
      animation: ambientPulse 8s ease-in-out infinite;
    }
  </style>
</head>
<body id="mobile-player-body" class="h-full w-full flex flex-col justify-between relative overflow-hidden bg-slate-950 text-white">

  <!-- Ambient Video Backdrop (if backdrop mode) -->
  <video id="mobile-backdrop-video" src="" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none hidden transition-opacity duration-300"></video>

  <!-- Editorial Giant Watermark (Only active in editorial layout) -->
  <div id="mobile-editorial-watermark" class="hidden absolute top-1/3 left-4 text-8xl font-black text-white/10 pointer-events-none select-none tracking-tighter z-10">380ms</div>

  <!-- Ambient Glow -->
  <div id="mobile-screen-glow" class="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/30 blur-3xl ambient-glow pointer-events-none"></div>

  <!-- Live Sync Status Pill -->
  <div id="sync-toast-pill" class="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-[10px] font-mono font-black flex items-center space-x-1.5 shadow-2xl backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 transform -translate-y-1">
    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
    <span>LIVE SYNCED</span>
  </div>

  <!-- Top Area: Instagram Story Progress Bars & Brand Header -->
  <header class="w-full z-40 space-y-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] px-5">
    <!-- Progress Bars Row -->
    <div id="mobile-progress-bars" class="flex items-center space-x-1.5 w-full">
      <!-- Injected via JS -->
    </div>

    <!-- Brand Header Row -->
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div class="flex items-center space-x-2.5 min-w-0">
        <img id="mobile-logo-img" src="" class="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5 border border-white/20 hidden shadow-md flex-shrink-0" />
        <div id="mobile-avatar" class="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-black text-xs shadow-md flex-shrink-0">
          TP
        </div>
        <div class="truncate">
          <div id="mobile-brand" class="font-extrabold text-sm text-white leading-none truncate">Tailprint</div>
          <div id="mobile-handle" class="text-[11px] text-slate-300 font-mono mt-0.5 truncate">@tailprint</div>
        </div>
      </div>

      <div class="flex items-center space-x-2 flex-shrink-0">
        <span id="mobile-tag" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/20 text-rose-300">
          HOOK
        </span>
        <button onclick="shareReel(event)" class="w-9 h-9 rounded-full bg-white/10 active:bg-white/25 border border-white/20 flex items-center justify-center text-white text-xs transition" title="Share Reel">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Center Area: Slide Content -->
  <main id="mobile-content-container" class="my-auto px-6 py-4 z-30 space-y-4 max-w-lg mx-auto w-full transition-all duration-200">
    <h1 id="mobile-headline" class="text-2xl sm:text-3xl font-black tracking-tight leading-snug drop-shadow-xl text-white"></h1>

    <!-- Stat Card -->
    <div id="mobile-stat-card" class="hidden p-3.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center space-x-3.5 shadow-xl">
      <span id="mobile-stat" class="text-3xl font-black text-cyan-400"></span>
      <span id="mobile-stat-label" class="text-[11px] font-bold uppercase text-white/90 tracking-wide"></span>
    </div>

    <!-- Floating Live Screenrecord Card (inset / split / iphone mode) -->
    <div id="mobile-screenrecord-card" class="hidden rounded-2xl border border-white/20 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
      <div id="mobile-browser-bar" class="px-3 py-1 bg-slate-900 border-b border-white/10 flex items-center justify-between text-[9px]">
        <div class="flex items-center space-x-1">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </div>
        <span id="mobile-browser-url" class="font-mono text-slate-400 truncate max-w-[160px]">tailprint.com</span>
      </div>
      <video id="mobile-screenrecord-video" src="" autoplay loop muted playsinline class="w-full h-36 object-cover object-top"></video>
    </div>

    <!-- Body Text -->
    <p id="mobile-body" class="text-base sm:text-lg leading-relaxed text-slate-200 font-medium"></p>
  </main>

  <!-- Bottom Navigation & CTA Bar -->
  <footer class="pb-[calc(env(safe-area-inset-bottom,0px)+16px)] px-5 z-40 space-y-2 max-w-lg mx-auto w-full">
    <div class="grid grid-cols-12 gap-2">
      <!-- Interactive CTA Link -->
      <a id="mobile-cta-btn" href="#" target="_blank" class="col-span-7 py-3.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.98] border border-white/30 backdrop-blur-xl flex items-center justify-between text-white font-extrabold text-xs shadow-2xl transition">
        <div class="flex items-center space-x-2 truncate">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
          <span id="mobile-cta-text" class="truncate">Link in bio</span>
        </div>
        <span class="text-slate-300 font-black ml-1">→</span>
      </a>

      <!-- Direct One-Tap MP4 Video Download / Save to Camera Roll -->
      <button id="btn-mobile-download-mp4" onclick="downloadMobileMp4(event)" class="col-span-5 py-3.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 active:scale-[0.98] border border-white/30 flex items-center justify-center space-x-1.5 text-white font-black text-xs shadow-2xl transition">
        <span>📲</span>
        <span id="mobile-mp4-label">Save MP4</span>
      </button>
    </div>

    <!-- Slide Indicator & Tips -->
    <div class="flex items-center justify-between text-[11px] text-slate-400 px-1">
      <span id="mobile-slide-indicator" class="font-mono font-bold text-white/80">1 / 4</span>
      <span class="text-white/40">• Tap edges to switch slides</span>
      <a href="/tools/reel" class="text-indigo-400 font-bold hover:underline">Create your own ⚡</a>
    </div>
  </footer>

  <!-- Embedded Server State -->
  <script id="server-reel-state" type="application/json">${initialJson}</script>

  <script>
    let reelState = JSON.parse(document.getElementById('server-reel-state').textContent);

    if (window.location.hash && window.location.hash.startsWith('#data=')) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(window.location.hash.slice(6)))));
        if (decoded && decoded.slides) reelState = decoded;
      } catch (e) {}
    }

    let currentSlideIdx = 0;
    let isPlaying = true;
    let slideTimer = null;
    let progressStartTime = 0;
    let progressAnimFrame = null;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    async function downloadMobileMp4(e) {
      if (e) e.stopPropagation();
      const btn = document.getElementById('btn-mobile-download-mp4');
      const label = document.getElementById('mobile-mp4-label');
      if (!btn || !label) return;
      btn.disabled = true;
      label.textContent = 'Rendering MP4...';

      try {
        const res = await fetch('/v1/tools/reel/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reelState)
        });
        const data = await res.json();
        if (!res.ok || (!data.downloadUrl && !data.videoUrl)) {
          throw new Error(data.message || 'Failed to generate MP4');
        }
        const dlUrl = data.downloadUrl || (data.videoUrl + '?download=true');

        // Try native iOS/Android file share sheet ("Save Video" to Camera Roll)
        if (navigator.canShare && navigator.share) {
          try {
            const vidRes = await fetch(dlUrl);
            const blob = await vidRes.blob();
            const file = new File([blob], (reelState.brand || 'reel').toLowerCase() + '-reel.mp4', { type: 'video/mp4' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: reelState.title || reelState.brand,
              });
              label.textContent = 'Saved ✓';
              setTimeout(() => { label.textContent = 'Save MP4'; btn.disabled = false; }, 2000);
              return;
            }
          } catch (shareErr) {}
        }

        // Direct MP4 download fallback
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = (reelState.brand || 'reel').toLowerCase() + '-reel.mp4';
        document.body.appendChild(a);
        a.click();
        a.remove();
        label.textContent = 'Downloaded ✓';
      } catch (err) {
        alert('MP4 download error: ' + err.message);
        label.textContent = 'Save MP4';
      } finally {
        setTimeout(() => {
          label.textContent = 'Save MP4';
          btn.disabled = false;
        }, 2500);
      }
    }

    function applyLiveSync(updatedState) {
      if (!updatedState || !updatedState.slides || !updatedState.slides.length) return;
      reelState = updatedState;
      if (currentSlideIdx >= reelState.slides.length) {
        currentSlideIdx = 0;
      }
      updateDisplay();
      if (isPlaying) restartCurrentSlide();

      const pill = document.getElementById('sync-toast-pill');
      if (pill) {
        pill.classList.remove('opacity-0', '-translate-y-1');
        setTimeout(() => {
          pill.classList.add('opacity-0', '-translate-y-1');
        }, 1200);
      }
    }

    function connectLiveStream(slug) {
      if (!slug) return;
      let es = null;
      try {
        es = new EventSource('/v1/tools/reel/stream/' + slug);
        es.addEventListener('update', (e) => {
          try {
            const data = JSON.parse(e.data);
            applyLiveSync(data);
          } catch (err) {}
        });
        es.addEventListener('init', (e) => {
          try {
            const data = JSON.parse(e.data);
            applyLiveSync(data);
          } catch (err) {}
        });
        es.onerror = () => {
          try { es.close(); } catch (e) {}
          startPolling(slug);
        };
      } catch (err) {
        startPolling(slug);
      }
    }

    let pollInterval = null;
    let lastUpdateTs = 0;
    function startPolling(slug) {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/v1/tools/reel/session/' + slug);
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.session && data.session.updatedAt && data.session.updatedAt !== lastUpdateTs) {
            lastUpdateTs = data.session.updatedAt;
            applyLiveSync(data.session);
          }
        } catch (err) {}
      }, 1500);
    }

    const themeMaps = {
      nordic: {
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        bg: "radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.14), transparent 55%), linear-gradient(165deg, #101726 0%, #0c111c 100%)",
        text: "#fef3c7",
        subtext: "#cbd5e1",
        tagBg: "rgba(245, 158, 11, 0.14)",
        tagBorder: "rgba(245, 158, 11, 0.35)",
        tagText: "#fcd34d",
        statBg: "rgba(16, 23, 38, 0.78)",
        statBorder: "rgba(217, 119, 6, 0.35)",
        statColor: "#fbbf24",
        highlightClass: "bg-amber-400/20 text-amber-200 border-b-2 border-amber-400/70 px-1.5 py-0.5 rounded",
        badgeIcon: "✦"
      },
      bento: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
        bg: "radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.2), transparent 55%), linear-gradient(180deg, #070b14 0%, #030509 100%)",
        text: "#ffffff",
        subtext: "#cbd5e1",
        tagBg: "rgba(14, 165, 233, 0.15)",
        tagBorder: "rgba(56, 189, 248, 0.35)",
        tagText: "#7dd3fc",
        statBg: "rgba(255, 255, 255, 0.04)",
        statBorder: "rgba(255, 255, 255, 0.14)",
        statColor: "#38bdf8",
        highlightClass: "bg-sky-500/20 text-sky-200 border border-sky-400/30 px-1.5 py-0.5 rounded-lg",
        badgeIcon: "●"
      },
      brutalist: {
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'Space Grotesk', monospace, sans-serif",
        bg: "radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 0), #000000",
        text: "#ffffff",
        subtext: "#d4d4d8",
        tagBg: "#facc15",
        tagBorder: "#ffffff",
        tagText: "#000000",
        statBg: "#000000",
        statBorder: "#ffffff",
        statColor: "#facc15",
        highlightClass: "bg-yellow-400 text-black font-black px-1.5 py-0.5 -rotate-1 inline-block",
        badgeIcon: "⚡"
      },
      creator: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: "radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.25), transparent 45%), radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.25), transparent 45%), linear-gradient(135deg, #180828 0%, #080310 100%)",
        text: "#ffffff",
        subtext: "#fecdd3",
        tagBg: "rgba(244, 63, 94, 0.25)",
        tagBorder: "rgba(251, 146, 60, 0.5)",
        tagText: "#fda4af",
        statBg: "rgba(30, 15, 45, 0.75)",
        statBorder: "rgba(244, 63, 94, 0.4)",
        statColor: "#fbbf24",
        highlightClass: "bg-gradient-to-r from-rose-500/30 to-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg px-1.5 py-0.5",
        badgeIcon: "🔥"
      },
      terminal: {
        fontHead: "'JetBrains Mono', monospace",
        fontBody: "'JetBrains Mono', monospace",
        bg: "linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px), #080c14",
        text: "#34d399",
        subtext: "#cbd5e1",
        tagBg: "rgba(6, 78, 59, 0.85)",
        tagBorder: "rgba(52, 211, 153, 0.45)",
        tagText: "#34d399",
        statBg: "rgba(10, 15, 26, 0.9)",
        statBorder: "rgba(52, 211, 153, 0.35)",
        statColor: "#34d399",
        highlightClass: "bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30",
        badgeIcon: ">_"
      },
      brand: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: "linear-gradient(135deg, #4f46e5 0%, #090d16 100%)",
        text: "#ffffff",
        subtext: "rgba(226, 232, 240, 0.88)",
        tagBg: "rgba(255, 255, 255, 0.12)",
        tagBorder: "rgba(255, 255, 255, 0.25)",
        tagText: "#ffffff",
        statBg: "rgba(255, 255, 255, 0.10)",
        statBorder: "rgba(255, 255, 255, 0.20)",
        statColor: "#38bdf8",
        highlightClass: "bg-white/15 text-white border-b-2 border-white/50 px-1.5 py-0.5 rounded",
        badgeIcon: "✨"
      },
      gradient: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #020617 100%)",
        text: "#ffffff",
        subtext: "rgba(233, 213, 255, 0.85)",
        tagBg: "rgba(99, 102, 241, 0.2)",
        tagBorder: "rgba(99, 102, 241, 0.4)",
        tagText: "#a5b4fc",
        statBg: "rgba(99, 102, 241, 0.15)",
        statBorder: "rgba(99, 102, 241, 0.3)",
        statColor: "#38bdf8",
        highlightClass: "bg-indigo-500/25 text-cyan-300 border-b-2 border-cyan-400/60 px-1.5 py-0.5 rounded",
        badgeIcon: "✦"
      },
      cyberpunk: {
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'JetBrains Mono', monospace",
        bg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
        text: "#facc15",
        subtext: "#d4d4d8",
        tagBg: "rgba(250, 204, 21, 0.15)",
        tagBorder: "rgba(250, 204, 21, 0.4)",
        tagText: "#fef08a",
        statBg: "rgba(24, 24, 27, 0.8)",
        statBorder: "rgba(250, 204, 21, 0.3)",
        statColor: "#ec4899",
        highlightClass: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-1.5 py-0.5 rounded",
        badgeIcon: "⚡"
      },
      midnight: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: "linear-gradient(135deg, #022c22 0%, #000000 100%)",
        text: "#f0fdf4",
        subtext: "#86efac",
        tagBg: "rgba(16, 185, 129, 0.15)",
        tagBorder: "rgba(16, 185, 129, 0.3)",
        tagText: "#6ee7b7",
        statBg: "rgba(0, 0, 0, 0.6)",
        statBorder: "rgba(16, 185, 129, 0.3)",
        statColor: "#34d399",
        highlightClass: "bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400/60 px-1.5 py-0.5 rounded",
        badgeIcon: "●"
      },
      sunset: {
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        bg: "linear-gradient(135deg, #4c0519 0%, #030712 50%, #451a03 100%)",
        text: "#fff1f2",
        subtext: "#fecdd3",
        tagBg: "rgba(244, 63, 94, 0.2)",
        tagBorder: "rgba(244, 63, 94, 0.4)",
        tagText: "#fda4af",
        statBg: "rgba(244, 63, 94, 0.15)",
        statBorder: "rgba(244, 63, 94, 0.3)",
        statColor: "#fbbf24",
        highlightClass: "bg-rose-500/20 text-rose-200 border-b-2 border-rose-400/60 px-1.5 py-0.5 rounded",
        badgeIcon: "🌅"
      },
      clean: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        text: "#0f172a",
        subtext: "#475569",
        tagBg: "#dbeafe",
        tagBorder: "#bfdbfe",
        tagText: "#1d4ed8",
        statBg: "#ffffff",
        statBorder: "#cbd5e1",
        statColor: "#2563eb",
        highlightClass: "bg-blue-100 text-blue-900 border-b-2 border-blue-400 px-1.5 py-0.5 rounded",
        badgeIcon: "✦"
      }
    };

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatHighlightedHtml(text, highlightWords, markClass) {
      if (!text) return '';
      let formatted = escapeHtml(text);
      const cls = markClass || 'bg-amber-400/20 text-amber-200 border-b-2 border-amber-400/60 px-1.5 py-0.5 rounded';
      if (!highlightWords || !Array.isArray(highlightWords) || highlightWords.length === 0) return formatted;
      for (let i = 0; i < highlightWords.length; i++) {
        const word = highlightWords[i];
        if (!word || String(word).trim().length < 2) continue;
        const cleanWord = escapeHtml(String(word).trim()).replace(new RegExp('[.*+?^' + '\\$' + '{}()|[\\]\\\\]', 'g'), '\\$&');
        try {
          const regex = new RegExp('(\\\\b' + cleanWord + '\\\\b)', 'gi');
          formatted = formatted.replace(regex, '<mark class="' + cls + '">$1</mark>');
        } catch (e) {}
      }
      return formatted;
    }

    // Touch & Tap Gestures (Like Instagram Stories)
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a') || e.target.closest('button')) return;
      touchStartTime = performance.now();
      touchStartX = e.clientX;
      touchStartY = e.clientY;
      pausePlayback();
    });

    window.addEventListener('pointerup', (e) => {
      if (e.target.closest('a') || e.target.closest('button')) return;
      const duration = performance.now() - touchStartTime;
      const diffX = Math.abs(e.clientX - touchStartX);
      const diffY = Math.abs(e.clientY - touchStartY);

      if (duration < 280 && diffX < 24 && diffY < 24) {
        if (e.clientX < window.innerWidth * 0.35) {
          prevSlide();
        } else {
          nextSlide();
        }
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        startPlayback();
      }
    });

    window.addEventListener('pointercancel', () => {
      startPlayback();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    });

    function renderProgressBars() {
      const row = document.getElementById('mobile-progress-bars');
      row.innerHTML = reelState.slides.map((_, i) => {
        let fillWidth = '0%';
        if (i < currentSlideIdx) fillWidth = '100%';
        return '<div class="h-1 flex-1 rounded-full overflow-hidden bg-white/20 relative">' +
          '<div id="progress-fill-' + i + '" class="h-full bg-white transition-none" style="width: ' + fillWidth + '"></div>' +
        '</div>';
      }).join('');
    }

    function startPlayback() {
      isPlaying = true;
      restartCurrentSlide();
    }

    function pausePlayback() {
      isPlaying = false;
      if (slideTimer) clearTimeout(slideTimer);
      if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
    }

    function restartCurrentSlide() {
      if (slideTimer) clearTimeout(slideTimer);
      if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);

      progressStartTime = performance.now();
      const duration = reelState.duration || 3500;

      function updateBar(now) {
        if (!isPlaying) return;
        const elapsed = now - progressStartTime;
        const progress = Math.min(1.0, elapsed / duration);
        const pct = Math.min(100, progress * 100);
        const fillEl = document.getElementById('progress-fill-' + currentSlideIdx);
        if (fillEl) {
          fillEl.style.width = pct + '%';
        }

        if (elapsed < duration) {
          progressAnimFrame = requestAnimationFrame(updateBar);
        }
      }
      progressAnimFrame = requestAnimationFrame(updateBar);

      slideTimer = setTimeout(() => {
        if (isPlaying) nextSlide();
      }, duration);
    }

    function nextSlide() {
      currentSlideIdx = (currentSlideIdx + 1) % reelState.slides.length;
      updateDisplay();
      if (isPlaying) restartCurrentSlide();
    }

    function prevSlide() {
      currentSlideIdx = (currentSlideIdx - 1 + reelState.slides.length) % reelState.slides.length;
      updateDisplay();
      if (isPlaying) restartCurrentSlide();
    }

    function updateDisplay() {
      const slide = reelState.slides[currentSlideIdx] || reelState.slides[0];
      if (reelState.brandColors) {
        themeMaps.brand.bg = "linear-gradient(135deg, " + reelState.brandColors.primary + " 0%, " + reelState.brandColors.secondary + " 100%)";
        themeMaps.brand.statColor = reelState.brandColors.accent;
      }
      const theme = themeMaps[reelState.theme] || themeMaps.brand || themeMaps.gradient;
      const body = document.getElementById('mobile-player-body');
      body.style.background = theme.bg;

      document.getElementById('mobile-brand').textContent = reelState.brand;
      document.getElementById('mobile-handle').textContent = reelState.handle || '@' + reelState.brand.toLowerCase();

      const logoImg = document.getElementById('mobile-logo-img');
      const avatarDiv = document.getElementById('mobile-avatar');
      if (reelState.logoUrl) {
        logoImg.src = reelState.logoUrl;
        logoImg.classList.remove('hidden');
        avatarDiv.classList.add('hidden');
      } else {
        logoImg.classList.add('hidden');
        avatarDiv.classList.remove('hidden');
        avatarDiv.textContent = (reelState.brand || 'TP').slice(0, 2).toUpperCase();
      }

      const tagEl = document.getElementById('mobile-tag');
      const badgeIcon = theme.badgeIcon ? '<span class="mr-1">' + theme.badgeIcon + '</span>' : '';
      tagEl.innerHTML = badgeIcon + escapeHtml(slide.tag || 'SLIDE ' + (currentSlideIdx + 1));
      tagEl.style.backgroundColor = theme.tagBg;
      tagEl.style.borderColor = theme.tagBorder;
      tagEl.style.color = theme.tagText;

      const headlineEl = document.getElementById('mobile-headline');
      const bodyEl = document.getElementById('mobile-body');
      headlineEl.innerHTML = formatHighlightedHtml(slide.headline, slide.highlightWords, theme.highlightClass);
      headlineEl.style.color = theme.text;
      headlineEl.style.fontFamily = theme.fontHead || 'system-ui, -apple-system, sans-serif';
      bodyEl.textContent = (reelState.theme === 'terminal' ? '> ' : '') + (slide.body || '');
      bodyEl.style.color = theme.subtext;
      bodyEl.style.fontFamily = theme.fontBody || 'system-ui, -apple-system, sans-serif';

      const statCard = document.getElementById('mobile-stat-card');
      const statVal = document.getElementById('mobile-stat');
      const statLabel = document.getElementById('mobile-stat-label');
      if (slide.stat) {
        statCard.classList.remove('hidden');
        statCard.style.backgroundColor = theme.statBg;
        statCard.style.borderColor = theme.statBorder;
        statVal.textContent = slide.stat;
        statVal.style.color = theme.statColor;
        statVal.style.fontFamily = theme.fontHead || 'system-ui, -apple-system, sans-serif';
        statLabel.textContent = slide.statLabel || 'METRIC';
        statLabel.style.color = theme.text;
      } else {
        statCard.classList.add('hidden');
      }

      // Apply Visual Layout template styling on mobile (classic, split, iphone, editorial)
      const layout = reelState.layout || 'classic';
      const contentBox = document.getElementById('mobile-content-container');
      const watermark = document.getElementById('mobile-editorial-watermark');
      const recordCard = document.getElementById('mobile-screenrecord-card');
      const browserBar = document.getElementById('mobile-browser-bar');

      if (watermark) {
        if (layout === 'editorial') {
          watermark.textContent = slide.stat || ('0' + (currentSlideIdx + 1));
          watermark.classList.remove('hidden');
        } else {
          watermark.classList.add('hidden');
        }
      }

      if (contentBox) {
        if (layout === 'editorial') {
          contentBox.style.borderLeft = '5px solid ' + (theme.statColor || '#38bdf8');
          contentBox.style.borderTop = 'none';
          contentBox.style.background = 'transparent';
        } else if (layout === 'split') {
          contentBox.style.borderLeft = 'none';
          contentBox.style.background = 'rgba(9, 13, 22, 0.78)';
          contentBox.style.borderRadius = '24px';
          contentBox.style.borderTop = '4px solid ' + (theme.statColor || '#38bdf8');
        } else {
          contentBox.style.borderLeft = 'none';
          contentBox.style.borderTop = 'none';
          contentBox.style.background = 'transparent';
        }
      }

      if (recordCard && browserBar) {
        if (layout === 'iphone') {
          recordCard.className = 'mx-auto w-48 rounded-[32px] border-4 border-slate-600 bg-slate-950 shadow-2xl overflow-hidden transition-all duration-300';
          browserBar.innerHTML = '<div class="mx-auto w-14 h-3 bg-black rounded-full my-0.5"></div>';
        } else {
          recordCard.className = 'rounded-2xl border border-white/20 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300';
          browserBar.innerHTML = '<div class="flex items-center space-x-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span></div><span id="mobile-browser-url" class="font-mono text-slate-400 truncate max-w-[160px]">tailprint.com</span>';
        }
      }

      // Screenrecord
      const recordVideo = document.getElementById('mobile-screenrecord-video');
      const backdropVideo = document.getElementById('mobile-backdrop-video');
      const urlLabel = document.getElementById('mobile-browser-url');

      if (reelState.screenrecordUrl && reelState.screenrecordMode === 'backdrop') {
        if (recordCard) recordCard.classList.add('hidden');
        if (backdropVideo) {
          backdropVideo.src = reelState.screenrecordUrl;
          backdropVideo.classList.remove('hidden');
        }
      } else if (reelState.screenrecordUrl && reelState.screenrecordMode === 'inset') {
        if (backdropVideo) backdropVideo.classList.add('hidden');
        if (recordCard && recordVideo) {
          recordCard.classList.remove('hidden');
          recordVideo.src = reelState.screenrecordUrl;
          if (urlLabel && reelState.sourceUrl) {
            try { urlLabel.textContent = new URL(reelState.sourceUrl).hostname.replace(/^www\\./, ''); } catch {}
          }
        }
      } else {
        if (recordCard) recordCard.classList.add('hidden');
        if (backdropVideo) backdropVideo.classList.add('hidden');
      }

      // CTA Button
      const ctaBtn = document.getElementById('mobile-cta-btn');
      const ctaText = document.getElementById('mobile-cta-text');
      ctaText.textContent = reelState.cta || 'Link in bio';
      ctaBtn.href = reelState.sourceUrl || '#';

      document.getElementById('mobile-slide-indicator').textContent = (currentSlideIdx + 1) + ' / ' + reelState.slides.length;
      renderProgressBars();
    }

    async function shareReel(e) {
      if (e) e.stopPropagation();
      if (navigator.share) {
        try {
          await navigator.share({
            title: reelState.title || reelState.brand,
            text: reelState.title || reelState.brand + ' Reel',
            url: window.location.href,
          });
        } catch (err) {}
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied!');
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      updateDisplay();
      startPlayback();
      const currentSlug = '${slug}';
      if (currentSlug) {
        connectLiveStream(currentSlug);
      }
    });
  </script>
</body>
</html>`;

    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/tools/reel/p/:slug', { schema: { hide: true } }, mobilePlayerHandler);
  fastify.get('/tools/reel/view', { schema: { hide: true } }, mobilePlayerHandler);

  // ============================================================================
  // 8. AI LOGO -> CANVA VECTOR & LAYER STUDIO (/tools/canva-logo)
  // ============================================================================
  fastify.post(
    '/v1/tools/canva-logo',
    {
      schema: {
        tags: ['Free Tools'],
        summary: 'Convert an AI-generated raster logo (or prompt) into 100% Canva-editable SVG color layers and an Editable Vector PDF with separated text boxes.',
      },
    },
    async (request: any, reply: any) => {
      const clientIp = request.ip || 'anonymous';
      const cookieHeader = String(request.headers['cookie'] || '');
      const authHeader = String(request.headers['authorization'] || '');
      const apiKeyHeader = String(
        request.headers['x-api-key'] ||
          request.headers['api-key'] ||
          (request.query as any)?.key ||
          (request.query as any)?.api_key ||
          ''
      );
      const isExempt =
        cookieHeader.includes('tailprint_ignore_me=1') ||
        authHeader.startsWith('Bearer sec_') ||
        apiKeyHeader.startsWith('sec_');
      const rateLimit = await redisService.checkAiToolRateLimit(clientIp, 5, isExempt);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Guest AI logo decomposition limit reached (max 5/hour). Claim 100 free monthly renders at tailprint.com (no credit card required) or upgrade for unlimited access.',
        });
      }

      const body = (request.body || {}) as {
        imageDataUrl?: string;
        imageUrl?: string;
        prompt?: string;
        maxColors?: number;
        separateText?: boolean;
        customState?: any;
      };

      try {
        const result = body.prompt && !body.imageDataUrl && !body.imageUrl && !body.customState
          ? await canvaLogoService.generateAiLogoFromPrompt(body.prompt)
          : await canvaLogoService.convertLogoForCanva({
              imageDataUrl: body.imageDataUrl,
              imageUrl: body.imageUrl,
              maxColors: body.maxColors,
              separateText: body.separateText,
              customState: body.customState,
            });

        return reply.code(200).send({
          success: true,
          state: result.state,
          iconSvg: result.iconSvg,
          combinedSvg: result.combinedSvg,
          iconSvgUrl: result.iconSvgUrl,
          combinedSvgUrl: result.combinedSvgUrl,
          canvaPdfUrl: result.canvaPdfUrl,
          canvaPdfDownloadUrl: result.canvaPdfDownloadUrl,
        });
      } catch (err: any) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Failed to convert logo to editable Canva format',
        });
      }
    }
  );

  fastify.get('/tools/canva-logo', { schema: { hide: true } }, async (_request, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Logo to Editable Canva Vector &amp; Layer Studio — Tailprint</title>
  <meta name="description" content="Convert any flat AI-generated logo from Midjourney, ChatGPT/DALL-E, or Ideogram into 100% editable Canva vector color layers and real double-clickable text boxes." />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700&family=Montserrat:wght@600;700;800;900&family=Outfit:wght@600;700;800;900&family=Playfair+Display:wght@700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .checkerboard {
      background-color: #0f172a;
      background-image:
        linear-gradient(45deg, #1e293b 25%, transparent 25%),
        linear-gradient(-45deg, #1e293b 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1e293b 75%),
        linear-gradient(-45deg, transparent 75%, #1e293b 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">

  ${renderHeader('AI Logo to Canva')}

  <main class="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
    <!-- Hero Header -->
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
          <span>🎨 AI Logo Deconstructor</span>
          <span>•</span>
          <span>Canva Vector Layers + Editable Text Boxes</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-white">
          Make Any AI Logo <span class="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">100% Editable in Canva</span>
        </h1>
        <p class="text-slate-400 text-sm mt-1.5 max-w-2xl">
          Upload a flat AI-generated logo (from Midjourney, ChatGPT, Ideogram, etc.). Our engine strips the background, separates baked-in text into a <strong>real editable text box</strong>, and splits the icon into <strong>individual vector color layers</strong> you can recolor and move freely in Canva.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button onclick="loadDemoAiLogo('nova')" class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5">
          <span>🧪</span><span>Try Demo 1 (Tech Prism)</span>
        </button>
        <button onclick="loadDemoAiLogo('aurora')" class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5">
          <span>🌿</span><span>Try Demo 2 (Eco Leaf)</span>
        </button>
        <button onclick="loadDemoAiLogo('crown')" class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5">
          <span>👑</span><span>Try Demo 3 (Luxury Crown)</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      <!-- LEFT COLUMN (7 cols): Upload, AI Generator & Layer/Typography Controls -->
      <div class="lg:col-span-7 space-y-6">

        <!-- 1. Upload AI Logo or Generate with AI -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-400">1. Upload Your AI Logo (PNG, JPG, WebP) or Generate with AI</span>
            <span id="status-pill" class="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">Ready ✨</span>
          </div>

          <!-- Drag & Drop Zone -->
          <div
            id="drop-zone"
            onclick="document.getElementById('logo-file-input').click()"
            ondragover="handleDragOver(event)"
            ondragleave="handleDragLeave(event)"
            ondrop="handleDrop(event)"
            class="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950/60 hover:bg-slate-950 group"
          >
            <input id="logo-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden" onchange="handleFileSelect(event)" />
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                📤
              </div>
              <div class="text-left">
                <div class="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                  Drag &amp; drop your AI logo here, or click to browse
                </div>
                <p class="text-xs text-slate-400 mt-0.5">
                  Supports PNG, JPG, and WebP from Midjourney, DALL-E / ChatGPT, Ideogram &amp; Leonardo
                </p>
              </div>
            </div>
          </div>

          <!-- Options Row before/during vectorization -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div class="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div>
                <div class="text-xs font-bold text-slate-200">✂️ Auto-Separate Baked-In Text</div>
                <div class="text-[10px] text-slate-500">Strips raster text from icon &amp; creates editable text box</div>
              </div>
              <input id="opt-separate-text" type="checkbox" checked class="w-4 h-4 accent-cyan-500 rounded cursor-pointer" onchange="retraceIfUploaded()" />
            </div>

            <div class="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div>
                <div class="text-xs font-bold text-slate-200">🎨 Vector Color Layers</div>
                <div class="text-[10px] text-slate-500">Each layer becomes a color swatch in Canva</div>
              </div>
              <select id="opt-max-colors" onchange="retraceIfUploaded()" class="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500">
                <option value="2">2 Colors (Minimal)</option>
                <option value="3">3 Colors</option>
                <option value="4" selected>4 Colors (Recommended)</option>
                <option value="5">5 Colors</option>
                <option value="6">6 Colors (Detailed)</option>
              </select>
            </div>
          </div>

          <!-- Or Generate fresh AI Logo from Prompt -->
          <div class="pt-3 border-t border-slate-800/80">
            <label class="block text-[11px] text-slate-400 font-semibold mb-1.5">Or describe a brand new logo (Gemini 3.8 Flash builds it directly as multi-layer Canva vectors):</label>
            <div class="flex gap-2">
              <input
                id="ai-logo-prompt"
                type="text"
                placeholder="e.g. 'VALKYRIE CLOUD - geometric Nordic wing in cyan and electric indigo'"
                class="flex-1 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                id="btn-generate-prompt"
                onclick="generateFromPrompt()"
                class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-cyan-600/20 whitespace-nowrap"
              >
                ✨ Generate Vector Logo
              </button>
            </div>
          </div>
        </div>

        <!-- 2. Individual Vector Color Layers Editor -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">2. Vector Color Layers in Icon (Canva Color Swatches)</span>
              <p class="text-[11px] text-slate-400 mt-0.5">Click any swatch to test live recoloring — these exact color tiles appear in Canva's top toolbar when you select the logo.</p>
            </div>
            <span id="layer-count-badge" class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300">3 Color Layers</span>
          </div>

          <div id="vector-layers-list" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Populated via JS -->
          </div>
        </div>

        <!-- 3. Separated Editable Text & Layout Controls -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-purple-400">3. Separated Editable Text &amp; Layout (Canva Text Boxes)</span>
              <p class="text-[11px] text-slate-400 mt-0.5">When you open the exported PDF in Canva, the brand name and tagline import as 100% double-clickable editable text boxes.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Brand Name (Primary Text)</label>
              <input id="input-brand-name" type="text" value="NOVAFLOW" oninput="onTextControlChange()" class="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Tagline / Subtitle</label>
              <input id="input-tagline" type="text" value="INTELLIGENT CLOUD SYSTEMS" oninput="onTextControlChange()" class="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Font Family (Canva Compatible)</label>
              <select id="input-font-family" onchange="onTextControlChange()" class="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-500">
                <option value="Montserrat">Montserrat (Geometric Bold)</option>
                <option value="Space Grotesk" selected>Space Grotesk (Modern Tech)</option>
                <option value="Outfit">Outfit (Clean Startup)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (Corporate)</option>
                <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                <option value="Cinzel">Cinzel (Luxury / Classic)</option>
                <option value="JetBrains Mono">JetBrains Mono (Developer)</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Logo Lockup Layout</label>
              <select id="input-layout" onchange="onTextControlChange()" class="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-500">
                <option value="stacked" selected>Stacked (Icon Above Text)</option>
                <option value="horizontal">Horizontal (Icon + Text)</option>
                <option value="icon-only">Icon Only (No Text)</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] text-slate-400 font-medium mb-1">Letter Spacing (Tracking)</label>
              <input id="input-letter-spacing" type="range" min="0" max="0.25" step="0.02" value="0.10" oninput="onTextControlChange()" class="w-full accent-purple-500 mt-2" />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Text Color</span>
              <input id="input-text-color" type="color" value="#ffffff" oninput="onTextControlChange()" class="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Tagline Color</span>
              <input id="input-tagline-color" type="color" value="#38bdf8" oninput="onTextControlChange()" class="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Background</span>
              <input id="input-bg-color" type="color" value="#0b0f19" oninput="onTextControlChange()" class="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Transparent SVG</span>
              <input id="input-transparent-bg" type="checkbox" checked onchange="onTextControlChange()" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer" />
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN (5 cols): Live Vector Preview & Canva Export Suite -->
      <div class="lg:col-span-5 space-y-5 lg:sticky lg:top-24">

        <!-- Preview Mode Switcher -->
        <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Live Vector &amp; Layer Preview</span>
            <div class="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button id="tab-preview-combined" onclick="setPreviewTab('combined')" class="px-2.5 py-1 rounded-lg font-bold bg-cyan-600 text-white transition">Full Logo</button>
              <button id="tab-preview-icon" onclick="setPreviewTab('icon')" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition">Vector Icon Only</button>
              <button id="tab-preview-compare" onclick="setPreviewTab('compare')" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition">Before / After</button>
            </div>
          </div>

          <!-- Main Interactive Vector Stage -->
          <div id="vector-stage-wrapper" class="relative w-full h-[380px] rounded-2xl checkerboard border border-slate-800 flex items-center justify-center overflow-hidden p-6 transition-all">
            <div id="vector-stage-content" class="w-full h-full flex items-center justify-center">
              <!-- Live SVG Injected Here -->
            </div>

            <!-- Compare Before/After Overlay (Only visible in 'compare' tab) -->
            <div id="compare-stage-content" class="hidden w-full h-full grid grid-cols-2 gap-4 items-center">
              <div class="flex flex-col items-center justify-center h-full bg-slate-950/80 rounded-xl p-3 border border-slate-800">
                <span class="text-[10px] font-mono uppercase text-rose-400 font-bold mb-2">Before: Flat Raster Image</span>
                <img id="original-raster-img" src="" class="max-h-[260px] object-contain rounded-lg" alt="Original AI Logo" />
              </div>
              <div class="flex flex-col items-center justify-center h-full bg-slate-950/80 rounded-xl p-3 border border-cyan-500/40">
                <span class="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-2">After: Editable Vector</span>
                <div id="compare-vector-box" class="w-full h-[260px] flex items-center justify-center"></div>
              </div>
            </div>
          </div>

          <!-- Primary Canva Export Actions -->
          <div class="space-y-2.5 pt-1">
            <button
              id="btn-download-canva-pdf"
              onclick="downloadEditableCanvaPdf()"
              class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs shadow-xl shadow-indigo-600/25 flex items-center justify-between transition border border-white/20"
            >
              <div class="flex items-center space-x-2.5">
                <span class="text-base">📄</span>
                <div class="text-left">
                  <div id="pdf-btn-title">Download Fully Editable Canva PDF (.PDF)</div>
                  <div class="text-[10px] font-normal text-cyan-100/90">Vector icon layers + editable text boxes + horizontal banner</div>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">Recommended</span>
            </button>

            <div class="grid grid-cols-2 gap-2.5">
              <button
                onclick="downloadCanvaIconSvg()"
                class="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition"
              >
                <span>🎨</span>
                <span>Download Icon .SVG (Color Layers)</span>
              </button>

              <button
                onclick="downloadCombinedSvg()"
                class="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition"
              >
                <span>📐</span>
                <span>Download Full .SVG</span>
              </button>
            </div>
          </div>

          <!-- How to use in Canva Guide Box -->
          <div class="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 text-xs">
            <div class="font-bold text-indigo-200 flex items-center space-x-1.5">
              <span>💡</span>
              <span>How to Edit Your Logo 100% in Canva:</span>
            </div>
            <ol class="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
              <li>Click <strong>Download Fully Editable Canva PDF</strong> above (or <strong>Icon .SVG</strong>).</li>
              <li>Open <strong>Canva</strong> and drag the file directly onto your canvas or into <em>Uploads</em>.</li>
              <li>Click the <strong>logo icon</strong> in Canva → all vector color swatches appear in the top toolbar so you can recolor any individual part!</li>
              <li>Double-click the <strong>brand name or tagline</strong> in the PDF → edit the text and switch to any Canva font.</li>
            </ol>
            <div class="pt-1">
              <a href="/guides/convert-ai-logo-to-editable-canva-vector" class="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline">
                Read the full technical guide: Converting AI Logos to Editable Canva Vectors →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>

    ${renderConversionCallout(
      'AI Logo Vectorizer API',
      'curl -X POST https://tailprint.com/v1/tools/canva-logo \\\n' +
        '  -H "Content-Type: application/json" \\\n' +
        '  -d \'{\n' +
        '    "imageUrl": "https://example.com/ai-logo.png",\n' +
        '    "maxColors": 4,\n' +
        '    "separateText": true\n' +
        '  }\''
    )}
  </main>

  <footer class="py-8 border-t border-slate-900 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). High-performance Chromium &amp; MCP Infrastructure.</p>
  </footer>

  <script>
    let currentUploadedDataUrl = null;
    let previewTab = 'combined';

    let logoState = {
      brandName: 'NOVAFLOW',
      tagline: 'INTELLIGENT CLOUD SYSTEMS',
      fontFamily: 'Space Grotesk',
      uppercase: true,
      letterSpacingEm: 0.10,
      layout: 'stacked',
      backgroundColor: '#0b0f19',
      transparentBg: true,
      textColor: '#ffffff',
      taglineColor: '#38bdf8',
      viewBoxSize: 500,
      layers: [
        {
          id: 'layer_1',
          name: 'Color Layer 1',
          color: '#4f46e5',
          pathData: 'M 250 55 L 420 152 L 420 348 L 250 445 L 80 348 L 80 152 Z M 250 115 L 135 182 L 135 318 L 250 385 L 365 318 L 365 182 Z',
          areaRatio: 0.35
        },
        {
          id: 'layer_2',
          name: 'Color Layer 2',
          color: '#38bdf8',
          pathData: 'M 250 135 L 345 190 L 250 245 L 155 190 Z M 250 265 L 345 210 L 345 310 L 250 365 Z',
          areaRatio: 0.22
        },
        {
          id: 'layer_3',
          name: 'Color Layer 3',
          color: '#f43f5e',
          pathData: 'M 155 210 L 235 256 L 235 356 L 155 310 Z',
          areaRatio: 0.12
        }
      ]
    };
    window.logoState = logoState;

    function escapeXml(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildClientIconSvg(forPreview) {
      const size = logoState.viewBoxSize || 500;
      const showBg = !logoState.transparentBg && logoState.backgroundColor;
      const bgRect = showBg
        ? '<rect width="' + size + '" height="' + size + '" rx="48" fill="' + logoState.backgroundColor + '" />'
        : '';
      const paths = logoState.layers.map(l =>
        '<path id="' + l.id + '" fill="' + l.color + '" fill-rule="evenodd" d="' + l.pathData + '" />'
      ).join('\\n');
      const dimAttr = forPreview ? 'class="w-full h-full max-h-[320px]"' : 'width="1000" height="1000"';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" ' + dimAttr + '>' + bgRect + paths + '</svg>';
    }

    function buildClientCombinedSvg(forPreview) {
      const hasBrand = Boolean(logoState.brandName && logoState.brandName.trim());
      if (!hasBrand || logoState.layout === 'icon-only') {
        return buildClientIconSvg(forPreview);
      }

      const displayBrand = logoState.uppercase ? logoState.brandName.toUpperCase() : logoState.brandName;
      const displayTag = logoState.tagline ? (logoState.uppercase ? logoState.tagline.toUpperCase() : logoState.tagline) : '';
      const letterSpacingPx = Math.round((logoState.letterSpacingEm || 0.08) * 64);
      const paths = logoState.layers.map(l =>
        '<path fill="' + l.color + '" fill-rule="evenodd" d="' + l.pathData + '" />'
      ).join('\\n');

      if (logoState.layout === 'horizontal') {
        const W = 1200, H = 500;
        const bgRect = (!logoState.transparentBg && logoState.backgroundColor)
          ? '<rect width="' + W + '" height="' + H + '" rx="44" fill="' + logoState.backgroundColor + '" />'
          : '';
        const dimAttr = forPreview ? 'class="w-full h-full max-h-[320px]"' : 'width="' + W + '" height="' + H + '"';
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" ' + dimAttr + '>' +
          bgRect +
          '<g transform="translate(40, 25) scale(0.9)">' + paths + '</g>' +
          '<text x="520" y="' + (displayTag ? 235 : 270) + '" fill="' + logoState.textColor + '" font-family="\\'' + escapeXml(logoState.fontFamily) + '\\', sans-serif" font-size="76" font-weight="800" letter-spacing="' + letterSpacingPx + '">' + escapeXml(displayBrand) + '</text>' +
          (displayTag ? '<text x="524" y="305" fill="' + logoState.taglineColor + '" font-family="\\'' + escapeXml(logoState.fontFamily) + '\\', sans-serif" font-size="28" font-weight="600" letter-spacing="' + Math.round(letterSpacingPx * 1.4) + '">' + escapeXml(displayTag) + '</text>' : '') +
        '</svg>';
      }

      const W = 800, H = 860;
      const bgRect = (!logoState.transparentBg && logoState.backgroundColor)
        ? '<rect width="' + W + '" height="' + H + '" rx="56" fill="' + logoState.backgroundColor + '" />'
        : '';
      const dimAttr = forPreview ? 'class="w-full h-full max-h-[330px]"' : 'width="' + W + '" height="' + H + '"';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" ' + dimAttr + '>' +
        bgRect +
        '<g transform="translate(150, 45)">' + paths + '</g>' +
        '<text x="' + (W / 2) + '" y="650" text-anchor="middle" fill="' + logoState.textColor + '" font-family="\\'' + escapeXml(logoState.fontFamily) + '\\', sans-serif" font-size="74" font-weight="800" letter-spacing="' + letterSpacingPx + '">' + escapeXml(displayBrand) + '</text>' +
        (displayTag ? '<text x="' + (W / 2) + '" y="720" text-anchor="middle" fill="' + logoState.taglineColor + '" font-family="\\'' + escapeXml(logoState.fontFamily) + '\\', sans-serif" font-size="28" font-weight="600" letter-spacing="' + Math.round(letterSpacingPx * 1.5) + '">' + escapeXml(displayTag) + '</text>' : '') +
      '</svg>';
    }

    function renderLayersEditor() {
      const list = document.getElementById('vector-layers-list');
      const badge = document.getElementById('layer-count-badge');
      badge.textContent = logoState.layers.length + ' Color Layers';

      list.innerHTML = logoState.layers.map((layer, idx) => {
        return '<div class="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">' +
          '<div class="flex items-center space-x-3">' +
            '<input type="color" value="' + layer.color + '" data-idx="' + idx + '" oninput="onLayerColorChange(this)" class="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0" />' +
            '<div>' +
              '<div class="text-xs font-bold text-white">' + escapeXml(layer.name || ('Color Layer ' + (idx + 1))) + '</div>' +
              '<input type="text" value="' + layer.color.toUpperCase() + '" data-idx="' + idx + '" onchange="onLayerHexInput(this)" class="w-20 bg-transparent text-[11px] font-mono text-cyan-400 focus:outline-none" />' +
            '</div>' +
          '</div>' +
          (logoState.layers.length > 1
            ? '<button onclick="removeLayer(' + idx + ')" class="text-[11px] text-slate-500 hover:text-rose-400 px-2 py-1 rounded transition" title="Remove this layer">✕</button>'
            : '') +
        '</div>';
      }).join('');
    }

    function onLayerColorChange(el) {
      const idx = parseInt(el.getAttribute('data-idx'), 10);
      if (logoState.layers[idx]) {
        logoState.layers[idx].color = el.value;
        renderLayersEditor();
        renderStage();
      }
    }

    function onLayerHexInput(el) {
      const idx = parseInt(el.getAttribute('data-idx'), 10);
      const val = el.value.trim();
      if (logoState.layers[idx] && /^#[0-9a-fA-F]{6}$/.test(val)) {
        logoState.layers[idx].color = val.toLowerCase();
        renderLayersEditor();
        renderStage();
      }
    }

    function removeLayer(idx) {
      if (logoState.layers.length <= 1) return;
      logoState.layers.splice(idx, 1);
      renderLayersEditor();
      renderStage();
    }

    function syncInputsFromState() {
      document.getElementById('input-brand-name').value = logoState.brandName || '';
      document.getElementById('input-tagline').value = logoState.tagline || '';
      document.getElementById('input-font-family').value = logoState.fontFamily || 'Montserrat';
      document.getElementById('input-layout').value = logoState.layout || 'stacked';
      document.getElementById('input-letter-spacing').value = logoState.letterSpacingEm ?? 0.08;
      document.getElementById('input-text-color').value = logoState.textColor || '#ffffff';
      document.getElementById('input-tagline-color').value = logoState.taglineColor || '#94a3b8';
      document.getElementById('input-bg-color').value = logoState.backgroundColor || '#0b0f19';
      document.getElementById('input-transparent-bg').checked = logoState.transparentBg !== false;
    }

    function onTextControlChange() {
      logoState.brandName = document.getElementById('input-brand-name').value;
      logoState.tagline = document.getElementById('input-tagline').value;
      logoState.fontFamily = document.getElementById('input-font-family').value;
      logoState.layout = document.getElementById('input-layout').value;
      logoState.letterSpacingEm = parseFloat(document.getElementById('input-letter-spacing').value) || 0;
      logoState.textColor = document.getElementById('input-text-color').value;
      logoState.taglineColor = document.getElementById('input-tagline-color').value;
      logoState.backgroundColor = document.getElementById('input-bg-color').value;
      logoState.transparentBg = document.getElementById('input-transparent-bg').checked;
      renderStage();
    }

    function setPreviewTab(tab) {
      previewTab = tab;
      ['combined', 'icon', 'compare'].forEach(t => {
        const btn = document.getElementById('tab-preview-' + t);
        if (btn) {
          btn.className = t === tab
            ? 'px-2.5 py-1 rounded-lg font-bold bg-cyan-600 text-white transition'
            : 'px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition';
        }
      });
      renderStage();
    }

    function renderStage() {
      const stageWrapper = document.getElementById('vector-stage-wrapper');
      const stageContent = document.getElementById('vector-stage-content');
      const compareContent = document.getElementById('compare-stage-content');
      const compareVectorBox = document.getElementById('compare-vector-box');

      if (!logoState.transparentBg && logoState.backgroundColor) {
        stageWrapper.style.background = logoState.backgroundColor;
        stageWrapper.classList.remove('checkerboard');
      } else {
        stageWrapper.style.background = '';
        stageWrapper.classList.add('checkerboard');
      }

      if (previewTab === 'compare' && currentUploadedDataUrl) {
        stageContent.classList.add('hidden');
        compareContent.classList.remove('hidden');
        document.getElementById('original-raster-img').src = currentUploadedDataUrl;
        compareVectorBox.innerHTML = buildClientCombinedSvg(true);
      } else {
        compareContent.classList.add('hidden');
        stageContent.classList.remove('hidden');
        stageContent.innerHTML = previewTab === 'icon'
          ? buildClientIconSvg(true)
          : buildClientCombinedSvg(true);
      }
    }

    function setStatus(text, isBusy) {
      const pill = document.getElementById('status-pill');
      if (!pill) return;
      pill.textContent = text;
      pill.className = isBusy
        ? 'text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold animate-pulse'
        : 'text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold';
    }

    async function processDataUrl(dataUrl) {
      currentUploadedDataUrl = dataUrl;
      setStatus('Analyzing & Vectorizing with Gemini 3.8 Flash...', true);
      const separateText = document.getElementById('opt-separate-text').checked;
      const maxColors = parseInt(document.getElementById('opt-max-colors').value, 10) || 4;

      try {
        const res = await fetch('/v1/tools/canva-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: dataUrl,
            maxColors,
            separateText
          })
        });
        const data = await res.json();
        if (!res.ok || !data.state) {
          throw new Error(data.message || 'Vectorization failed');
        }
        logoState = data.state;
        window.logoState = logoState;
        syncInputsFromState();
        renderLayersEditor();
        renderStage();
        setStatus('Vectorized (' + logoState.layers.length + ' layers) ✓', false);
      } catch (err) {
        alert('Error: ' + err.message);
        setStatus('Error', false);
      }
    }

    function retraceIfUploaded() {
      if (currentUploadedDataUrl) {
        processDataUrl(currentUploadedDataUrl);
      }
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('drop-zone').classList.add('border-cyan-400', 'bg-cyan-950/20');
    }

    function handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('drop-zone').classList.remove('border-cyan-400', 'bg-cyan-950/20');
    }

    function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('drop-zone').classList.remove('border-cyan-400', 'bg-cyan-950/20');
      const file = e.dataTransfer?.files?.[0];
      if (file) readAndProcessFile(file);
    }

    function handleFileSelect(e) {
      const file = e.target?.files?.[0];
      if (file) readAndProcessFile(file);
    }

    function readAndProcessFile(file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          processDataUrl(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }

    async function generateFromPrompt() {
      const input = document.getElementById('ai-logo-prompt');
      const prompt = input.value.trim() || 'VALKYRIE CLOUD - geometric Nordic wing in cyan and electric indigo';
      const btn = document.getElementById('btn-generate-prompt');
      btn.disabled = true;
      btn.textContent = 'Generating...';
      setStatus('Gemini 3.8 Flash is designing vector logo...', true);

      try {
        const res = await fetch('/v1/tools/canva-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        if (!res.ok || !data.state) throw new Error(data.message || 'Could not generate logo');
        currentUploadedDataUrl = null;
        logoState = data.state;
        window.logoState = logoState;
        syncInputsFromState();
        renderLayersEditor();
        if (previewTab === 'compare') previewTab = 'combined';
        renderStage();
        setStatus('AI Vector Logo Ready ✓', false);
      } catch (err) {
        alert('Error: ' + err.message);
        setStatus('Error', false);
      } finally {
        btn.disabled = false;
        btn.textContent = '✨ Generate Vector Logo';
      }
    }

    // Generates a realistic flat raster AI logo on an HTML5 canvas (with baked-in text & background)
    // and runs it through the real AI Vision + Multi-Color Vectorizer pipeline!
    function loadDemoAiLogo(preset) {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 600;
      const ctx = c.getContext('2d');

      if (preset === 'nova') {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, 600, 600);
        // Outer hexagon
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.moveTo(300, 70); ctx.lineTo(460, 160); ctx.lineTo(460, 340);
        ctx.lineTo(300, 430); ctx.lineTo(140, 340); ctx.lineTo(140, 160);
        ctx.closePath(); ctx.fill();
        // Inner cutout
        ctx.fillStyle = '#0b0f19';
        ctx.beginPath();
        ctx.moveTo(300, 125); ctx.lineTo(410, 188); ctx.lineTo(410, 312);
        ctx.lineTo(300, 375); ctx.lineTo(190, 312); ctx.lineTo(190, 188);
        ctx.closePath(); ctx.fill();
        // Cyan lightning / prism
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(300, 145); ctx.lineTo(390, 200); ctx.lineTo(300, 255); ctx.lineTo(210, 200);
        ctx.closePath(); ctx.fill();
        // Rose accent wing
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(210, 225); ctx.lineTo(290, 270); ctx.lineTo(290, 355); ctx.lineTo(210, 310);
        ctx.closePath(); ctx.fill();
        // Baked-in raster text at bottom
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NOVAFLOW', 300, 510);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 22px sans-serif';
        ctx.fillText('AI CLOUD ENGINE', 300, 550);
      } else if (preset === 'aurora') {
        ctx.fillStyle = '#052e16';
        ctx.fillRect(0, 0, 600, 600);
        // Emerald circle badge
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(300, 235, 155, 0, Math.PI * 2);
        ctx.fill();
        // Inner dark cutout
        ctx.fillStyle = '#052e16';
        ctx.beginPath();
        ctx.arc(300, 235, 115, 0, Math.PI * 2);
        ctx.fill();
        // Golden sun / leaf core
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(300, 210, 58, 0, Math.PI * 2);
        ctx.fill();
        // Teal wave
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.moveTo(195, 275); ctx.quadraticCurveTo(300, 215, 405, 275);
        ctx.quadraticCurveTo(300, 355, 195, 275);
        ctx.fill();
        // Baked-in raster text
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VERDANT', 300, 495);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = '700 22px sans-serif';
        ctx.fillText('NORDIC BIO TECH', 300, 540);
      } else {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 600, 600);
        // Gold crown / diamond
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(140, 330); ctx.lineTo(185, 150); ctx.lineTo(300, 245);
        ctx.lineTo(415, 150); ctx.lineTo(460, 330);
        ctx.closePath(); ctx.fill();
        // Center jewel
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(300, 110); ctx.lineTo(345, 205); ctx.lineTo(300, 300); ctx.lineTo(255, 205);
        ctx.closePath(); ctx.fill();
        // Base bar
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(150, 350, 300, 28);
        // Baked-in raster text
        ctx.fillStyle = '#fef08a';
        ctx.font = '800 50px serif';
        ctx.textAlign = 'center';
        ctx.fillText('AURELIA', 300, 485);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '600 21px sans-serif';
        ctx.fillText('COPENHAGEN ATELIER', 300, 535);
      }

      const dataUrl = c.toDataURL('image/png');
      previewTab = 'compare';
      setPreviewTab('compare');
      processDataUrl(dataUrl);
    }

    function downloadCanvaIconSvg() {
      const svg = buildClientIconSvg(false);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ((logoState.brandName || 'logo').toLowerCase().replace(/[^a-z0-9]/g, '') || 'logo') + '-canva-icon.svg';
      a.click();
      URL.revokeObjectURL(url);
    }

    function downloadCombinedSvg() {
      const svg = buildClientCombinedSvg(false);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ((logoState.brandName || 'logo').toLowerCase().replace(/[^a-z0-9]/g, '') || 'logo') + '-canva-full.svg';
      a.click();
      URL.revokeObjectURL(url);
    }

    async function downloadEditableCanvaPdf() {
      const btn = document.getElementById('btn-download-canva-pdf');
      const titleEl = document.getElementById('pdf-btn-title');
      btn.disabled = true;
      titleEl.textContent = 'Building Editable Canva PDF...';

      try {
        const res = await fetch('/v1/tools/canva-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customState: logoState })
        });
        const data = await res.json();
        if (!res.ok || !data.canvaPdfDownloadUrl) {
          throw new Error(data.message || 'Could not generate Canva PDF');
        }
        const a = document.createElement('a');
        a.href = data.canvaPdfDownloadUrl;
        a.download = ((logoState.brandName || 'logo').toLowerCase().replace(/[^a-z0-9]/g, '') || 'logo') + '-canva-editable.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        titleEl.textContent = 'Canva PDF Downloaded ✓';
      } catch (err) {
        alert('PDF export error: ' + err.message);
        titleEl.textContent = 'Download Fully Editable Canva PDF (.PDF)';
      } finally {
        setTimeout(() => {
          titleEl.textContent = 'Download Fully Editable Canva PDF (.PDF)';
          btn.disabled = false;
        }, 2200);
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      syncInputsFromState();
      renderLayersEditor();
      renderStage();
    });
  </script>
</body>
</html>`;

    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  });
};
