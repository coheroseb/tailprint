export interface NavbarOptions {
  activeSection?: 'product' | 'templates' | 'tools' | 'pricing' | 'guides' | 'resources' | 'dashboard';
  activeTool?: string;
  templatesCount?: number;
  rightExtraHtml?: string;
}

export function renderGlobalNavbar(options: NavbarOptions = {}): string {
  const {
    activeSection,
    activeTool,
    templatesCount = 8,
    rightExtraHtml = '',
  } = options;

  const isToolsActive = activeSection === 'tools' || Boolean(activeTool);
  const isGuidesActive = activeSection === 'guides';
  const isDashboardActive = activeSection === 'dashboard';

  return `
  <!-- Unified Global Navigation -->
  <header class="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 shrink-0">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      
      <!-- Brand Logo (logo.svg without leading icon) & Main Navigation -->
      <div class="flex items-center space-x-8">
        <a href="/" class="flex items-center group transition hover:opacity-90 shrink-0" aria-label="Tailprint Home">
          <img src="/logo.svg" alt="Tailprint" class="h-7 sm:h-8 w-auto select-none" />
        </a>

        <!-- Main Product Links (Desktop) -->
        <nav class="hidden md:flex items-center space-x-1 text-sm font-medium">
          
          <!-- Product Dropdown -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5 focus:outline-none">
              <span>Product</span>
              <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 w-[340px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2 space-y-1">
                
                <a href="/#playground" class="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-indigo-500/20">
                    ⚡
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-indigo-300 flex items-center space-x-1.5">
                      <span>Live Sandbox</span>
                      <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Interactive HTML to PDF &amp; PNG playground in browser</p>
                  </div>
                </a>

                <a href="/#mcp" class="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-purple-500/20">
                    🤖
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-purple-300 flex items-center space-x-1.5">
                      <span>AI MCP Server</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-semibold">npx tailprint</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Model Context Protocol for Claude &amp; Cursor agents</p>
                  </div>
                </a>

                <a href="/#scraper" class="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-cyan-500/20">
                    🌐
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-cyan-300">
                      Web to Markdown
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Clean web pages into LLM markdown with token savings</p>
                  </div>
                </a>

                <div class="pt-2 mt-1 border-t border-slate-800/70 px-2.5 pb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Sub-500ms Chromium engine</span>
                  <span class="text-indigo-400 font-semibold font-mono">Tailwind v3/v4</span>
                </div>

              </div>
            </div>
          </div>

          <!-- Templates Direct Link -->
          <a href="/#templates" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5">
            <span>Templates</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono leading-none">${templatesCount}</span>
          </a>

          <!-- Free Tools Dropdown -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg ${isToolsActive ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-900/80'} transition flex items-center space-x-1.5 focus:outline-none">
              <span>${activeTool || 'Free Tools'}</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider leading-none">New</span>
              <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 w-[350px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2 space-y-1">
                
                <a href="/studio" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Template Studio' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-purple-500/20">
                    ⚡
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-purple-300 flex items-center space-x-1.5">
                      <span>Interactive Template Studio</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold">New</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Visual Tailwind code editor with Smart Pagination Shield</p>
                  </div>
                </a>

                <a href="/tools/carousel" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'LinkedIn Carousel' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-blue-500/20">
                    📱
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-blue-300 flex items-center space-x-1.5">
                      <span>LinkedIn Carousel Maker</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Markdown to 1080×1350 multi-page PDF &amp; PNG covers</p>
                  </div>
                </a>

                <a href="/tools/reel" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Social Reel Maker' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-rose-500/20">
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
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-emerald-500/20">
                    🇪🇺
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-emerald-300 flex items-center space-x-1.5">
                      <span>Factur-X &amp; PEPPOL Generator</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">EN 16931</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Hybrid PDF/A-3 invoices with embedded XML</p>
                  </div>
                </a>

                <a href="/tools/visual-diff" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Visual Regression Diff' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-pink-500/20">
                    🔍
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-pink-300">
                      Visual Regression Diff
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Pixelmatch diff heatmap &amp; visual comparison canvas</p>
                  </div>
                </a>

                <a href="/tools/canva-logo" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'AI Logo til Canva' || activeTool === 'AI Logo to Canva' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-cyan-500/20">
                    🎨
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-cyan-300 flex items-center space-x-1.5">
                      <span>AI Logo to Canva Vector</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-semibold">SVG + PDF</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Convert flat AI logos into editable Canva color layers</p>
                  </div>
                </a>

                <a href="/tools/mockup" class="flex items-start space-x-3 p-2.5 rounded-xl ${activeTool === 'Device Mockup' ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-amber-500/20">
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
                    <span>Browse All Free Developer Tools</span>
                    <span>→</span>
                  </a>
                </div>

              </div>
            </div>
          </div>

          <!-- Pricing Link -->
          <a href="/#pricing" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition">
            Pricing
          </a>

          <!-- Guides Link -->
          <a href="/guides" class="px-3 py-1.5 rounded-lg ${isGuidesActive ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-900/80'} transition">
            Guides
          </a>

          <!-- Resources Dropdown -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5 focus:outline-none">
              <span>Resources</span>
              <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute right-0 md:left-0 top-full pt-2 w-[280px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2 space-y-1">
                
                <a href="/docs" target="_blank" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    📖
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-indigo-300 flex items-center space-x-1">
                      <span>API Reference</span>
                      <svg class="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">Interactive Swagger / OpenAPI docs</p>
                  </div>
                </a>

                <a href="https://www.npmjs.com/package/tailprint" target="_blank" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    📦
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-rose-300 flex items-center space-x-1">
                      <span>NPM Package</span>
                      <svg class="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">CLI &amp; MCP server for Node.js</p>
                  </div>
                </a>

                <a href="/guides" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    📚
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-cyan-300 flex items-center space-x-1">
                      <span>Guides &amp; Articles</span>
                      <span class="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">New</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">Next.js, Factur-X &amp; MCP tutorials</p>
                  </div>
                </a>

                <a href="/#faq" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    💡
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-amber-300">
                      FAQ &amp; Architecture
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">Caching, latency &amp; self-hosting</p>
                  </div>
                </a>

              </div>
            </div>
          </div>

        </nav>
      </div>

      <!-- User Actions & CTA -->
      <div class="flex items-center space-x-3">
        ${rightExtraHtml}
        <a href="/dashboard" class="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${isDashboardActive ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300' : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800'} transition">
          Customer Portal
        </a>
        <button onclick="if(window.startCheckout){window.startCheckout('free')}else{window.location.href='/#pricing'}" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5">
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
    <div id="mobile-menu" class="hidden md:hidden border-t border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl px-6 py-5 space-y-4 max-h-[85vh] overflow-y-auto">
      
      <!-- Product Group -->
      <div>
        <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Product &amp; Engine</p>
        <div class="space-y-1">
          <a href="/#playground" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900">
            <span>⚡ Live Playground</span>
          </a>
          <a href="/#mcp" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>🤖 AI MCP Server</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">Claude &amp; Cursor</span>
          </a>
          <a href="/#scraper" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>🌐 Web to Markdown Scraper</span>
          </a>
        </div>
      </div>

      <!-- Free Tools Group -->
      <div class="pt-2 border-t border-slate-800/60">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500">Free Developer Tools</p>
          <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase">No Login</span>
        </div>
        <div class="space-y-1">
          <a href="/studio" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Template Studio' ? 'bg-indigo-600 text-white' : 'text-purple-300 hover:bg-slate-900'}">
            <span>⚡ Interactive Template Studio</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold ml-auto">New</span>
          </a>
          <a href="/tools/carousel" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'LinkedIn Carousel' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>📱 LinkedIn Carousel Maker</span>
          </a>
          <a href="/tools/reel" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Social Reel Maker' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>🎬 Social Reel &amp; Short Maker</span>
          </a>
          <a href="/tools/canva-logo" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'AI Logo to Canva' ? 'bg-indigo-600 text-white' : 'text-cyan-300 hover:bg-slate-900'}">
            <span>🎨 AI Logo to Canva Vector</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold ml-auto">New</span>
          </a>
          <a href="/tools/factur-x" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Factur-X E-Invoice' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>🇪🇺 EU Factur-X &amp; PEPPOL</span>
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

      <!-- Templates & Docs -->
      <div class="pt-2 border-t border-slate-800/60">
        <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Library &amp; Resources</p>
        <div class="space-y-1">
          <a href="/#templates" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>Templates Library</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">${templatesCount}</span>
          </a>
          <a href="/guides" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>Guides &amp; Articles</span>
          </a>
          <a href="/docs" target="_blank" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>API Docs (Swagger)</span>
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <a href="https://www.npmjs.com/package/tailprint" target="_blank" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>NPM Package (CLI &amp; MCP)</span>
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <a href="/#pricing" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>Pricing Plans</span>
          </a>
          <a href="/#faq" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>FAQ</span>
          </a>
        </div>
      </div>

      <!-- Portal & CTA -->
      <div class="pt-3 border-t border-slate-800/80 space-y-2">
        <a href="/dashboard" class="block w-full py-2.5 text-center rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-200 hover:bg-slate-800">
          Customer Portal
        </a>
        <button onclick="if(window.startCheckout){window.startCheckout('free')}else{window.location.href='/#pricing'}" class="w-full py-2.5 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30">
          ⚡ Claim 100 Free Renders
        </button>
      </div>

    </div>
  </header>`;
}
