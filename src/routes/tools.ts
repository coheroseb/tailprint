import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { carouselService } from '../services/carousel.js';
import { eInvoiceService } from '../services/eInvoice.js';
import { visualDiffService } from '../services/visualDiff.js';
import { mockupService } from '../services/mockup.js';
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
  fastify.get('/tools', async (_request, reply) => {
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

    <!-- 4 Core Tools Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
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

  fastify.get('/tools/carousel', carouselHandler);
  fastify.get('/carousel', carouselHandler);

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

  fastify.get('/tools/factur-x', facturXHandler);
  fastify.get('/factur-x', facturXHandler);

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

  fastify.get('/tools/visual-diff', visualDiffHandler);
  fastify.get('/visual-diff', visualDiffHandler);

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

  fastify.get('/tools/mockup', mockupHandler);
  fastify.get('/mockup', mockupHandler);

  // ==========================================
  // FREE API ENDPOINTS (IP Rate-limited)
  // ==========================================

  // 1. POST /v1/tools/carousel
  fastify.post(
    '/v1/tools/carousel',
    {
      schema: {
        hide: true,
        body: z.object({
          author_name: z.string().optional().default('Tailprint Insights'),
          author_handle: z.string().optional().default('@tailprint'),
          author_role: z.string().optional().default('High-Performance Engine'),
          theme: z.enum(['dark', 'light', 'emerald', 'gradient']).optional().default('dark'),
          markdown: z.string().min(5),
        }),
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
        hide: true,
        body: z.object({
          invoiceNumber: z.string().min(1),
          currency: z.string().length(3).default('EUR'),
          dueDate: z.string().optional(),
          seller: z.object({
            name: z.string().min(1),
            vatId: z.string().optional(),
            street: z.string().optional(),
            city: z.string().optional(),
            country: z.string().length(2).default('DK'),
          }),
          buyer: z.object({
            name: z.string().min(1),
            vatId: z.string().optional(),
            street: z.string().optional(),
            city: z.string().optional(),
            country: z.string().length(2).default('DE'),
          }),
          lineItems: z.array(
            z.object({
              name: z.string(),
              quantity: z.number().positive(),
              unitPrice: z.number().nonnegative(),
              vatRate: z.number().nonnegative().default(25),
            })
          ),
          paymentIban: z.string().optional(),
          paymentBic: z.string().optional(),
        }),
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
        hide: true,
        body: z.object({
          before_url: z.string().url(),
          after_url: z.string().url(),
        }),
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
        hide: true,
        body: z.object({
          url: z.string().url(),
          title: z.string().optional(),
          delay_ms: z.number().min(0).max(10000).optional().default(500),
        }),
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
};
