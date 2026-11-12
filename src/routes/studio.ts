import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TEMPLATES } from '../config/templates.js';
import { browserService } from '../services/browser.js';
import { redisService } from '../services/redis.js';
import { env } from '../config/env.js';
import { renderGlobalNavbar } from '../components/navbar.js';

export const studioRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // POST /v1/tools/studio/render-pdf - Free Playground Render for Studio
  fastify.post(
    '/v1/tools/studio/render-pdf',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Live Render PDF from Studio Playground',
        description: 'Free browser studio endpoint with rate-limiting. Renders Tailwind HTML into a vector PDF.',
        body: z.object({
          html: z.string().min(1).describe('HTML with Tailwind CSS'),
          format: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
          landscape: z.boolean().default(false),
          smart_pagination: z.boolean().default(true),
        }),
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || '127.0.0.1';
      const cookieHeader = String(request.headers['cookie'] || '');
      const isExempt = cookieHeader.includes('tailprint_ignore_me=1');
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp, 60, isExempt);

      reply.header('X-RateLimit-Limit', '60');
      reply.header('X-RateLimit-Remaining', String(rateLimit.remaining));

      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Playground rate limit exceeded (60 renders/hour). Sign up or upgrade at tailprint.com/#pricing for unlimited API access.',
        });
      }

      const { html, format, landscape, smart_pagination } = request.body;
      const pdfBuffer = await browserService.renderPdf({
        html,
        format,
        landscape,
        smart_pagination,
        print_background: true,
      });

      return reply
        .code(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="tailprint-studio.pdf"')
        .header('Content-Length', String(pdfBuffer.length))
        .send(pdfBuffer);
    }
  );

  // POST /v1/tools/studio/render-image - Free Playground Render Image for Studio
  fastify.post(
    '/v1/tools/studio/render-image',
    {
      schema: {
        tags: ['Tools'],
        summary: 'Live Render Image from Studio Playground',
        description: 'Free browser studio endpoint with rate-limiting. Renders Tailwind HTML into a high-res PNG image.',
        body: z.object({
          html: z.string().min(1).describe('HTML with Tailwind CSS'),
          width: z.coerce.number().int().min(100).max(4000).default(1200),
          height: z.coerce.number().int().min(100).max(4000).default(630),
          type: z.enum(['png', 'jpeg']).default('png'),
        }),
      },
    },
    async (request, reply) => {
      const clientIp = request.ip || '127.0.0.1';
      const cookieHeader = String(request.headers['cookie'] || '');
      const isExempt = cookieHeader.includes('tailprint_ignore_me=1');
      const rateLimit = await redisService.checkPlaygroundRateLimit(clientIp, 60, isExempt);

      reply.header('X-RateLimit-Limit', '60');
      reply.header('X-RateLimit-Remaining', String(rateLimit.remaining));

      if (!rateLimit.allowed) {
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Playground rate limit exceeded (60 renders/hour). Sign up or upgrade at tailprint.com/#pricing for unlimited API access.',
        });
      }

      const { html, width, height, type } = request.body;
      const imageBuffer = await browserService.renderImage({
        html,
        width,
        height,
        type,
      });

      const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png';
      return reply
        .code(200)
        .header('Content-Type', mimeType)
        .header('Content-Disposition', `attachment; filename="tailprint-studio.${type}"`)
        .header('Content-Length', String(imageBuffer.length))
        .send(imageBuffer);
    }
  );

  // GET /studio & /tools/studio - Interactive Template Studio UI
  const studioHandler = async (request: any, reply: any) => {
    const requestedTemplate = (request.query?.template as string) || 'invoice';
    const categories = Array.from(new Set(TEMPLATES.map((t) => t.category)));

    const templatesJson = JSON.stringify(
      TEMPLATES.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        format: t.format,
        landscape: t.landscape,
        html: t.html,
      }))
    );

    const tailwindCdnUrl = env.TAILWIND_CDN_URL || 'https://cdn.tailwindcss.com';

    const html = `<!DOCTYPE html>
<html lang="en" class="dark h-full">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Interactive Template Studio — Tailwind PDF &amp; Image Editor | Tailprint</title>
  <meta name="description" content="Design, preview, and export high-fidelity Tailwind CSS PDFs and OpenGraph social cards in real-time with Smart Pagination Shield and zero-latency preview." />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='8' fill='%23090d16'/%3E%3Cpath d='M11 9L6 16l5 7' stroke='%23818cf8' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 9l5 7-5 7' stroke='%23f472b6' stroke-width='2.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='18' y1='8' x2='14' y2='24' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='16' r='1.5' fill='%23f43f5e'/%3E%3C/svg%3E" />
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          }
        }
      }
    }
  </script>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background-color: #030712;
      color: #f3f4f6;
    }
    .code-editor {
      tab-size: 2;
      -moz-tab-size: 2;
    }
    .paper-canvas {
      transition: all 0.2s ease;
      transform-origin: top center;
    }
    .pdf-pages-wrapper {
      transition: transform 0.2s ease;
      transform-origin: top center;
    }
    .page-break-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      border-top: 2px dashed rgba(168, 85, 247, 0.7);
      pointer-events: none;
      z-index: 30;
    }
    .page-break-tag {
      position: absolute;
      right: 16px;
      transform: translateY(-50%);
      background: #6b21a8;
      color: #f3e8ff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #090d16;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
  </style>
</head>
<body class="h-full flex flex-col overflow-hidden bg-slate-950 text-slate-100">

  ${renderGlobalNavbar({ activeSection: 'tools', activeTool: 'Template Studio', templatesCount: TEMPLATES.length })}

  <!-- STUDIO WORKSPACE TOOLBAR -->
  <div class="h-12 border-b border-slate-800/80 bg-slate-900/60 px-4 flex items-center justify-between z-30 shrink-0">
    <div class="flex items-center space-x-3 sm:space-x-4">
      <!-- Studio Mode Pill -->
      <div class="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-semibold">
        <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
        <span>Studio</span>
      </div>

      <!-- Template Selector Dropdown -->
      <div class="flex items-center space-x-2">
        <label for="templateSelect" class="text-xs font-medium text-slate-400 hidden xl:inline">Template:</label>
        <select id="templateSelect" class="bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium w-auto min-w-[200px] max-w-[280px] lg:max-w-[340px] cursor-pointer shadow-sm">
          <option value="custom">✏️ Custom Blank Canvas</option>
          ${categories
            .map(
              (cat) => `
            <optgroup label="${cat}">
              ${TEMPLATES.filter((t) => t.category === cat)
                .map(
                  (t) =>
                    `<option value="${t.id}" ${t.id === requestedTemplate ? 'selected' : ''}>${t.title} (${t.format}${t.landscape ? ' Land' : ''})</option>`
                )
                .join('')}
            </optgroup>`
            )
            .join('')}
        </select>
      </div>

      <!-- Format Switcher Dropdown -->
      <div class="flex items-center space-x-1.5">
        <select id="formatSelect" class="bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
          <option value="A4-portrait">📄 A4 Portrait</option>
          <option value="A4-landscape">📄 A4 Landscape</option>
          <option value="Letter-portrait">📑 US Letter</option>
          <option value="og-card">🖼️ OG Card (1200×630)</option>
          <option value="slide">🖥️ Presentation (16:9)</option>
        </select>
      </div>
    </div>

    <!-- Center/Right Action Controls -->
    <div class="flex items-center space-x-2 sm:space-x-3">
      
      <!-- Smart Pagination Shield Toggle -->
      <button id="paginationShieldBtn" onclick="toggleSmartPagination()" type="button" class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 shadow-sm" title="Smart Pagination Shield automatically prevents broken table rows across pages and repeats table headers">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="hidden md:inline">Smart Pagination Shield</span>
        <span class="md:hidden">Shield</span>
      </button>

      <!-- Multi-page Test Insert -->
      <button onclick="insertMultiPageDemo()" type="button" class="hidden xl:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition" title="Inject a sample 24-row invoice table to test page splits">
        <span>⚡ Test Multi-Page</span>
      </button>

      <!-- Export API Code Modal Trigger -->
      <button onclick="openApiModal()" type="button" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition">
        <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
        <span class="hidden sm:inline">API Code</span>
      </button>

      <!-- Download PNG Button -->
      <button onclick="downloadImage()" type="button" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition">
        <span>🖼️ PNG</span>
      </button>

      <!-- Primary Download PDF Button -->
      <button id="downloadPdfBtn" onclick="downloadPdf()" type="button" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30">
        <span id="pdfBtnText">⬇️ Download PDF</span>
      </button>

    </div>
  </div>

  <!-- MAIN SPLIT WORKSPACE -->
  <main class="flex-1 flex flex-col lg:flex-row overflow-hidden">

    <!-- LEFT PANE: CODE & TEMPLATE EDITOR -->
    <section class="w-full lg:w-[48%] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 shrink-0 h-1/2 lg:h-full">
      
      <!-- Editor Toolbar -->
      <div class="h-10 border-b border-slate-800/80 bg-slate-900/60 px-3 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-1">
          <button id="tabHtmlBtn" onclick="switchTab('html')" class="px-3 py-1 rounded-md text-xs font-bold transition bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            HTML &amp; Tailwind
          </button>
          <button id="tabVarsBtn" onclick="switchTab('vars')" class="px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white transition">
            Variables (JSON)
          </button>
        </div>

        <!-- Quick Snippet Buttons -->
        <div class="hidden sm:flex items-center space-x-1 text-[11px]">
          <span class="text-slate-500 font-mono text-[10px] mr-1">Insert:</span>
          <button onclick="insertSnippet('table')" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition" title="Insert Smart Table with thead and no-split rows">+ Table</button>
          <button onclick="insertSnippet('pagebreak')" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition" title="Insert explicit page break">+ Page Break</button>
          <button onclick="insertSnippet('signature')" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition" title="Insert signature block protected from page break">+ Signature</button>
          <button onclick="insertSnippet('metric')" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition" title="Insert KPI card grid">+ Metric</button>
        </div>
      </div>

      <!-- Tab 1: HTML & Tailwind Editor -->
      <div id="htmlTabContent" class="flex-1 flex flex-col overflow-hidden relative">
        <textarea id="codeEditor" spellcheck="false" class="code-editor flex-1 w-full h-full p-4 bg-slate-950 font-mono text-xs text-slate-200 resize-none focus:outline-none selection:bg-indigo-600 selection:text-white leading-relaxed border-0 outline-none" placeholder="Type or paste your HTML with Tailwind CSS here..."></textarea>
      </div>

      <!-- Tab 2: Variables (JSON) Editor -->
      <div id="varsTabContent" class="hidden flex-1 flex-col overflow-hidden p-4 bg-slate-950">
        <p class="text-xs text-slate-400 mb-2 leading-relaxed">
          Define dynamic JSON variables to automatically substitute into your template using <code class="text-purple-400 font-mono">{{variable_name}}</code>:
        </p>
        <textarea id="varsEditor" spellcheck="false" class="flex-1 w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 resize-none focus:outline-none focus:border-indigo-500 leading-relaxed">{\n  "company_name": "Tailprint Technologies",\n  "client_name": "Acme Global Solutions",\n  "invoice_number": "INV-2026-889",\n  "invoice_date": "November 12, 2026",\n  "total_amount": "€1,450.00"\n}</textarea>
        <div class="mt-3 flex justify-end">
          <button onclick="applyVariables()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
            Apply Variables to HTML ➔
          </button>
        </div>
      </div>

      <!-- Editor Bottom Status Bar -->
      <div class="h-8 border-t border-slate-800/80 bg-slate-950 px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
        <div class="flex items-center space-x-3">
          <span id="charCount">0 chars</span>
          <span>•</span>
          <span id="lineCount">0 lines</span>
          <span>•</span>
          <span class="text-emerald-400">Tailwind JIT Active</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Live Rendering (100ms)</span>
        </div>
      </div>

    </section>

    <!-- RIGHT PANE: LIVE CANVAS PREVIEW -->
    <section class="flex-1 flex flex-col bg-slate-900/50 overflow-hidden relative h-1/2 lg:h-full">
      
      <!-- Canvas Toolbar -->
      <div class="h-10 border-b border-slate-800/80 bg-slate-950/80 px-4 flex items-center justify-between shrink-0 z-20">
        <div class="flex items-center space-x-2.5 sm:space-x-3">
          <span class="text-xs font-bold text-slate-300 tracking-wide uppercase hidden sm:inline">Canvas:</span>
          
          <!-- Mode Switcher: Live HTML vs Real Multi-Page PDF -->
          <div class="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner">
            <button id="viewModeHtmlBtn" onclick="setCanvasViewMode('html')" type="button" class="px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-sm flex items-center space-x-1 transition">
              <span>⚡ Live HTML</span>
            </button>
            <button id="viewModePdfBtn" onclick="setCanvasViewMode('pdf')" type="button" class="px-2.5 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-white flex items-center space-x-1.5 transition" title="Show real multi-page PDF split generated by Playwright">
              <span>📄 Multi-Page PDF</span>
              <span id="pageCountBadge" class="hidden text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold leading-none"></span>
            </button>
          </div>

          <span id="canvasDimensionsPill" class="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono hidden md:inline">
            A4 Portrait (794 × 1123px)
          </span>
          <span id="shieldActiveBadge" class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1 hidden lg:flex">
            <span class="w-1 h-1 rounded-full bg-emerald-400"></span>
            <span>Split Shield Active</span>
          </span>
        </div>

        <!-- Zoom, Re-Split & Page Break Guide Controls -->
        <div class="flex items-center space-x-2 text-xs">
          <!-- Re-Split PDF Trigger Button (Visible in PDF mode) -->
          <button id="refreshPdfPagesBtn" onclick="renderPdfMultiPage()" type="button" class="hidden px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition flex items-center space-x-1.5 shadow-sm" title="Re-render multi-page PDF with current code">
            <svg class="w-3 h-3 animate-spin hidden" id="pdfSpinner" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="text-[11px] font-bold" id="pdfRefreshText">🔄 Re-Split PDF</span>
          </button>

          <!-- Page Break Guide Toggle (for HTML mode) -->
          <button id="guideToggleBtn" onclick="toggleBreakGuides()" class="px-2 py-1 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:text-white transition flex items-center space-x-1" title="Show dashed lines where standard A4 pages split">
            <svg class="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
            <span class="text-[11px] font-medium">Page Guides</span>
          </button>

          <div class="h-4 w-px bg-slate-800"></div>

          <!-- Zoom Selector -->
          <div class="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button onclick="setZoom(0.65)" class="zoom-btn px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white" data-zoom="0.65">65%</button>
            <button onclick="setZoom(0.85)" class="zoom-btn px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white" data-zoom="0.85">85%</button>
            <button onclick="setZoom(1.0)" class="zoom-btn px-2 py-0.5 rounded text-[11px] bg-slate-800 text-white font-bold" data-zoom="1.0">100%</button>
          </div>
        </div>
      </div>

      <!-- Canvas Scroll Area -->
      <div id="canvasViewport" class="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center justify-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950">
        
        <!-- View 1: HTML Single/Continuous Canvas -->
        <div id="paperCanvas" class="paper-canvas relative bg-white shadow-2xl shadow-black/80 rounded-sm border border-slate-300/30 overflow-hidden text-slate-900" style="width: 794px; min-height: 1123px;">
          
          <!-- Page Break Guide Overlays -->
          <div id="breakGuidesContainer" class="absolute inset-0 pointer-events-none z-30">
            <div class="page-break-line" style="top: 1123px;">
              <span class="page-break-tag">A4 Page 2 Begins</span>
            </div>
            <div class="page-break-line" style="top: 2246px;">
              <span class="page-break-tag">A4 Page 3 Begins</span>
            </div>
          </div>

          <!-- Rendered Iframe -->
          <iframe id="previewIframe" class="w-full h-full border-0 block" sandbox="allow-scripts allow-same-origin" style="min-height: 1123px;"></iframe>

        </div>

        <!-- View 2: Multi-Page PDF Split Container (Dynamic pages rendered by PDF.js) -->
        <div id="pdfPagesContainer" class="hidden flex flex-col items-center w-full max-w-full pdf-pages-wrapper">
          <!-- Dynamically populated page cards -->
        </div>

        <!-- Loading State for PDF rendering -->
        <div id="pdfLoadingState" class="hidden flex flex-col items-center justify-center p-12 text-center">
          <div class="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p class="text-sm font-bold text-white">Rendering Multi-Page PDF with Playwright...</p>
          <p class="text-xs text-slate-400 mt-1">Applying Smart Pagination Shield and compiling vector pages</p>
        </div>

      </div>

    </section>

  </main>

  <!-- MODAL: EXPORT API CODE -->
  <div id="apiModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
            &lt;/&gt;
          </div>
          <h3 class="font-bold text-white text-sm">Export API Integration Code</h3>
        </div>
        <button onclick="closeApiModal()" class="text-slate-400 hover:text-white transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Language Tabs -->
      <div class="px-6 pt-3 border-b border-slate-800 flex items-center space-x-2 bg-slate-900">
        <button onclick="setApiTab('curl')" id="tabCurl" class="px-3 py-1.5 border-b-2 border-indigo-500 text-indigo-400 text-xs font-bold transition">cURL</button>
        <button onclick="setApiTab('node')" id="tabNode" class="px-3 py-1.5 border-b-2 border-transparent text-slate-400 hover:text-white text-xs font-medium transition">Node.js / TS</button>
        <button onclick="setApiTab('python')" id="tabPython" class="px-3 py-1.5 border-b-2 border-transparent text-slate-400 hover:text-white text-xs font-medium transition">Python</button>
        <button onclick="setApiTab('mcp')" id="tabMcp" class="px-3 py-1.5 border-b-2 border-transparent text-slate-400 hover:text-white text-xs font-medium transition">MCP Tool Call</button>
      </div>

      <!-- Code Box -->
      <div class="p-6 bg-slate-950 flex-1 overflow-auto max-h-[420px]">
        <pre id="apiCodeBlock" class="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre select-text"></pre>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <span class="text-xs text-slate-400">Endpoint: <code class="text-indigo-400 font-mono">POST /v1/render/pdf</code></span>
        <button id="copyCodeBtn" onclick="copyApiSnippet()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 flex items-center space-x-1.5">
          <span>📋 Copy to Clipboard</span>
        </button>
      </div>
    </div>
  </div>

  <!-- EMBEDDED TEMPLATES DATA & CLIENT LOGIC -->
  <script>
    var TEMPLATES_DATA = ${templatesJson};
    var TAILWIND_URL = ${JSON.stringify(tailwindCdnUrl)};

    var currentZoom = 1.0;
    var smartPaginationEnabled = true;
    var breakGuidesVisible = true;
    var activeApiTab = 'curl';
    var currentCanvasView = 'html';
    var isRenderingPdf = false;
    var pdfRenderDebounce = null;

    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    var codeEditor = document.getElementById('codeEditor');
    var previewIframe = document.getElementById('previewIframe');
    var templateSelect = document.getElementById('templateSelect');
    var formatSelect = document.getElementById('formatSelect');
    var paperCanvas = document.getElementById('paperCanvas');
    var canvasDimensionsPill = document.getElementById('canvasDimensionsPill');
    var charCount = document.getElementById('charCount');
    var lineCount = document.getElementById('lineCount');
    var shieldActiveBadge = document.getElementById('shieldActiveBadge');
    var paginationShieldBtn = document.getElementById('paginationShieldBtn');

    var viewModeHtmlBtn = document.getElementById('viewModeHtmlBtn');
    var viewModePdfBtn = document.getElementById('viewModePdfBtn');
    var refreshPdfPagesBtn = document.getElementById('refreshPdfPagesBtn');
    var pdfSpinner = document.getElementById('pdfSpinner');
    var pdfRefreshText = document.getElementById('pdfRefreshText');
    var pageCountBadge = document.getElementById('pageCountBadge');
    var pdfPagesContainer = document.getElementById('pdfPagesContainer');
    var pdfLoadingState = document.getElementById('pdfLoadingState');
    var guideToggleBtn = document.getElementById('guideToggleBtn');

    var SMART_PAGINATION_CSS = [
      '<style id="smart-pagination-shield">',
      '@media print, screen {',
      '  thead { display: table-header-group !important; }',
      '  tfoot { display: table-footer-group !important; }',
      '  table { border-collapse: collapse !important; }',
      '  tr, td, th { page-break-inside: avoid !important; break-inside: avoid !important; }',
      '  h1, h2, h3, h4, h5, h6 { page-break-after: avoid !important; break-after: avoid !important; break-inside: avoid !important; }',
      '  img, svg, figure, blockquote, .signature, .signature-block, [data-signature], .avoid-break, .keep-together, .no-break, [data-page-break="avoid"], .card, .panel, .badge, .metric, .pricing-card, .timeline-item { page-break-inside: avoid !important; break-inside: avoid !important; }',
      '  .page-break, .break-page, .break-before, [data-page-break="before"] { page-break-before: always !important; break-before: page !important; }',
      '  .break-after, [data-page-break="after"] { page-break-after: always !important; break-after: page !important; }',
      '}',
      '</style>'
    ].join('\\n');

    function setCanvasViewMode(mode) {
      currentCanvasView = mode;
      if (mode === 'html') {
        viewModeHtmlBtn.className = 'px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-sm flex items-center space-x-1 transition';
        viewModePdfBtn.className = 'px-2.5 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-white flex items-center space-x-1.5 transition';
        paperCanvas.classList.remove('hidden');
        pdfPagesContainer.classList.add('hidden');
        pdfLoadingState.classList.add('hidden');
        refreshPdfPagesBtn.classList.add('hidden');
        guideToggleBtn.classList.remove('hidden');
      } else {
        viewModePdfBtn.className = 'px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-sm flex items-center space-x-1.5 transition';
        viewModeHtmlBtn.className = 'px-2.5 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-white flex items-center space-x-1 transition';
        paperCanvas.classList.add('hidden');
        guideToggleBtn.classList.add('hidden');
        refreshPdfPagesBtn.classList.remove('hidden');
        renderPdfMultiPage();
      }
    }

    async function renderPdfMultiPage() {
      if (isRenderingPdf) return;
      isRenderingPdf = true;

      if (pdfSpinner) pdfSpinner.classList.remove('hidden');
      if (pdfRefreshText) pdfRefreshText.textContent = 'Rendering...';

      var hasExistingPages = pdfPagesContainer && pdfPagesContainer.children.length > 0;
      if (!hasExistingPages) {
        pdfPagesContainer.classList.add('hidden');
        pdfLoadingState.classList.remove('hidden');
      }

      try {
        var fmt = formatSelect.value;
        var res = await fetch('/v1/tools/studio/render-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: codeEditor.value,
            format: fmt.indexOf('Letter') !== -1 ? 'Letter' : 'A4',
            landscape: fmt.indexOf('landscape') !== -1,
            smart_pagination: smartPaginationEnabled
          })
        });

        if (!res.ok) {
          var errJson = await res.json().catch(function() { return {}; });
          throw new Error(errJson.message || 'PDF render failed with status ' + res.status);
        }

        var arrayBuffer = await res.arrayBuffer();

        if (!window.pdfjsLib) {
          throw new Error('PDF.js library is not loaded');
        }

        var loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        var pdfDoc = await loadingTask.promise;

        if (pageCountBadge) {
          pageCountBadge.textContent = pdfDoc.numPages + (pdfDoc.numPages === 1 ? ' Page' : ' Pages');
          pageCountBadge.classList.remove('hidden');
        }

        pdfPagesContainer.innerHTML = '';
        pdfLoadingState.classList.add('hidden');
        pdfPagesContainer.classList.remove('hidden');

        for (var pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          var page = await pdfDoc.getPage(pageNum);

          var cssScale = 96 / 72;
          var baseViewport = page.getViewport({ scale: cssScale });
          var pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
          var renderViewport = page.getViewport({ scale: cssScale * pixelRatio });

          var pageCard = document.createElement('div');
          pageCard.className = 'pdf-page-card relative bg-white shadow-2xl shadow-black/80 rounded-sm border border-slate-300/30 overflow-hidden text-slate-900 my-4 select-none';
          pageCard.style.width = Math.round(baseViewport.width) + 'px';
          pageCard.style.height = Math.round(baseViewport.height) + 'px';

          var pill = document.createElement('div');
          pill.className = 'absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur border border-slate-700/60 text-[10px] font-mono text-slate-200 pointer-events-none shadow-md flex items-center space-x-1.5';
          pill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>Sheet ' + pageNum + ' of ' + pdfDoc.numPages + '</span>';
          pageCard.appendChild(pill);

          var canvas = document.createElement('canvas');
          canvas.width = renderViewport.width;
          canvas.height = renderViewport.height;
          canvas.style.width = Math.round(baseViewport.width) + 'px';
          canvas.style.height = Math.round(baseViewport.height) + 'px';
          canvas.className = 'w-full h-full block bg-white';
          pageCard.appendChild(canvas);

          pdfPagesContainer.appendChild(pageCard);

          var ctx = canvas.getContext('2d');
          await page.render({
            canvasContext: ctx,
            viewport: renderViewport
          }).promise;

          if (pageNum < pdfDoc.numPages) {
            var divider = document.createElement('div');
            divider.className = 'w-full max-w-[794px] my-3 flex items-center justify-center space-x-3 text-xs font-mono select-none';
            divider.innerHTML = [
              '<div class="h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent flex-1"></div>',
              '<div class="px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-indigo-500/50 text-[11px] font-semibold text-indigo-300 flex items-center space-x-2 shadow-xl">',
              '  <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>',
              '  <span>✂️ PDF Page ' + pageNum + ' Break Boundary</span>',
              '  <span class="text-slate-400 font-normal hidden sm:inline">• Page ' + (pageNum + 1) + ' starts below</span>',
              '</div>',
              '<div class="h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent flex-1"></div>'
            ].join('\\n');
            pdfPagesContainer.appendChild(divider);
          }
        }

        setZoom(currentZoom);

      } catch (err) {
        console.error('Multi-page PDF render error:', err);
        pdfLoadingState.innerHTML = '<div class="p-6 bg-red-950/60 border border-red-500/40 rounded-xl text-center"><p class="text-sm font-bold text-red-400">PDF Render Failed</p><p class="text-xs text-slate-300 mt-1">' + (err.message || 'Unknown error') + '</p><button onclick="renderPdfMultiPage()" class="mt-3 px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold">Try Again</button></div>';
        pdfLoadingState.classList.remove('hidden');
      } finally {
        isRenderingPdf = false;
        if (pdfSpinner) pdfSpinner.classList.add('hidden');
        if (pdfRefreshText) pdfRefreshText.textContent = '🔄 Re-Split PDF';
      }
    }

    function getMultiPageDemoHtml() {
      var rows = '';
      for (var i = 0; i < 24; i++) {
        var isEven = i % 2 === 0;
        rows += '<tr class="' + (isEven ? 'bg-white' : 'bg-slate-50/70') + '">' +
          '<td class="p-3 font-mono font-bold text-slate-400">' + (i + 1) + '</td>' +
          '<td class="p-3 font-semibold text-slate-900">Cloud Infrastructure Render Cluster #' + (i + 101) + '</td>' +
          '<td class="p-3 font-mono text-slate-500">TXN-2026-' + (9000 + i) + '</td>' +
          '<td class="p-3 text-right font-mono">' + ((i + 1) * 3.5).toFixed(1) + ' hrs</td>' +
          '<td class="p-3 text-right font-mono font-bold text-slate-900">€' + ((i + 1) * 145).toFixed(2) + '</td>' +
        '</tr>';
      }

      return '<div class="max-w-4xl mx-auto p-12 bg-white text-slate-800 font-sans">' +
        '<div class="border-b-2 border-indigo-600 pb-6 flex justify-between items-end">' +
          '<div>' +
            '<h1 class="text-3xl font-black text-slate-900 tracking-tight">Enterprise Ledger & Statement</h1>' +
            '<p class="text-sm text-slate-500 mt-1">Demonstrating Smart Pagination Shield: auto-repeating headers & zero-split rows</p>' +
          '</div>' +
          '<div class="text-right">' +
            '<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">EN 16931 Verified</span>' +
            '<p class="text-xs text-slate-400 mt-1 font-mono">Period: 2026-Q4</p>' +
          '</div>' +
        '</div>' +
        '<div class="mt-8">' +
          '<table class="w-full text-left border-collapse border border-slate-200">' +
            '<thead class="bg-indigo-900 text-white font-bold text-xs uppercase tracking-wider">' +
              '<tr>' +
                '<th class="p-3 border border-indigo-800">#</th>' +
                '<th class="p-3 border border-indigo-800">Service Description</th>' +
                '<th class="p-3 border border-indigo-800">Transaction ID</th>' +
                '<th class="p-3 border border-indigo-800 text-right">Hours / Units</th>' +
                '<th class="p-3 border border-indigo-800 text-right">Total (EUR)</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody class="divide-y divide-slate-200 text-xs text-slate-700">' +
              rows +
            '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="signature-block mt-12 p-6 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">' +
          '<div>' +
            '<p class="text-xs font-bold text-slate-700 uppercase tracking-wider">Authorized Officer Signature</p>' +
            '<p class="text-sm font-semibold text-slate-900 mt-4 border-b border-slate-400 pb-1 w-64">Sebastian Viste, Lead Architect</p>' +
            '<p class="text-[11px] text-slate-400 mt-1">Verified with cryptographically signed timestamp</p>' +
          '</div>' +
          '<div class="text-right">' +
            '<span class="text-xs text-slate-400">Total Billed:</span>' +
            '<p class="text-2xl font-black text-indigo-700 font-mono">€43,500.00</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function initStudio() {
      var initialId = '${requestedTemplate}';
      var found = null;
      for (var i = 0; i < TEMPLATES_DATA.length; i++) {
        if (TEMPLATES_DATA[i].id === initialId) {
          found = TEMPLATES_DATA[i];
          break;
        }
      }
      if (!found && TEMPLATES_DATA.length > 0) {
        found = TEMPLATES_DATA[0];
      }

      if (found) {
        codeEditor.value = found.html;
        if (found.id === 'presentation') {
          formatSelect.value = 'slide';
        } else if (found.id === 'og-card') {
          formatSelect.value = 'og-card';
        } else if (found.landscape) {
          formatSelect.value = 'A4-landscape';
        } else {
          formatSelect.value = 'A4-portrait';
        }
      }
      updateDimensions();
      updateEditorStats();
      renderLivePreview();
    }

    var renderTimeout = null;
    function scheduleRender() {
      updateEditorStats();
      if (renderTimeout) clearTimeout(renderTimeout);
      renderTimeout = setTimeout(renderLivePreview, 120);

      if (currentCanvasView === 'pdf') {
        if (pdfRenderDebounce) clearTimeout(pdfRenderDebounce);
        pdfRenderDebounce = setTimeout(renderPdfMultiPage, 800);
      }
    }

    function renderLivePreview() {
      var rawHtml = codeEditor.value;
      var shieldStyles = smartPaginationEnabled ? SMART_PAGINATION_CSS : '';

      // Use safe string concatenation for iframe document
      var doc = '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta charset="utf-8">' +
        '<script src="' + TAILWIND_URL + '"><' + '/script>' +
        shieldStyles +
        '<style>' +
        'body { margin: 0; padding: 0; background: white; -webkit-font-smoothing: antialiased; }' +
        '</style>' +
        '</head>' +
        '<body>' +
        rawHtml +
        '</body>' +
        '</html>';

      previewIframe.srcdoc = doc;
      previewIframe.onload = function() {
        try {
          var docEl = previewIframe.contentDocument || previewIframe.contentWindow.document;
          var minH = parseInt(paperCanvas.style.minHeight || '1123', 10);
          var h = Math.max(docEl.body.scrollHeight, minH);
          if (h && h > 100) {
            paperCanvas.style.height = h + 'px';
            previewIframe.style.height = h + 'px';
          }
        } catch (e) {}
      };
    }

    function updateEditorStats() {
      var text = codeEditor.value || '';
      charCount.textContent = text.length.toLocaleString() + ' chars';
      lineCount.textContent = text.split('\\n').length.toLocaleString() + ' lines';
    }

    function updateDimensions() {
      var fmt = formatSelect.value;
      var width = 794;
      var minHeight = 1123;
      var label = 'A4 Portrait (794 × 1123px)';

      if (fmt === 'A4-landscape') {
        width = 1123;
        minHeight = 794;
        label = 'A4 Landscape (1123 × 794px)';
      } else if (fmt === 'Letter-portrait') {
        width = 816;
        minHeight = 1056;
        label = 'US Letter (816 × 1056px)';
      } else if (fmt === 'og-card') {
        width = 1200;
        minHeight = 630;
        label = 'Open Graph Card (1200 × 630px)';
      } else if (fmt === 'slide') {
        width = 1280;
        minHeight = 720;
        label = 'Presentation Slide 16:9 (1280 × 720px)';
      }

      paperCanvas.style.width = width + 'px';
      paperCanvas.style.minHeight = minHeight + 'px';
      canvasDimensionsPill.textContent = label;

      var guides = document.getElementById('breakGuidesContainer');
      if (fmt.startsWith('A4-portrait')) {
        guides.innerHTML = '<div class="page-break-line" style="top: 1123px;"><span class="page-break-tag">A4 Page 2 Begins</span></div>' +
          '<div class="page-break-line" style="top: 2246px;"><span class="page-break-tag">A4 Page 3 Begins</span></div>';
      } else if (fmt.startsWith('A4-landscape')) {
        guides.innerHTML = '<div class="page-break-line" style="top: 794px;"><span class="page-break-tag">A4 Page 2 Begins</span></div>' +
          '<div class="page-break-line" style="top: 1588px;"><span class="page-break-tag">A4 Page 3 Begins</span></div>';
      } else {
        guides.innerHTML = '';
      }
    }

    templateSelect.addEventListener('change', function(e) {
      var id = e.target.value;
      if (id === 'custom') {
        codeEditor.value = '<div class="max-w-3xl mx-auto p-12 bg-white text-slate-900 font-sans">\\n  <h1 class="text-3xl font-black text-indigo-600">Start Designing with Tailwind</h1>\\n  <p class="text-slate-600 mt-2">Edit HTML on the left to see live vector renders on the right.</p>\\n</div>';
      } else {
        var found = null;
        for (var i = 0; i < TEMPLATES_DATA.length; i++) {
          if (TEMPLATES_DATA[i].id === id) {
            found = TEMPLATES_DATA[i];
            break;
          }
        }
        if (found) {
          codeEditor.value = found.html;
          if (found.id === 'presentation') {
            formatSelect.value = 'slide';
          } else if (found.id === 'og-card') {
            formatSelect.value = 'og-card';
          } else if (found.landscape) {
            formatSelect.value = 'A4-landscape';
          } else {
            formatSelect.value = 'A4-portrait';
          }
        }
      }
      updateDimensions();
      scheduleRender();
    });

    formatSelect.addEventListener('change', function() {
      updateDimensions();
      scheduleRender();
      if (currentCanvasView === 'pdf') {
        renderPdfMultiPage();
      }
    });

    codeEditor.addEventListener('input', scheduleRender);

    codeEditor.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        scheduleRender();
      }
    });

    function switchTab(tab) {
      var htmlBtn = document.getElementById('tabHtmlBtn');
      var varsBtn = document.getElementById('tabVarsBtn');
      var htmlContent = document.getElementById('htmlTabContent');
      var varsContent = document.getElementById('varsTabContent');

      if (tab === 'html') {
        htmlBtn.className = 'px-3 py-1 rounded-md text-xs font-bold transition bg-indigo-600/20 text-indigo-400 border border-indigo-500/30';
        varsBtn.className = 'px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white transition';
        htmlContent.classList.remove('hidden');
        varsContent.classList.add('hidden');
      } else {
        varsBtn.className = 'px-3 py-1 rounded-md text-xs font-bold transition bg-indigo-600/20 text-indigo-400 border border-indigo-500/30';
        htmlBtn.className = 'px-3 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white transition';
        varsContent.classList.remove('hidden');
        htmlContent.classList.add('hidden');
      }
    }

    function applyVariables() {
      try {
        var json = JSON.parse(document.getElementById('varsEditor').value);
        var html = codeEditor.value;
        for (var key in json) {
          if (Object.prototype.hasOwnProperty.call(json, key)) {
            var regex = new RegExp('{{' + key + '}}', 'g');
            html = html.replace(regex, String(json[key]));
          }
        }
        codeEditor.value = html;
        switchTab('html');
        scheduleRender();
      } catch (err) {
        alert('Invalid JSON in Variables editor: ' + err.message);
      }
    }

    function toggleSmartPagination() {
      smartPaginationEnabled = !smartPaginationEnabled;
      if (smartPaginationEnabled) {
        paginationShieldBtn.className = 'px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 shadow-sm';
        shieldActiveBadge.classList.remove('hidden');
      } else {
        paginationShieldBtn.className = 'px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition bg-slate-900 border-slate-700 text-slate-400 hover:text-white';
        shieldActiveBadge.classList.add('hidden');
      }
      scheduleRender();
      if (currentCanvasView === 'pdf') {
        renderPdfMultiPage();
      }
    }

    function toggleBreakGuides() {
      breakGuidesVisible = !breakGuidesVisible;
      var guides = document.getElementById('breakGuidesContainer');
      guides.style.display = breakGuidesVisible ? 'block' : 'none';
    }

    function setZoom(zoom) {
      currentZoom = zoom;
      paperCanvas.style.transform = 'scale(' + zoom + ')';
      if (pdfPagesContainer) {
        pdfPagesContainer.style.transform = 'scale(' + zoom + ')';
        pdfPagesContainer.style.transformOrigin = 'top center';
      }
      var buttons = document.querySelectorAll('.zoom-btn');
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        if (parseFloat(b.getAttribute('data-zoom')) === zoom) {
          b.className = 'zoom-btn px-2 py-0.5 rounded text-[11px] bg-slate-800 text-white font-bold';
        } else {
          b.className = 'zoom-btn px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white';
        }
      }
    }

    function insertSnippet(type) {
      var snippet = '';
      if (type === 'table') {
        snippet = '\\n<div class="my-6">\\n  <table class="w-full text-left border-collapse border border-slate-200">\\n    <thead class="bg-slate-100 font-bold text-xs uppercase text-slate-700">\\n      <tr>\\n        <th class="p-3 border border-slate-200">Item</th>\\n        <th class="p-3 border border-slate-200 text-right">Qty</th>\\n        <th class="p-3 border border-slate-200 text-right">Price</th>\\n      </tr>\\n    </thead>\\n    <tbody class="divide-y divide-slate-200 text-xs text-slate-800">\\n      <tr><td class="p-3">Enterprise Cloud License</td><td class="p-3 text-right">1</td><td class="p-3 text-right">€499.00</td></tr>\\n      <tr><td class="p-3">Professional Support</td><td class="p-3 text-right">12</td><td class="p-3 text-right">€99.00</td></tr>\\n    </tbody>\\n  </table>\\n</div>\\n';
      } else if (type === 'pagebreak') {
        snippet = '\\n<div class="page-break my-8 border-t-2 border-dashed border-indigo-400/40 text-center text-xs font-mono text-indigo-400 py-1">[--- Page Break ---]</div>\\n';
      } else if (type === 'signature') {
        snippet = '\\n<div class="signature-block mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">\\n  <p class="text-xs font-bold text-slate-500 uppercase">Authorized Signature</p>\\n  <div class="h-12 border-b border-slate-400 w-64 mt-4"></div>\\n  <p class="text-xs text-slate-600 mt-2">Date: ' + new Date().toLocaleDateString() + '</p>\\n</div>\\n';
      } else if (type === 'metric') {
        snippet = '\\n<div class="grid grid-cols-3 gap-4 my-6">\\n  <div class="p-4 rounded-xl bg-indigo-50 border border-indigo-100"><p class="text-xs font-bold text-indigo-600">Total Revenue</p><p class="text-2xl font-black text-indigo-950 mt-1">€124,500</p></div>\\n  <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100"><p class="text-xs font-bold text-emerald-600">Active Renders</p><p class="text-2xl font-black text-emerald-950 mt-1">99.98%</p></div>\\n  <div class="p-4 rounded-xl bg-purple-50 border border-purple-100"><p class="text-xs font-bold text-purple-600">Net Growth</p><p class="text-2xl font-black text-purple-950 mt-1">+34.2%</p></div>\\n</div>\\n';
      }

      var curPos = codeEditor.selectionStart;
      codeEditor.value = codeEditor.value.substring(0, curPos) + snippet + codeEditor.value.substring(curPos);
      scheduleRender();
    }

    function insertMultiPageDemo() {
      codeEditor.value = getMultiPageDemoHtml();
      formatSelect.value = 'A4-portrait';
      updateDimensions();
      scheduleRender();
      setCanvasViewMode('pdf');
    }

    function openApiModal() {
      updateApiSnippet();
      document.getElementById('apiModal').classList.remove('hidden');
    }

    function closeApiModal() {
      document.getElementById('apiModal').classList.add('hidden');
    }

    function setApiTab(tab) {
      activeApiTab = tab;
      var tabs = ['curl', 'node', 'python', 'mcp'];
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) {
          if (t === tab) {
            btn.className = 'px-3 py-1.5 border-b-2 border-indigo-500 text-indigo-400 text-xs font-bold transition';
          } else {
            btn.className = 'px-3 py-1.5 border-b-2 border-transparent text-slate-400 hover:text-white text-xs font-medium transition';
          }
        }
      }
      updateApiSnippet();
    }

    function updateApiSnippet() {
      var html = codeEditor.value;
      var fmt = formatSelect.value;
      var isLandscape = fmt.indexOf('landscape') !== -1;
      var isImage = fmt === 'og-card' || fmt === 'slide';
      var codeBlock = document.getElementById('apiCodeBlock');

      if (activeApiTab === 'curl') {
        var payloadObj = isImage
          ? { html: html, width: fmt === 'og-card' ? 1200 : 1280, height: fmt === 'og-card' ? 630 : 720, type: 'png' }
          : { html: html, format: 'A4', landscape: isLandscape, smart_pagination: smartPaginationEnabled };

        var endpoint = isImage ? 'image' : 'pdf';
        var outfile = isImage ? 'render.png' : 'document.pdf';

        codeBlock.textContent = [
          'curl -X POST https://tailprint.com/v1/render/' + endpoint + ' \\\\',
          '  -H "Authorization: Bearer sec_live_..." \\\\',
          '  -H "Content-Type: application/json" \\\\',
          '  -d ' + JSON.stringify(JSON.stringify(payloadObj)) + ' \\\\',
          '  --output ' + outfile
        ].join('\\n');
      } else if (activeApiTab === 'node') {
        codeBlock.textContent = [
          'import fs from "node:fs";',
          '',
          'const response = await fetch("https://tailprint.com/v1/render/' + (isImage ? 'image' : 'pdf') + '", {',
          '  method: "POST",',
          '  headers: {',
          '    authorization: "Bearer sec_live_...",',
          '    "content-type": "application/json",',
          '  },',
          '  body: JSON.stringify({',
          '    html: ' + JSON.stringify(html) + ',',
          '    format: "A4",',
          '    landscape: ' + isLandscape + ',',
          '    smart_pagination: ' + smartPaginationEnabled + ',',
          '  }),',
          '});',
          '',
          'const buffer = Buffer.from(await response.arrayBuffer());',
          'fs.writeFileSync("output.' + (isImage ? 'png' : 'pdf') + '", buffer);',
          'console.log("Document rendered successfully!");'
        ].join('\\n');
      } else if (activeApiTab === 'python') {
        codeBlock.textContent = [
          'import requests',
          '',
          'url = "https://tailprint.com/v1/render/' + (isImage ? 'image' : 'pdf') + '"',
          'headers = {',
          '    "Authorization": "Bearer sec_live_...",',
          '    "Content-Type": "application/json"',
          '}',
          'payload = {',
          '    "html": ' + JSON.stringify(html) + ',',
          '    "format": "A4",',
          '    "landscape": ' + (isLandscape ? 'True' : 'False') + ',',
          '    "smart_pagination": ' + (smartPaginationEnabled ? 'True' : 'False'),
          '}',
          '',
          'response = requests.post(url, json=payload, headers=headers)',
          'with open("output.' + (isImage ? 'png' : 'pdf') + '", "wb") as f:',
          '    f.write(response.content)',
          '',
          'print("Document saved successfully!")'
        ].join('\\n');
      } else if (activeApiTab === 'mcp') {
        codeBlock.textContent = [
          '// In Claude Desktop, Cursor, or your AI Agent:',
          'await call_tool("tailprint", "render_pdf", {',
          '  "html": ' + JSON.stringify(html) + ',',
          '  "format": "A4",',
          '  "landscape": ' + isLandscape,
          '});'
        ].join('\\n');
      }
    }

    function copyApiSnippet() {
      var code = document.getElementById('apiCodeBlock').textContent;
      navigator.clipboard.writeText(code).then(function() {
        var btn = document.getElementById('copyCodeBtn');
        var original = btn.innerHTML;
        btn.innerHTML = '<span>✅ Copied!</span>';
        setTimeout(function() {
          btn.innerHTML = original;
        }, 1800);
      });
    }

    async function downloadPdf() {
      var btn = document.getElementById('downloadPdfBtn');
      var btnText = document.getElementById('pdfBtnText');
      btn.disabled = true;
      btnText.textContent = '⏳ Rendering PDF...';

      try {
        var res = await fetch('/v1/tools/studio/render-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: codeEditor.value,
            format: formatSelect.value.indexOf('Letter') !== -1 ? 'Letter' : 'A4',
            landscape: formatSelect.value.indexOf('landscape') !== -1,
            smart_pagination: smartPaginationEnabled,
          }),
        });

        if (!res.ok) {
          var err = await res.json().catch(function() { return {}; });
          throw new Error(err.message || 'Render failed with status ' + res.status);
        }

        var blob = await res.blob();
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (templateSelect.value || 'studio-document') + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert('Download error: ' + err.message);
      } finally {
        btn.disabled = false;
        btnText.textContent = '⬇️ Download PDF';
      }
    }

    async function downloadImage() {
      try {
        var isOg = formatSelect.value === 'og-card';
        var res = await fetch('/v1/tools/studio/render-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: codeEditor.value,
            width: isOg ? 1200 : 1280,
            height: isOg ? 630 : 800,
            type: 'png',
          }),
        });

        if (!res.ok) {
          var err = await res.json().catch(function() { return {}; });
          throw new Error(err.message || 'Render failed with status ' + res.status);
        }

        var blob = await res.blob();
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (templateSelect.value || 'studio-render') + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert('Download error: ' + err.message);
      }
    }

    window.addEventListener('DOMContentLoaded', initStudio);
  </script>
</body>
</html>`;

    return reply.type('text/html; charset=utf-8').send(html);
  };

  fastify.get('/studio', { schema: { hide: true } }, studioHandler);
  fastify.get('/tools/studio', { schema: { hide: true } }, studioHandler);
  fastify.get('/editor', { schema: { hide: true } }, studioHandler);
};
