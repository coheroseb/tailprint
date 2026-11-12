import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { carouselService } from '../services/carousel.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { visualDiffService } from '../services/visualDiff.js';
import { mockupService } from '../services/mockup.js';
import { reelService } from '../services/reel.js';
import { storageService } from '../services/storage.js';
import { redisService } from '../services/redis.js';

export const toolsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Shared Header & Navigation Component
  function renderHeader(activeTool?: string) {
    return `
  <!-- Global Announcement Header -->
  <header class="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-6">
        <a href="/" class="flex items-center space-x-2.5 group">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition">
            TP
          </div>
          <span class="text-lg font-black tracking-tight text-white">
            <span class="text-indigo-400 font-mono font-bold mr-1">&lt;</span>tail<span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">print</span><span class="text-pink-400 font-mono font-bold ml-1">/&gt;</span>
          </span>
        </a>

        <!-- Desktop Navigation with Dropdowns -->
        <nav class="hidden md:flex items-center space-x-1 text-sm font-medium">
          
          <!-- Free Tools Dropdown (Highlighted on tools pages) -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:text-white transition flex items-center space-x-1.5 focus:outline-none">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="font-semibold">${activeTool || 'Free Tools'}</span>
              <svg class="w-3.5 h-3.5 text-indigo-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 w-[340px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2 space-y-1">
                
                <a href="/studio" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Template Studio' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    ⚡
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-purple-300 flex items-center space-x-1.5">
                      <span>Interactive Template Studio</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold">New</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Real-time Tailwind editor with Smart Pagination Shield</p>
                  </div>
                </a>

                <a href="/tools/carousel" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'LinkedIn Carousel' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    📱
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-blue-300">
                      LinkedIn Carousel Maker
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Markdown to 1080×1350 multi-page PDF & PNG covers</p>
                  </div>
                </a>

                <a href="/tools/reel" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Social Reel Maker' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    🎬
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-rose-300 flex items-center space-x-1.5">
                      <span>Social Reel &amp; Short Maker</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono font-semibold">9:16</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Turn any URL into a 9:16 vertical Reel / Story video</p>
                  </div>
                </a>

                <a href="/tools/factur-x" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Factur-X E-Invoice' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    🇪🇺
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-emerald-300 flex items-center space-x-1.5">
                      <span>Factur-X & PEPPOL Generator</span>
                      <span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">EN 16931</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Hybrid PDF/A-3 invoices with embedded XML</p>
                  </div>
                </a>

                <a href="/tools/visual-diff" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Visual Regression Diff' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
                    🔍
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-pink-300">
                      Visual Regression Diff
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Pixelmatch diff heatmap & visual comparison canvas</p>
                  </div>
                </a>

                <a href="/tools/mockup" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Device Mockup' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    📸
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-amber-300">
                      Device Mockup Generator
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Turn any URL into a 3D MacBook &amp; iPhone scene</p>
                  </div>
                </a>

                <div class="pt-1.5 mt-1 border-t border-slate-800/70 p-1">
                  <a href="/tools" class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-xs font-semibold text-indigo-300 hover:text-white transition">
                    <span>Browse All Free Tools</span>
                    <span>→</span>
                  </a>
                </div>

              </div>
            </div>
          </div>

          <!-- Product Dropdown -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5 focus:outline-none">
              <span>Platform</span>
              <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 w-[300px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2 space-y-1">
                <a href="/#playground" class="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-800/60 text-xs font-bold text-slate-200 hover:text-white transition">
                  <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs">⚡</span>
                  <span>Interactive Playground</span>
                </a>
                <a href="/#mcp" class="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-800/60 text-xs font-bold text-slate-200 hover:text-white transition">
                  <span class="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs">🤖</span>
                  <span>AI MCP Server</span>
                </a>
                <a href="/#scraper" class="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-800/60 text-xs font-bold text-slate-200 hover:text-white transition">
                  <span class="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs">🌐</span>
                  <span>Web to Markdown</span>
                </a>
              </div>
            </div>
          </div>

          <a href="/#templates" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition">
            Templates
          </a>

          <a href="/#pricing" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition">
            Pricing
          </a>

          <a href="/docs" target="_blank" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1">
            <span>Docs</span>
            <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>

        </nav>
      </div>

      <div class="flex items-center space-x-3">
        <a href="/dashboard" class="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition">
          Customer Portal
        </a>
        <a href="/#pricing" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5">
          <span>⚡ 100 Free Renders</span>
        </a>

        <!-- Mobile Menu Toggle Button -->
        <button onclick="document.getElementById('mobile-tools-menu').classList.toggle('hidden')" class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800" aria-label="Toggle navigation">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Tools Dropdown Navigation -->
    <div id="mobile-tools-menu" class="hidden md:hidden border-t border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl px-6 py-5 space-y-4 max-h-[85vh] overflow-y-auto">
      
      <!-- Free Tools Group -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500">Free Developer Tools</p>
          <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase">No Login</span>
        </div>
        <div class="space-y-1">
          <a href="/studio" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Template Studio' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>⚡ Interactive Template Studio</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold ml-auto">New</span>
          </a>
          <a href="/tools/carousel" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'LinkedIn Carousel' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>📱 LinkedIn Carousel Maker</span>
          </a>
          <a href="/tools/factur-x" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Factur-X E-Invoice' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>🇪🇺 EU Factur-X & PEPPOL</span>
          </a>
          <a href="/tools/visual-diff" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Visual Regression Diff' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>🔍 Visual Regression Diff</span>
          </a>
          <a href="/tools/mockup" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Device Mockup' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>📸 Device Mockup Generator</span>
          </a>
          <a href="/tools" class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-slate-900">
            <span>View All Free Tools Hub</span>
            <span>→</span>
          </a>
        </div>
      </div>

      <!-- Main Platform Links -->
      <div class="pt-2 border-t border-slate-800/60">
        <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Platform & Docs</p>
        <div class="space-y-1">
          <a href="/#playground" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>⚡ Interactive Playground</span>
          </a>
          <a href="/#templates" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>Templates</span>
          </a>
          <a href="/docs" target="_blank" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>API Reference</span>
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <a href="/#pricing" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>Pricing Plans</span>
          </a>
        </div>
      </div>

      <!-- Portal & CTA -->
      <div class="pt-3 border-t border-slate-800/80 space-y-2">
        <a href="/dashboard" class="block w-full py-2.5 text-center rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-200 hover:bg-slate-800">
          Customer Portal
        </a>
        <a href="/#pricing" class="block w-full py-2.5 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30">
          ⚡ Claim 100 Free Renders
        </a>
      </div>

    </div>
  </header>`;
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
              Paste any URL or article and convert it into a vertical 9:16 (1080×1920) animated Reel / Story with kinetic typography, progress bars, and instant video download.
            </p>
          </div>
        </div>
        <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-rose-400">
          <span>Create 9:16 Reel</span>
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

          <!-- Theme Selector -->
          <div>
            <label class="block text-[11px] text-slate-400 font-medium mb-2">Visual Color Theme</label>
            <div class="flex flex-wrap gap-2">
              <button onclick="setReelTheme('gradient')" id="theme-btn-gradient" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white border border-indigo-400/40">Gradient Glow</button>
              <button onclick="setReelTheme('cyberpunk')" id="theme-btn-cyberpunk" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Cyberpunk Neon</button>
              <button onclick="setReelTheme('midnight')" id="theme-btn-midnight" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Midnight Emerald</button>
              <button onclick="setReelTheme('sunset')" id="theme-btn-sunset" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Sunset Amber</button>
              <button onclick="setReelTheme('clean')" id="theme-btn-clean" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800">Clean Tech Light</button>
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
              <div class="flex items-center justify-between border-b border-white/10 pb-3">
                <div class="flex items-center space-x-2.5">
                  <div id="preview-avatar" class="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-black text-xs shadow-md">
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

            <!-- Main Slide Content (Center) -->
            <div id="preview-content-container" class="my-auto z-20 space-y-3 py-2">
              <h2 id="preview-headline" class="text-xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                Sub-500ms Vector PDF Generation for Developers
              </h2>

              <div id="preview-stat-card" class="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center space-x-3 shadow-lg">
                <span id="preview-stat" class="text-2xl font-black text-cyan-400">380ms</span>
                <span id="preview-stat-label" class="text-[10px] font-bold uppercase text-white/90 tracking-wide">Average Render Time</span>
              </div>

              <!-- Floating Live Screenrecord Browser Card (Active in inset mode) -->
              <div id="preview-screenrecord-card" class="hidden rounded-xl border border-white/20 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md">
                <div class="px-2.5 py-1 bg-slate-900 border-b border-white/10 flex items-center justify-between text-[8px]">
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
            </div>

            <!-- Bottom CTA Footer -->
            <div class="z-20 border-t border-white/10 pt-3 flex items-center justify-between text-[10px]">
              <div class="flex items-center space-x-1.5 font-bold text-white">
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
          <!-- Video Export (Canvas MediaRecorder) -->
          <button
            id="btn-export-video"
            onclick="exportReelVideo()"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2"
          >
            <span id="btn-export-label">🎥 Download 9:16 Video (MP4 / WebM)</span>
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
            <span>Recording <span id="record-aspect-label">9:16</span> Frames (<span id="record-percent">0%</span>)...</span>
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
      theme: "gradient",
      aspectRatio: "9:16",
      screenrecordUrl: null,
      screenrecordMode: "inset",
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

    // Theme CSS maps
    const themeMaps = {
      gradient: {
        bg: "linear-gradient(145deg, #1e1b4b 0%, #31104b 50%, #030712 100%)",
        text: "#ffffff",
        subtext: "rgba(233, 213, 255, 0.85)",
        tagBg: "rgba(99, 102, 241, 0.2)",
        tagBorder: "rgba(99, 102, 241, 0.4)",
        tagText: "#a5b4fc",
        statBg: "rgba(255, 255, 255, 0.08)",
        statBorder: "rgba(255, 255, 255, 0.15)",
        statColor: "#38bdf8"
      },
      cyberpunk: {
        bg: "#09090b",
        text: "#facc15",
        subtext: "#d4d4d8",
        tagBg: "rgba(250, 204, 21, 0.15)",
        tagBorder: "rgba(250, 204, 21, 0.4)",
        tagText: "#fef08a",
        statBg: "rgba(250, 204, 21, 0.08)",
        statBorder: "rgba(250, 204, 21, 0.3)",
        statColor: "#ec4899"
      },
      midnight: {
        bg: "#000000",
        text: "#fafafa",
        subtext: "#a1a1aa",
        tagBg: "rgba(16, 185, 129, 0.15)",
        tagBorder: "rgba(16, 185, 129, 0.3)",
        tagText: "#34d399",
        statBg: "rgba(16, 185, 129, 0.08)",
        statBorder: "rgba(16, 185, 129, 0.2)",
        statColor: "#10b981"
      },
      sunset: {
        bg: "linear-gradient(180deg, #4c0519 0%, #030712 60%, #451a03 100%)",
        text: "#ffffff",
        subtext: "rgba(254, 205, 211, 0.85)",
        tagBg: "rgba(244, 63, 94, 0.2)",
        tagBorder: "rgba(244, 63, 94, 0.4)",
        tagText: "#fda4af",
        statBg: "rgba(244, 63, 94, 0.1)",
        statBorder: "rgba(244, 63, 94, 0.25)",
        statColor: "#f59e0b"
      },
      clean: {
        bg: "#f8fafc",
        text: "#0f172a",
        subtext: "#475569",
        tagBg: "#dbeafe",
        tagBorder: "#bfdbfe",
        tagText: "#1d4ed8",
        statBg: "#ffffff",
        statBorder: "#cbd5e1",
        statColor: "#2563eb"
      }
    };

    // Initialize UI
    window.addEventListener('DOMContentLoaded', () => {
      renderSlidesEditor();
      updatePreviewDisplay();
      startPlayback();
    });

    function updateScriptBrand() {
      reelState.brand = document.getElementById('reel-brand').value || 'Brand';
      updatePreviewDisplay();
    }

    function updateScriptHandle() {
      reelState.handle = document.getElementById('reel-handle').value || '@brand';
      updatePreviewDisplay();
    }

    function updateScriptCta() {
      reelState.cta = document.getElementById('reel-cta').value || 'Link in bio';
      updatePreviewDisplay();
    }

    function updateDuration(val) {
      reelState.duration = parseInt(val, 10);
      document.getElementById('duration-label').textContent = (reelState.duration / 1000).toFixed(1) + 's';
      if (isPlaying) {
        restartCurrentSlide();
      }
    }

    function setReelTheme(themeName) {
      reelState.theme = themeName;
      ['gradient', 'cyberpunk', 'midnight', 'sunset', 'clean'].forEach(t => {
        const btn = document.getElementById('theme-btn-' + t);
        if (btn) {
          if (t === themeName) {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white border border-indigo-400/40';
          } else {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800';
          }
        }
      });
      updatePreviewDisplay();
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
    }

    function updatePreviewDisplay() {
      const slide = reelState.slides[currentSlideIdx] || reelState.slides[0];
      const theme = themeMaps[reelState.theme] || themeMaps.gradient;
      const screen = document.getElementById('reel-screen');

      // Apply theme background
      screen.style.background = theme.bg;
      screen.style.color = theme.text;

      // Brand & Avatar
      document.getElementById('preview-brand').textContent = reelState.brand;
      document.getElementById('preview-handle').textContent = reelState.handle;
      document.getElementById('preview-avatar').textContent = reelState.brand.slice(0, 2).toUpperCase();

      // Tag
      const tagEl = document.getElementById('preview-tag');
      tagEl.textContent = slide.tag || 'SLIDE ' + (currentSlideIdx + 1);
      tagEl.style.backgroundColor = theme.tagBg;
      tagEl.style.borderColor = theme.tagBorder;
      tagEl.style.color = theme.tagText;

      // Headline & Body
      const headlineEl = document.getElementById('preview-headline');
      headlineEl.textContent = slide.headline;
      headlineEl.style.color = theme.text;

      const bodyEl = document.getElementById('preview-body');
      bodyEl.textContent = slide.body;
      bodyEl.style.color = theme.subtext;

      // Stat card
      const statCard = document.getElementById('preview-stat-card');
      const statVal = document.getElementById('preview-stat');
      const statLabel = document.getElementById('preview-stat-label');

      if (slide.stat) {
        statCard.classList.remove('hidden');
        statCard.style.backgroundColor = theme.statBg;
        statCard.style.borderColor = theme.statBorder;
        statVal.textContent = slide.stat;
        statVal.style.color = theme.statColor;
        statLabel.textContent = slide.statLabel || 'METRIC';
      } else {
        statCard.classList.add('hidden');
      }

      // CTA & Slide indicator
      document.getElementById('preview-cta').textContent = reelState.cta;
      document.getElementById('preview-slide-indicator').textContent = (currentSlideIdx + 1) + ' / ' + reelState.slides.length;

      // Render top progress bar segments
      renderProgressBars();
      updateScreenrecordDisplay();
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
        const pct = Math.min(100, (elapsed / duration) * 100);
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
          if (data.script.screenrecordUrl) {
            reelState.screenrecordUrl = data.script.screenrecordUrl;
            reelState.screenrecordMode = 'inset';
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
      if (btnExportLabel) btnExportLabel.textContent = '🎥 Download ' + ratio + ' Video (MP4 / WebM)';
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
    }

    // 1. Export Reel Video using HTML5 Canvas & MediaRecorder (Supports 9:16, 1:1, 16:9, 4:5)
    async function exportReelVideo() {
      pausePlayback();
      const ratio = reelState.aspectRatio || '9:16';
      const dim = getCanvasDimensions(ratio);
      const canvas = document.getElementById('export-canvas');
      canvas.width = dim.w;
      canvas.height = dim.h;
      const ctx = canvas.getContext('2d');
      const overlay = document.getElementById('recording-overlay');
      const percentEl = document.getElementById('record-percent');
      const progressBar = document.getElementById('record-progress-bar');
      const btn = document.getElementById('btn-export-video');

      overlay.classList.remove('hidden');
      btn.disabled = true;

      // Prepare source video if screenrecord is active
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
      const slideDurationMs = 2500; // 2.5s per slide in video export
      const fps = 30;
      const framesPerSlide = (slideDurationMs / 1000) * fps;
      const totalFrames = totalSlides * framesPerSlide;

      // Setup MediaRecorder
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

      // Render frame by frame
      let frameCount = 0;
      for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
        const slide = reelState.slides[sIdx];
        const theme = themeMaps[reelState.theme] || themeMaps.gradient;

        for (let f = 0; f < framesPerSlide; f++) {
          frameCount++;
          const progress = f / framesPerSlide;

          // Draw Canvas Frame for the active aspect ratio
          drawReelFrame(ctx, slide, sIdx, totalSlides, progress, theme, dim.w, dim.h);

          const overallPct = Math.round((frameCount / totalFrames) * 100);
          percentEl.textContent = overallPct + '%';
          progressBar.style.width = overallPct + '%';

          // Yield to let stream capture frame
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
        if (reelState.theme === 'cyberpunk') {
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
        const radial = ctx.createRadialGradient(W * 0.8, H * 0.15, 50, W * 0.8, H * 0.15, 600);
        radial.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Progress bars
      const barMargin = aspect === '1:1' ? 60 : aspect === '4:5' ? 70 : 80;
      const barTop = aspect === '9:16' ? 90 : aspect === '4:5' ? 60 : 50;
      const barHeight = aspect === '1:1' ? 7 : 8;
      const barSpacing = 16;
      const totalBarWidth = W - (barMargin * 2);
      const singleBarWidth = (totalBarWidth - (barSpacing * (totalSlides - 1))) / totalSlides;

      for (let i = 0; i < totalSlides; i++) {
        const x = barMargin + i * (singleBarWidth + barSpacing);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        roundRect(ctx, x, barTop, singleBarWidth, barHeight, 4, true, false);

        let fillW = 0;
        if (i < slideIdx) {
          fillW = singleBarWidth;
        } else if (i === slideIdx) {
          fillW = singleBarWidth * slideProgress;
        }
        if (fillW > 0) {
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, x, barTop, fillW, barHeight, 4, true, false);
        }
      }

      // 3. Header: Brand Avatar & Name
      const headerY = aspect === '9:16' ? 160 : aspect === '4:5' ? 120 : 100;
      const avatarSize = aspect === '9:16' ? 80 : 70;
      
      // Avatar
      ctx.fillStyle = '#6366f1';
      roundRect(ctx, barMargin, headerY, avatarSize, avatarSize, 22, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + (avatarSize === 80 ? '36px' : '32px') + ' system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(reelState.brand.slice(0, 2).toUpperCase(), barMargin + avatarSize / 2, headerY + (avatarSize * 0.65));

      // Brand text
      ctx.textAlign = 'left';
      ctx.font = 'bold ' + (avatarSize === 80 ? '38px' : '34px') + ' system-ui, -apple-system, sans-serif';
      ctx.fillStyle = theme.text;
      ctx.fillText(reelState.brand, barMargin + avatarSize + 20, headerY + (avatarSize * 0.48));

      ctx.font = '500 24px monospace';
      ctx.fillStyle = theme.subtext;
      ctx.fillText(reelState.handle, barMargin + avatarSize + 20, headerY + (avatarSize * 0.88));

      // Tag Pill
      const tagText = (slide.tag || 'HOOK').toUpperCase();
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      const tagWidth = ctx.measureText(tagText).width + 48;
      ctx.fillStyle = theme.tagBg;
      roundRect(ctx, W - barMargin - tagWidth, headerY + 10, tagWidth, 50, 25, true, false);
      ctx.fillStyle = theme.tagText;
      ctx.textAlign = 'center';
      ctx.fillText(tagText, W - barMargin - tagWidth / 2, headerY + 43);

      // 4. Content Area adapted to Aspect Ratio
      if (aspect === '16:9') {
        // 2-Column Wide Cinematic Layout
        ctx.textAlign = 'left';
        ctx.font = '900 58px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.text;
        wrapText(ctx, slide.headline, barMargin, 290, 820, 74);

        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 580, 820, 140, 28, true, false);

          ctx.font = '900 78px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 40, 680);

          ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'METRIC').toUpperCase(), barMargin + 40 + ctx.measureText(slide.stat).width + 30, 670);
        }

        // Right Column Body Text
        ctx.font = '500 36px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.subtext;
        wrapText(ctx, slide.body, W / 2 + 30, 310, W / 2 - barMargin - 40, 58);

      } else if (aspect === '1:1') {
        // Square Post Layout
        ctx.textAlign = 'left';
        ctx.font = '900 52px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.text;
        wrapText(ctx, slide.headline, barMargin, 270, W - (barMargin * 2), 68);

        let bodyY = 460;
        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 430, W - (barMargin * 2), 125, 24, true, false);

          ctx.font = '900 70px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 35, 520);

          ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'GROWTH').toUpperCase(), barMargin + 35 + ctx.measureText(slide.stat).width + 25, 510);

          bodyY = 620;
        }

        ctx.font = '500 32px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.subtext;
        wrapText(ctx, slide.body, barMargin, bodyY, W - (barMargin * 2), 50);

      } else if (aspect === '4:5') {
        // 4:5 Feed Portrait Layout
        ctx.textAlign = 'left';
        ctx.font = '900 58px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.text;
        wrapText(ctx, slide.headline, barMargin, 320, W - (barMargin * 2), 76);

        let bodyY = 540;
        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 530, W - (barMargin * 2), 135, 28, true, false);

          ctx.font = '900 76px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 35, 625);

          ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'GROWTH').toUpperCase(), barMargin + 35 + ctx.measureText(slide.stat).width + 30, 615);

          bodyY = 740;
        }

        ctx.font = '500 34px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.subtext;
        wrapText(ctx, slide.body, barMargin, bodyY, W - (barMargin * 2), 54);

      } else {
        // 9:16 Full Vertical Reel
        ctx.textAlign = 'left';
        ctx.font = '900 68px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.text;
        wrapText(ctx, slide.headline, barMargin, 480, W - (barMargin * 2), 88);

        let bodyY = 820;
        if (slide.stat) {
          ctx.fillStyle = theme.statBg;
          roundRect(ctx, barMargin, 800, W - (barMargin * 2), 150, 32, true, false);

          ctx.font = '900 84px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.statColor;
          ctx.fillText(slide.stat, barMargin + 40, 905);

          ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = theme.text;
          ctx.fillText((slide.statLabel || 'GROWTH').toUpperCase(), barMargin + 40 + ctx.measureText(slide.stat).width + 40, 895);

          bodyY = 1040;
        }

        ctx.font = '500 38px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme.subtext;
        wrapText(ctx, slide.body, barMargin, bodyY, W - (barMargin * 2), 60);
      }

      // 5. Footer CTA
      const footerY = aspect === '16:9' ? H - 70 : aspect === '1:1' ? H - 70 : aspect === '4:5' ? H - 90 : H - 120;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barMargin, footerY - 40);
      ctx.lineTo(W - barMargin, footerY - 40);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(barMargin + 15, footerY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'left';
      ctx.fillText(reelState.cta, barMargin + 40, footerY + 10);

      ctx.textAlign = 'right';
      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = theme.subtext;
      ctx.fillText((slideIdx + 1) + ' / ' + totalSlides, W - barMargin, footerY + 10);
    }

    // Canvas roundRect helper
    function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
              aspectRatio: z.string().optional(),
              screenrecordUrl: z.string().optional(),
              screenrecordMode: z.string().optional(),
              language: z.string().optional(),
              languageLabel: z.string().optional(),
              slides: z.array(
                z.object({
                  tag: z.string().optional(),
                  headline: z.string(),
                  body: z.string(),
                  stat: z.string().optional(),
                  statLabel: z.string().optional(),
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
          theme: z.enum(['cyberpunk', 'midnight', 'gradient', 'sunset', 'clean']).default('gradient'),
          aspectRatio: z.enum(['9:16', '1:1', '16:9', '4:5']).optional().default('9:16'),
          screenrecordUrl: z.string().optional(),
          screenrecordMode: z.enum(['inset', 'backdrop', 'none']).optional().default('inset'),
          slides: z
            .array(
              z.object({
                tag: z.string().optional(),
                headline: z.string(),
                body: z.string(),
                stat: z.string().optional(),
                statLabel: z.string().optional(),
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
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp);
      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Free tool rate limit exceeded (max 25 renders/hour). Please upgrade for unlimited access.',
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
};
