export interface NavbarOptions {
  activeSection?: 'product' | 'templates' | 'tools' | 'pricing' | 'guides' | 'resources' | 'dashboard' | 'showcase';
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
  const isShowcaseActive = activeSection === 'showcase';
  const isDashboardActive = activeSection === 'dashboard';
  const isResourcesActive = activeSection === 'resources' || isShowcaseActive;

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
          
          <!-- Product Dropdown (100% Document & PDF Focused) -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5 focus:outline-none">
              <span>Product</span>
              <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 w-[390px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2.5 space-y-1.5">
                
                <!-- Pillar 1: HTML-to-PDF Engine -->
                <a href="/#documents" class="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-indigo-500/20">
                    📄
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-indigo-300 flex items-center space-x-1.5">
                      <span>Tailwind HTML-to-PDF Engine</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold">&lt;500ms</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Sub-500ms vector PDFs with Smart Pagination Shield &amp; repeating table headers</p>
                  </div>
                </a>

                <!-- Pillar 2: EU E-Invoicing & Compliance -->
                <a href="/#einvoice" class="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-emerald-500/20">
                    🇪🇺
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-emerald-300 flex items-center space-x-1.5">
                      <span>EU Factur-X &amp; ZUGFeRD</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">EN 16931</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Legal hybrid PDF/A-3 invoices with embedded XML for SAP, DATEV &amp; Dinero</p>
                  </div>
                </a>

                <!-- Pillar 3: PDF Toolkit & MCP Server -->
                <a href="/#mcp" class="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-purple-500/20">
                    🤖
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-purple-300 flex items-center space-x-1.5">
                      <span>PDF Toolkit &amp; MCP Server</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-semibold">Claude &amp; Cursor</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Merge, split, fill AcroForms, stamp &amp; generate PDFs from AI agents</p>
                  </div>
                </a>

                <div class="pt-2 mt-1 border-t border-slate-800/70 px-2.5 pb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Pre-warmed Chromium pool</span>
                  <span class="text-indigo-400 font-semibold font-mono">Zero-Retention GDPR</span>
                </div>

              </div>
            </div>
          </div>

          <!-- Templates Direct Link -->
          <a href="/#templates" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 transition flex items-center space-x-1.5">
            <span>Templates</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono leading-none">${templatesCount}</span>
          </a>

          <!-- PDF Tools Dropdown -->
          <div class="relative group">
            <button type="button" class="px-3 py-1.5 rounded-lg ${isToolsActive ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-900/80'} transition flex items-center space-x-1.5 focus:outline-none">
              <span>${activeTool || 'PDF Tools'}</span>
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
                      <span>Interactive PDF Studio</span>
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold">Live IDE</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Visual Tailwind HTML-to-PDF editor with Smart Pagination Shield</p>
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
                    <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">Hybrid PDF/A-3 invoices with embedded CrossIndustryInvoice XML</p>
                  </div>
                </a>

                <div class="pt-1.5 mt-1 border-t border-slate-800/70 p-1">
                  <a href="/tools" class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-xs font-semibold text-indigo-300 hover:text-white transition">
                    <span>Browse All PDF Tools</span>
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
            <button type="button" class="px-3 py-1.5 rounded-lg ${isResourcesActive ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-900/80'} transition flex items-center space-x-1.5 focus:outline-none">
              <span>Resources</span>
              <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute right-0 md:left-0 top-full pt-2 w-[280px] opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
              <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-2 space-y-1">
                
                <a href="/showcase" class="flex items-start space-x-3 p-2 rounded-xl ${isShowcaseActive ? 'bg-slate-800/80 text-indigo-300' : 'hover:bg-slate-800/60'} transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    📄
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-indigo-300 flex items-center space-x-1">
                      <span>Showcase &amp; Stories</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">SaaS PDF engines, Factur-X &amp; MCP workflows</p>
                  </div>
                </a>

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
                    <p class="text-[11px] text-slate-400 mt-0.5">TypeScript SDK &amp; MCP CLI (v1.4)</p>
                  </div>
                </a>

                <a href="https://pypi.org/project/tailprint/" target="_blank" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    🐍
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-emerald-300 flex items-center space-x-1">
                      <span>Python SDK (PyPI)</span>
                      <svg class="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">pip install tailprint (v1.4)</p>
                  </div>
                </a>

                <a href="https://github.com/coheroseb/tailprint/tree/main/sdk/php" target="_blank" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    🐘
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-purple-300 flex items-center space-x-1">
                      <span>PHP &amp; Laravel SDK</span>
                      <span class="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-semibold">New</span>
                      <svg class="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">tailprint/tailprint + Laravel Facade</p>
                  </div>
                </a>

                <a href="https://github.com/coheroseb/tailprint/tree/main/sdk/go" target="_blank" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    🐹
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-sky-300 flex items-center space-x-1">
                      <span>Go SDK</span>
                      <span class="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono font-semibold">New</span>
                      <svg class="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">github.com/coheroseb/tailprint/sdk/go</p>
                  </div>
                </a>

                <a href="https://github.com/coheroseb/tailprint" target="_blank" class="flex items-start space-x-3 p-2 rounded-xl hover:bg-slate-800/60 transition group/item">
                  <div class="w-7 h-7 rounded-lg bg-slate-700/30 border border-slate-600/30 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover/item:text-slate-300 flex items-center space-x-1">
                      <span>GitHub</span>
                      <svg class="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">Open-source SDKs &amp; MCP tooling</p>
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
        <button onclick="if(window.openFreeKeyModal){window.openFreeKeyModal()}else if(window.startCheckout){window.startCheckout('free')}else{window.location.href='/#pricing'}" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5">
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
          <a href="/studio" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900">
            <span>⚡ Interactive Studio</span>
          </a>
          <a href="/#mcp" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>🤖 AI MCP Server</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">Claude &amp; Cursor</span>
          </a>
        </div>
      </div>

      <!-- PDF Tools Group -->
      <div class="pt-2 border-t border-slate-800/60">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500">PDF &amp; Document Tools</p>
          <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase">No Login</span>
        </div>
        <div class="space-y-1">
          <a href="/studio" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Template Studio' ? 'bg-indigo-600 text-white' : 'text-purple-300 hover:bg-slate-900'}">
            <span>⚡ Interactive PDF Studio</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold ml-auto">Live IDE</span>
          </a>
          <a href="/tools/factur-x" class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${activeTool === 'Factur-X E-Invoice' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>🇪🇺 EU Factur-X &amp; PEPPOL</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold ml-auto">EN 16931</span>
          </a>
          <a href="/tools" class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-slate-900">
            <span>View All PDF Tools</span>
            <span>→</span>
          </a>
        </div>
      </div>

      <!-- Templates & Docs -->
      <div class="pt-2 border-t border-slate-800/60">
        <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Library &amp; Resources</p>
        <div class="space-y-1">
          <a href="/showcase" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${isShowcaseActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}">
            <span>Showcase &amp; Customer Stories</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">New</span>
          </a>
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
            <span>NPM Package (TypeScript SDK &amp; MCP)</span>
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <a href="https://pypi.org/project/tailprint/" target="_blank" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span class="flex items-center space-x-2">
              <span>Python SDK (PyPI)</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">New</span>
            </span>
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <a href="https://github.com/coheroseb/tailprint" target="_blank" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900">
            <span>GitHub Repository</span>
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
        <button onclick="if(window.openFreeKeyModal){window.openFreeKeyModal()}else if(window.startCheckout){window.startCheckout('free')}else{window.location.href='/#pricing'}" class="w-full py-2.5 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30">
          ⚡ Claim 100 Free Renders
        </button>
      </div>

    </div>
  </header>`;
}
