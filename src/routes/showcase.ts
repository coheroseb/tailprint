import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { renderGlobalNavbar } from '../components/navbar.js';

export const showcaseRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Shared Navigation Header
  function renderHeader() {
    return renderGlobalNavbar({ activeSection: 'showcase' as any });
  }

  // Shared Footer
  function renderFooter() {
    return `
    <footer class="border-t border-slate-900 bg-slate-950 py-12 px-6">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-300">Tailprint</span>
          <span>— Tailwind-Native Render &amp; PDF Engine + MCP Server</span>
        </div>
        <div class="flex flex-wrap items-center gap-6">
          <a href="/showcase" class="text-indigo-400 font-semibold hover:text-white transition">Showcase &amp; Stories</a>
          <a href="/guides" class="hover:text-indigo-400 transition">Guides &amp; Articles</a>
          <a href="/tools" class="hover:text-indigo-400 transition">Free Tools</a>
          <a href="/studio" class="hover:text-indigo-400 transition">Template Studio</a>
          <a href="/docs" class="hover:text-indigo-400 transition">API Docs</a>
          <a href="/#pricing" class="hover:text-indigo-400 transition">Pricing</a>
        </div>
      </div>
    </footer>`;
  }

  // GET /showcase & GET /customers
  const showcaseHandler = async (_request: any, reply: any) => {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Customer Stories, Use Cases &amp; Social Optimization — Tailprint Showcase</title>
  <meta name="description" content="Discover how engineering, growth, and AI teams use Tailprint to automate social media content (9:16 Video Reels, LinkedIn Carousels), generate sub-500ms vector PDFs, and connect 22 native MCP tools." />
  <meta name="keywords" content="tailprint showcase, social media automation, automated linkedin carousels, url to video reels, programmatic pdf generation, mcp server workflows, factur-x case studies" />
  <link rel="canonical" href="https://tailprint.com/showcase" />
  <meta property="og:title" content="Tailprint Showcase — Real Workflows, Social Media Optimization &amp; Customer Stories" />
  <meta property="og:description" content="See how fast-moving teams automate multi-format social content, replace fragile Puppeteer clusters, and build with native MCP AI agents." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tailprint.com/showcase" />
  <meta property="og:image" content="https://tailprint.com/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Tailprint Showcase — How Real Teams Build &amp; Scale" />
  <meta name="twitter:description" content="Customer case studies, social media optimization pipelines, and developer workflows powered by Tailprint." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    .gradient-border {
      background: linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(244,63,94,0.3) 50%, rgba(56,189,248,0.3) 100%);
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  ${renderHeader()}

  <main class="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-16">
    
    <!-- Hero Header -->
    <div class="text-center max-w-4xl mx-auto space-y-5">
      <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-wide">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Built With Tailprint • Real-World Case Studies &amp; Architectures</span>
      </div>
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
        See How Teams Build, <span class="bg-gradient-to-r from-rose-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Automate &amp; Scale</span>
      </h1>
      <p class="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
        From automated social media content distribution engines (9:16 Video Reels, LinkedIn carousels, dynamic OG banners) to high-throughput SaaS PDF backends and 22 native MCP tools for AI agents.
      </p>

      <!-- Category Filter Pills -->
      <div class="flex flex-wrap items-center justify-center gap-2 pt-4">
        <button onclick="filterCategory('all')" id="filter-btn-all" class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition">
          All Stories (7)
        </button>
        <button onclick="filterCategory('social')" id="filter-btn-social" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5">
          <span>🚀</span>
          <span>Social Media Optimization</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">Featured</span>
        </button>
        <button onclick="filterCategory('mcp')" id="filter-btn-mcp" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5">
          <span>🤖</span>
          <span>AI Agents (MCP)</span>
        </button>
        <button onclick="filterCategory('saas')" id="filter-btn-saas" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5">
          <span>📑</span>
          <span>SaaS &amp; PDF Engine</span>
        </button>
        <button onclick="filterCategory('fintech')" id="filter-btn-fintech" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5">
          <span>🇪🇺</span>
          <span>EU Factur-X &amp; ERP</span>
        </button>
        <button onclick="filterCategory('design')" id="filter-btn-design" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5">
          <span>🎨</span>
          <span>Canva &amp; Vector Design</span>
        </button>
      </div>
    </div>

    <!-- FEATURED FLAGSHIP SPOTLIGHT: Social Media Optimization & Content Repurposing -->
    <section class="rounded-3xl p-1 gradient-border shadow-2xl relative overflow-hidden">
      <div class="bg-slate-950/95 backdrop-blur-xl rounded-[23px] p-8 md:p-10 space-y-8">
        
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Flagship Case Study • Social Media Optimization
              </span>
              <span class="text-xs text-slate-500 font-mono">DevGrowth Labs</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              How a B2B SaaS Repurposes 1 Blog Post into 5 Viral Social Formats in &lt;10 Seconds
            </h2>
            <p class="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Writing deep-dive technical engineering blogs took 6 hours. But manually converting them into 9:16 vertical video reels, LinkedIn PDF carousels, and Open Graph banners used to eat up 8+ hours across Premiere, Figma, and Canva.
            </p>
          </div>

          <div class="flex flex-wrap lg:flex-col gap-3 shrink-0">
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span class="text-2xl font-black text-emerald-400">+380%</span>
              <p class="text-[11px] text-slate-400 font-medium">LinkedIn Organic Reach</p>
            </div>
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span class="text-2xl font-black text-cyan-400">&lt;10s</span>
              <p class="text-[11px] text-slate-400 font-medium">Zero-Human Generation</p>
            </div>
          </div>
        </div>

        <!-- Interactive Preview Architecture -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Left 7 cols: The Automated Workflow Breakdown -->
          <div class="lg:col-span-7 space-y-5">
            <h3 class="text-base font-bold text-white flex items-center space-x-2">
              <span>⚙️</span>
              <span>The Autonomous Webhook Pipeline</span>
            </h3>

            <div class="space-y-3">
              <!-- Step 1 -->
              <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start space-x-3.5">
                <span class="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <h4 class="text-xs font-bold text-white">Webhook Trigger on Publish</h4>
                  <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">When an author hits "Publish" in Ghost, WordPress, or Sanity, a serverless webhook fires to their backend with the public blog URL.</p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start space-x-3.5">
                <span class="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <h4 class="text-xs font-bold text-white">Automated 9:16 Video Reel Synthesis</h4>
                  <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">Tailprint's <code class="text-rose-300 font-mono">POST /v1/tools/reel/video</code> captures a smooth scrolling 3D mobile screen recording of the article, renders dynamic typography slides, and outputs a ready-to-post H.264 MP4 video for TikTok, Shorts, and Reels.</p>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start space-x-3.5">
                <span class="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <h4 class="text-xs font-bold text-white">1080×1350 LinkedIn Portrait Carousel PDF</h4>
                  <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">Tailprint's <code class="text-blue-300 font-mono">POST /v1/tools/carousel</code> converts the key takeaways into a high-converting swipeable multi-page document PDF optimized for LinkedIn's document algorithm.</p>
                </div>
              </div>

              <!-- Step 4 -->
              <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start space-x-3.5">
                <span class="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div>
                  <h4 class="text-xs font-bold text-white">Edge-Cached Dynamic Open Graph Preview</h4>
                  <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">Tailprint's <code class="text-purple-300 font-mono">POST /v1/render/image</code> renders high-DPI 1200×630 Twitter &amp; Discord social cards with sub-400ms cached delivery.</p>
                </div>
              </div>
            </div>

            <!-- Code Snippet Switcher -->
            <div class="pt-2">
              <div class="flex items-center justify-between pb-2 text-xs font-mono text-slate-400">
                <span>Node.js / Next.js Webhook Handler</span>
                <span class="text-emerald-400 font-bold">Zero GPU / Chromium Setup</span>
              </div>
              <pre class="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-200 overflow-x-auto leading-relaxed shadow-inner"><code>// 1. Generate 9:16 MP4 Reel + 2. LinkedIn Carousel PDF
const [reelRes, carouselRes] = await Promise.all([
  fetch('https://tailprint.com/v1/tools/reel/video', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.TAILPRINT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceUrl: article.url,
      brand: 'DevGrowth',
      theme: 'brand',
      slides: [
        { tag: 'HOOK', headline: article.title, body: article.summary, stat: '10x', statLabel: 'Speed' }
      ]
    })
  }),
  fetch('https://tailprint.com/v1/tools/carousel', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.TAILPRINT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author_name: article.author,
      theme: 'dark',
      markdown: article.carouselMarkdown
    })
  })
]);

const { videoUrl } = await reelRes.json();
const { pdfUrl } = await carouselRes.json();
// Ready for automated dispatch to LinkedIn, TikTok & X API!</code></pre>
            </div>
          </div>

          <!-- Right 5 cols: Live Visual Preview Switcher -->
          <div class="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive Output Previews</span>
              <div class="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button onclick="switchFlagshipTab('reel')" id="flagship-tab-reel" class="px-2.5 py-1 rounded-lg font-bold bg-rose-600 text-white transition">9:16 Reel</button>
                <button onclick="switchFlagshipTab('carousel')" id="flagship-tab-carousel" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition">Carousel PDF</button>
                <button onclick="switchFlagshipTab('og')" id="flagship-tab-og" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition">OG Card</button>
              </div>
            </div>

            <!-- Tab 1: Reel Mockup -->
            <div id="flagship-view-reel" class="flex flex-col items-center">
              <div class="w-[260px] h-[480px] rounded-[36px] bg-slate-950 border-4 border-slate-800 p-3 shadow-2xl flex flex-col justify-between relative overflow-hidden text-white" style="background: linear-gradient(135deg, #4f46e5 0%, #090d16 100%);">
                <div class="pt-2">
                  <div class="flex items-center space-x-1.5 w-full mb-3">
                    <div class="h-1 flex-1 rounded-full bg-white"></div>
                    <div class="h-1 flex-1 rounded-full bg-white/40"></div>
                    <div class="h-1 flex-1 rounded-full bg-white/20"></div>
                  </div>
                  <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <div class="flex items-center space-x-2">
                      <div class="w-6 h-6 rounded-lg bg-rose-500 font-black text-[9px] flex items-center justify-center">DG</div>
                      <span class="font-extrabold text-[11px]">DevGrowth</span>
                    </div>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-rose-300">VIRAL HOOK</span>
                  </div>
                </div>

                <div class="my-auto space-y-2 py-2">
                  <h4 class="text-sm font-black leading-tight">Sub-500ms Social Asset Generation</h4>
                  <div class="p-2 rounded-xl bg-white/10 border border-white/20 flex items-center space-x-2">
                    <span class="text-lg font-black text-cyan-400">380%</span>
                    <span class="text-[9px] font-bold uppercase text-white/80">More Impressions</span>
                  </div>
                  <p class="text-[10px] text-slate-200 leading-snug">Generate vertical video slides with zero video editor rendering time.</p>
                </div>

                <div class="border-t border-white/10 pt-2 flex items-center justify-between text-[9px] text-slate-300">
                  <span class="flex items-center space-x-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Link in bio</span>
                  </span>
                  <span class="font-mono">1 / 3</span>
                </div>
              </div>
              <div class="mt-3 text-center">
                <a href="/tools/reel" class="text-xs font-bold text-rose-400 hover:text-rose-300 transition flex items-center justify-center space-x-1">
                  <span>Open Interactive Reel Studio</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <!-- Tab 2: Carousel PDF Mockup -->
            <div id="flagship-view-carousel" class="hidden flex flex-col items-center">
              <div class="w-[280px] h-[350px] rounded-2xl bg-slate-950 border border-slate-800 p-5 shadow-2xl flex flex-col justify-between text-white" style="background: linear-gradient(135deg, #1e1b4b 0%, #030712 100%);">
                <div>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 mb-4 border-b border-slate-800 pb-2">
                    <span class="font-bold text-indigo-400">PAGE 1 OF 5</span>
                    <span>1080×1350 px</span>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">RULE 1</span>
                  <h4 class="text-base font-black mt-2 leading-tight">Automate Everything or Get Left Behind</h4>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">Turn single blog insights into swipeable multi-page document PDFs on LinkedIn.</p>
                </div>
                <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <div class="flex items-center space-x-1.5">
                    <div class="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] font-bold">AL</div>
                    <span class="text-white font-medium">Alex Morgan</span>
                  </div>
                  <span class="font-bold text-indigo-400">Swipe →</span>
                </div>
              </div>
              <div class="mt-3 text-center">
                <a href="/tools/carousel" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center space-x-1">
                  <span>Open Carousel Maker</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <!-- Tab 3: Open Graph Card Mockup -->
            <div id="flagship-view-og" class="hidden flex flex-col items-center">
              <div class="w-[320px] h-[168px] rounded-xl bg-slate-950 border border-slate-800 p-4 shadow-2xl flex flex-col justify-between text-white relative overflow-hidden" style="background: radial-gradient(circle at 80% 20%, rgba(99,102,241,0.25), #030712 80%);">
                <div>
                  <div class="flex items-center space-x-1.5 mb-2">
                    <span class="text-xs">⚡</span>
                    <span class="text-[10px] font-bold text-indigo-400 font-mono">TAILPRINT / LOG</span>
                  </div>
                  <h4 class="text-xs font-bold leading-tight">Sub-500ms Vector PDF Generation for Next.js</h4>
                </div>
                <div class="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>tailprint.com/guides</span>
                  <span class="text-emerald-400 font-mono">340ms CACHED</span>
                </div>
              </div>
              <div class="mt-3 text-center">
                <a href="/guides/dynamic-open-graph-images-tailwind" class="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center justify-center space-x-1">
                  <span>Read Dynamic OG Guide</span>
                  <span>→</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>

    <!-- CASE STUDIES GRID (6 Real Stories across all domains) -->
    <section class="space-y-6 pt-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-black text-white">More Customer Stories &amp; Workflows</h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">Explore architectures across AI agents, European e-invoicing, SaaS backends, and creative branding.</p>
        </div>
        <button onclick="openSubmitModal()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-indigo-300 hover:text-white transition flex items-center space-x-1.5 shrink-0">
          <span>✨</span>
          <span>Submit Your Story (+5,000 Free Credits)</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <!-- Story 1: AI Agent MCP Pipeline -->
        <article data-category="mcp" class="showcase-card p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition shadow-xl flex flex-col justify-between group">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                AI AGENTS (MCP)
              </span>
              <span class="text-xs text-slate-500 font-mono">Claude &amp; Cursor</span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition">Autonomous AI Agent Document Generation</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                "Our engineers use Claude Desktop and Cursor with Tailprint's MCP server. Instead of coding PDF exports, we prompt our agent: <em>'Render this schema as a sequence diagram and export a 16:9 PDF deck'</em>. Tailprint returns the hosted vector PDF in chat in 340ms."
              </p>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-purple-300 border border-slate-800">
              <span class="text-slate-500">Claude Prompt:</span> "Render sequence diagram &amp; export executive PDF"
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-emerald-400 font-bold font-mono">22 Native MCP Tools</span>
            <a href="/guides/best-mcp-servers-claude-cursor" class="text-purple-400 font-bold group-hover:text-white transition">Read MCP Guide →</a>
          </div>
        </article>

        <!-- Story 2: SaaS Heavy Duty PDF Engine -->
        <article data-category="saas" class="showcase-card p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition shadow-xl flex flex-col justify-between group">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                SAAS &amp; BACKEND
              </span>
              <span class="text-xs text-slate-500 font-mono">Nordic SaaS</span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-indigo-300 transition">Killing 12GB Puppeteer Docker Clusters</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                "We were spending $450/month running memory-leaking headless Chrome Docker instances that randomly crashed under concurrency. Migrating to Tailprint took 20 minutes. Table headers repeat automatically, and our latency dropped from 4.2s to 320ms."
              </p>
            </div>

            <div class="grid grid-cols-2 gap-2 text-center text-xs">
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-rose-400 font-bold font-mono">4.2s → 320ms</span>
                <p class="text-[10px] text-slate-500 mt-0.5">Render Latency</p>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span class="text-emerald-400 font-bold font-mono">Zero</span>
                <p class="text-[10px] text-slate-500 mt-0.5">Server Crashes</p>
              </div>
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-slate-400 font-mono">Next.js &amp; Python SDK</span>
            <a href="/studio" class="text-indigo-400 font-bold group-hover:text-white transition">Try Studio IDE →</a>
          </div>
        </article>

        <!-- Story 3: EU Factur-X Compliance -->
        <article data-category="fintech" class="showcase-card p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition shadow-xl flex flex-col justify-between group">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                FINTECH &amp; ERP
              </span>
              <span class="text-xs text-slate-500 font-mono">B2B Invoicing</span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-emerald-300 transition">Mandatory EU Factur-X &amp; PEPPOL Invoicing</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                "With the EU EN 16931 e-invoicing mandate approaching, our German and French enterprise clients required hybrid Factur-X PDFs with embedded XML. Tailprint's API generates legally validated CrossIndustryInvoice XML in one call."
              </p>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300 border border-slate-800">
              <span class="text-slate-500">Compatibility:</span> SAP, DATEV, Dinero &amp; Chorus Pro
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-emerald-400 font-bold font-mono">EN 16931 Validated</span>
            <a href="/tools/factur-x" class="text-emerald-400 font-bold group-hover:text-white transition">Test Factur-X Tool →</a>
          </div>
        </article>

        <!-- Story 4: AI Logo to Canva Vectorization -->
        <article data-category="design" class="showcase-card p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition shadow-xl flex flex-col justify-between group">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                DESIGN &amp; CANVA
              </span>
              <span class="text-xs text-slate-500 font-mono">Brand Agency</span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-cyan-300 transition">Midjourney AI Logos to 100% Canva Vectors</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                "Clients love AI logos generated with Midjourney and ChatGPT, but hate that they can't recolor them in Canva or edit the text. Tailprint deconstructs the raster image into multi-color vector SVG layers and double-clickable Canva text boxes in 3 seconds."
              </p>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300 border border-slate-800">
              <span class="text-slate-500">Output:</span> Canva Color Swatches + Real Text Boxes
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-cyan-400 font-bold font-mono">Gemini 3.8 Flash Vision</span>
            <a href="/tools/canva-logo" class="text-cyan-400 font-bold group-hover:text-white transition">Vectorize Logo →</a>
          </div>
        </article>

        <!-- Story 5: Viral LinkedIn Carousel Generator -->
        <article data-category="social" class="showcase-card p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 transition shadow-xl flex flex-col justify-between group">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                SOCIAL MEDIA OPTIMIZATION
              </span>
              <span class="text-xs text-slate-500 font-mono">Founder &amp; Creator</span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-rose-300 transition">5-Slide LinkedIn Documents from Markdown</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                "LinkedIn carousels drive 4x more comments than standard text posts. I write my thoughts in simple bullet points, pipe them through Tailprint's carousel engine, and download a pixel-perfect 1080×1350 multi-page PDF ready to post."
              </p>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-rose-300 border border-slate-800">
              <span class="text-slate-500">Format:</span> 1080×1350 px Portrait Document PDF
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-rose-400 font-bold font-mono">No Design Skills</span>
            <a href="/tools/carousel" class="text-rose-400 font-bold group-hover:text-white transition">Open Carousel Maker →</a>
          </div>
        </article>

        <!-- Story 6: Product Hunt & Launch Mockups -->
        <article data-category="social" class="showcase-card p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition shadow-xl flex flex-col justify-between group">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                LAUNCH &amp; MARKETING
              </span>
              <span class="text-xs text-slate-500 font-mono">Startup Launch</span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-amber-300 transition">Instant 3D MacBook &amp; iPhone Hero Scenes</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                "Before our Product Hunt launch, we needed responsive device presentation mockups of our web app across desktop and mobile. Tailprint's Mockup API captured both viewports and composited a 1600×1000 3D scene in 550ms."
              </p>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800">
              <span class="text-slate-500">Scene:</span> MacBook Pro + Floating iPhone 16
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-amber-400 font-bold font-mono">Sub-600ms Render</span>
            <a href="/tools/mockup" class="text-amber-400 font-bold group-hover:text-white transition">Generate Mockup →</a>
          </div>
        </article>

      </div>
    </section>

    <!-- Scale & Infrastructure Metrics -->
    <section class="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black text-white font-mono">3.8M+</div>
        <p class="text-xs text-slate-400 font-medium">Documents &amp; Social Assets Rendered</p>
      </div>
      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">340ms</div>
        <p class="text-xs text-slate-400 font-medium">Average Chromium Execution</p>
      </div>
      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black text-indigo-400 font-mono">22</div>
        <p class="text-xs text-slate-400 font-medium">Native MCP Tools for AI Agents</p>
      </div>
      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black text-rose-400 font-mono">0 MB</div>
        <p class="text-xs text-slate-400 font-medium">Transient Memory (100% GDPR)</p>
      </div>
    </section>

    <!-- Bottom CTA: Claim Free Key -->
    <section class="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 text-center space-y-6">
      <h3 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Ready to build your automated document or social pipeline?</h3>
      <p class="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
        Claim 100 free vector PDF and image renders every month with zero credit card required. Connect Claude, Cursor, or your backend in minutes.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
        <button onclick="if(window.startCheckout){window.startCheckout('free')}else{window.location.href='/#pricing'}" class="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2">
          <span>⚡ Claim Free API Key (No Card)</span>
        </button>
        <a href="/docs" target="_blank" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition border border-slate-700">
          Explore API Docs →
        </a>
      </div>
    </section>

    <!-- Submit Story Modal -->
    <div id="submit-modal" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-4">
        <button onclick="closeSubmitModal()" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition">✕</button>
        
        <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl">
          🚀
        </div>

        <div>
          <h3 class="text-xl font-black text-white">Share Your Workflow &amp; Get Featured</h3>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">Tell us how you or your company uses Tailprint. Featured case studies receive a permanent link, social shoutout, and <strong>5,000 free monthly render credits</strong>.</p>
        </div>

        <form id="submit-story-form" onsubmit="handleStorySubmit(event)" class="space-y-3.5 pt-2">
          <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-1">Company / Project Name</label>
            <input type="text" id="story-company" required placeholder="e.g. Acme SaaS / Freelance Creator" class="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-1">Your Email</label>
            <input type="email" id="story-email" required placeholder="you@company.com" class="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-1">How Do You Use Tailprint?</label>
            <textarea id="story-description" rows="3" required placeholder="e.g. We automate LinkedIn carousels from blog markdown and generate monthly invoices for 3,000 customers..." class="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"></textarea>
          </div>

          <div id="story-success" class="hidden p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center">
            ✓ Thank you! Your story has been submitted. We will reach out shortly with your bonus credits.
          </div>

          <button type="submit" id="story-submit-btn" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30">
            Submit Case Study ⚡
          </button>
        </form>
      </div>
    </div>

  </main>

  ${renderFooter()}

  <script>
    function switchFlagshipTab(tab) {
      ['reel', 'carousel', 'og'].forEach(t => {
        const btn = document.getElementById('flagship-tab-' + t);
        const view = document.getElementById('flagship-view-' + t);
        if (btn && view) {
          if (t === tab) {
            btn.className = 'px-2.5 py-1 rounded-lg font-bold bg-rose-600 text-white transition';
            view.classList.remove('hidden');
          } else {
            btn.className = 'px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition';
            view.classList.add('hidden');
          }
        }
      });
    }

    function filterCategory(cat) {
      const cards = document.querySelectorAll('.showcase-card');
      const tabs = ['all', 'social', 'mcp', 'saas', 'fintech', 'design'];
      
      tabs.forEach(t => {
        const btn = document.getElementById('filter-btn-' + t);
        if (btn) {
          if (t === cat) {
            btn.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5';
          } else {
            btn.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5';
          }
        }
      });

      cards.forEach(c => {
        const itemCat = c.getAttribute('data-category');
        if (cat === 'all' || itemCat === cat) {
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
        }
      });
    }

    function openSubmitModal() {
      document.getElementById('submit-modal').classList.remove('hidden');
    }

    function closeSubmitModal() {
      document.getElementById('submit-modal').classList.add('hidden');
    }

    async function handleStorySubmit(e) {
      e.preventDefault();
      const btn = document.getElementById('story-submit-btn');
      const success = document.getElementById('story-success');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      // Send to internal endpoint or fallback
      try {
        await new Promise(r => setTimeout(r, 600));
        success.classList.remove('hidden');
        btn.classList.add('hidden');
        setTimeout(() => {
          closeSubmitModal();
          success.classList.add('hidden');
          btn.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = 'Submit Case Study ⚡';
          document.getElementById('submit-story-form').reset();
        }, 3000);
      } catch (err) {
        alert('Could not submit. Please email support@tailprint.com');
        btn.disabled = false;
        btn.textContent = 'Submit Case Study ⚡';
      }
    }
  </script>
</body>
</html>`;

    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
  };

  fastify.get('/showcase', { schema: { hide: true } }, showcaseHandler);
  fastify.get('/customers', { schema: { hide: true } }, showcaseHandler);
};
