import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { env } from '../config/env.js';
import { analyticsService } from '../services/analytics.js';

export const adminRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // JSON API Endpoint for Founder Analytics Dashboard
  fastify.get(
    '/v1/admin/stats',
    { schema: { hide: true } },
    async (request, reply) => {
      const headerKey = request.headers['x-admin-key'];
      const queryKey = (request.query as any)?.key;
      const providedKey = (typeof headerKey === 'string' ? headerKey : queryKey) || '';

      if (providedKey !== env.ADMIN_SECRET) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid admin secret key',
        });
      }

      const snapshot = await analyticsService.getDashboardSnapshot();
      return reply.code(200).send(snapshot);
    }
  );

  // Founder Live Analytics & Telemetry Dashboard UI
  fastify.get(
    '/admin',
    { schema: { hide: true } },
    async (_request, reply) => {
      const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Founder Analytics & Live Telemetry — Tailprint</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'%3E%3Crect width='64' height='64' rx='16' fill='%23050814'/%3E%3Cpath d='M22 20L10 32L22 44' stroke='%2338bdf8' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M36 16L26 48' stroke='%23a855f7' stroke-width='4.5' stroke-linecap='round'/%3E%3Cpath d='M42 20L54 32L42 44' stroke='%23f43f5e' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">

  <!-- Header -->
  <header class="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <a href="/" class="flex items-center group">
          <svg class="h-8 w-auto" viewBox="0 0 540 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M48 34 L20 60 L48 86" stroke="#38bdf8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="68" y="81" font-family="'Inter', sans-serif" font-weight="900" font-size="64" letter-spacing="-2.5" fill="#ffffff">tail</text>
            <text x="172" y="81" font-family="'Inter', sans-serif" font-weight="900" font-size="64" letter-spacing="-2.5" fill="#c084fc">print</text>
            <path d="M358 88 L382 32" stroke="#ec4899" stroke-width="9" stroke-linecap="round"/>
            <path d="M402 34 L430 60 L402 86" stroke="#f43f5e" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Founder Live Telemetry</span>
        </span>
      </div>

      <div class="flex items-center space-x-3">
        <span id="last-updated" class="hidden sm:inline text-xs text-slate-400 font-mono">Syncing...</span>
        <button onclick="toggleAutoRefresh()" id="auto-refresh-btn" class="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition">
          Auto-Refresh: ON (10s)
        </button>
        <button onclick="fetchStats()" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition">
          ↻ Refresh Now
        </button>
        <button onclick="logoutAdmin()" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-semibold transition">
          Lock
        </button>
      </div>
    </div>
  </header>

  <!-- Passcode Gate Modal -->
  <div id="auth-gate" class="hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
      <div class="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl mb-4">
        📊
      </div>
      <h1 class="text-xl font-black text-white">Founder Analytics Login</h1>
      <p class="text-xs text-slate-400 mt-1">Enter your admin passcode to unlock live visitor & engine telemetry.</p>
      <form onsubmit="submitAdminKey(event)" class="mt-6 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Admin Passcode</label>
          <input id="admin-key-input" type="password" required placeholder="••••••••••••" class="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
        </div>
        <div id="auth-error" class="hidden text-xs text-rose-400 bg-rose-950/50 border border-rose-800/50 rounded-lg p-2.5">
          Invalid admin passcode. Please try again.
        </div>
        <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25">
          Unlock Live Dashboard →
        </button>
      </form>
    </div>
  </div>

  <!-- Main Dashboard Content -->
  <main id="dashboard-content" class="max-w-7xl mx-auto px-6 py-8 space-y-8">

    <!-- 1. Top 6 KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400">Visitors Today</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">LIVE</span>
        </div>
        <div id="kpi-uv-today" class="text-3xl font-black text-white mt-2">0</div>
        <div class="text-xs text-slate-400 mt-1"><span id="kpi-pv-today" class="text-slate-200 font-semibold">0</span> pageviews today</div>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400">Total Visitors</span>
          <span class="text-sm">🌍</span>
        </div>
        <div id="kpi-uv-total" class="text-3xl font-black text-sky-400 mt-2">0</div>
        <div class="text-xs text-slate-400 mt-1"><span id="kpi-pv-total" class="text-slate-200 font-semibold">0</span> total pageviews</div>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-950/20">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-purple-300">NPM Downloads (7d)</span>
          <a href="https://www.npmjs.com/package/tailprint" target="_blank" class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono hover:bg-purple-500/30">v<span id="kpi-npm-ver">1.0.1</span> ↗</a>
        </div>
        <div id="kpi-npm-week" class="text-3xl font-black text-purple-400 mt-2">414</div>
        <div class="text-xs text-slate-400 mt-1"><span id="kpi-npm-day" class="text-purple-200 font-semibold">0</span> last 24h • <span id="kpi-npm-month" class="text-slate-300">414</span> 30d</div>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400">Engine Renders</span>
          <span class="text-sm">⚡</span>
        </div>
        <div id="kpi-renders-total" class="text-3xl font-black text-indigo-400 mt-2">0</div>
        <div class="text-xs text-slate-400 mt-1"><span id="kpi-renders-today" class="text-slate-200 font-semibold">0</span> renders today</div>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400">API Users / Keys</span>
          <span class="text-sm">🔑</span>
        </div>
        <div id="kpi-users-total" class="text-3xl font-black text-emerald-400 mt-2">0</div>
        <div class="text-xs text-slate-400 mt-1"><span id="kpi-users-free" class="text-slate-200 font-semibold">0</span> Free • <span id="kpi-users-paid" class="text-emerald-300 font-semibold">0</span> Paid</div>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/20">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-emerald-300">Est. Stripe MRR</span>
          <span class="text-sm">💳</span>
        </div>
        <div class="text-3xl font-black text-emerald-400 mt-2">$<span id="kpi-mrr">0</span></div>
        <div class="text-xs text-slate-400 mt-1">Monthly recurring</div>
      </div>
    </div>

    <!-- 2. 14-Day Traffic Chart & Feature Usage Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- 14-Day Chart -->
      <div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 class="text-base font-bold text-white">Last 14 Days Activity</h2>
            <p class="text-xs text-slate-400">Daily human pageviews, unique visitors & engine renders</p>
          </div>
          <div class="flex items-center space-x-4 text-xs">
            <span class="flex items-center space-x-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block"></span><span class="text-slate-300">Pageviews</span></span>
            <span class="flex items-center space-x-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block"></span><span class="text-slate-300">Renders</span></span>
          </div>
        </div>
        <div id="chart-14d" class="h-48 flex items-end justify-between gap-2 pt-6 border-b border-slate-800 pb-2">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Product Feature Breakdown -->
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90">
        <h2 class="text-base font-bold text-white">Feature Usage Breakdown</h2>
        <p class="text-xs text-slate-400 mb-5">Which Tailprint tools are being used</p>
        <div id="feature-breakdown" class="space-y-3.5">
          <!-- Populated by JS -->
        </div>
      </div>
    </div>

    <!-- 3. Top Pages, Traffic Sources & AI Bots -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90">
        <h3 class="text-sm font-bold text-white flex items-center justify-between">
          <span>📄 Top Visited Pages</span>
          <span class="text-[11px] text-slate-400 font-normal">Views</span>
        </h3>
        <div id="top-pages-list" class="mt-4 space-y-2.5 text-xs"></div>
      </div>

      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90">
        <h3 class="text-sm font-bold text-white flex items-center justify-between">
          <span>🔗 Top Referrers & Countries</span>
          <span class="text-[11px] text-slate-400 font-normal">Visits</span>
        </h3>
        <div id="top-referrers-list" class="mt-4 space-y-2.5 text-xs"></div>
        <div class="mt-5 pt-4 border-t border-slate-800/80">
          <div class="text-xs font-bold text-slate-300 mb-2">🌍 Visitor Countries</div>
          <div id="top-countries-list" class="flex flex-wrap gap-1.5"></div>
        </div>
      </div>

      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90">
        <h3 class="text-sm font-bold text-white flex items-center justify-between">
          <span>🤖 AI Bots & Search Crawlers</span>
          <span class="text-[11px] text-purple-400 font-mono">GEO Radar</span>
        </h3>
        <p class="text-[11px] text-slate-400 mt-1">Crawlers indexing tailprint.com & /llms.txt</p>
        <div id="ai-bots-list" class="mt-4 space-y-2.5 text-xs"></div>
      </div>
    </div>

    <!-- 4. Registered Users & API Keys Table -->
    <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 class="text-base font-bold text-white">Registered Users & Active API Keys</h2>
          <p class="text-xs text-slate-400">Real-time list of developers who claimed a free key or subscribed via Stripe</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
              <th class="py-3 px-3">Developer / Customer</th>
              <th class="py-3 px-3">Plan</th>
              <th class="py-3 px-3">Key Prefix</th>
              <th class="py-3 px-3">Monthly Quota Usage</th>
              <th class="py-3 px-3">Status</th>
              <th class="py-3 px-3 text-right">Created</th>
            </tr>
          </thead>
          <tbody id="customers-table-body" class="divide-y divide-slate-800/60 text-xs">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 5. Live Real-Time Activity Stream -->
    <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <span>📡 Live Activity Stream</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </h2>
          <p class="text-xs text-slate-400">Latest 50 visitors, playground tests, API renders, signups, and AI crawler hits</p>
        </div>
      </div>
      <div id="live-events-list" class="space-y-2 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
        <!-- Populated by JS -->
      </div>
    </div>

  </main>

  <script>
    let autoRefresh = true;
    let refreshTimer = null;

    function getAdminKey() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get('key');
      if (urlKey) {
        localStorage.setItem('tailprint_admin_key', urlKey);
        window.history.replaceState({}, document.title, '/admin');
        return urlKey;
      }
      return localStorage.getItem('tailprint_admin_key') || '';
    }

    function submitAdminKey(e) {
      e.preventDefault();
      const val = document.getElementById('admin-key-input').value.trim();
      if (!val) return;
      localStorage.setItem('tailprint_admin_key', val);
      fetchStats();
    }

    function logoutAdmin() {
      localStorage.removeItem('tailprint_admin_key');
      document.getElementById('auth-gate').classList.remove('hidden');
    }

    function toggleAutoRefresh() {
      autoRefresh = !autoRefresh;
      const btn = document.getElementById('auto-refresh-btn');
      if (autoRefresh) {
        btn.innerText = 'Auto-Refresh: ON (10s)';
        btn.className = 'px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition';
      } else {
        btn.innerText = 'Auto-Refresh: PAUSED';
        btn.className = 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-xs font-semibold transition';
      }
    }

    async function fetchStats() {
      const key = getAdminKey();
      if (!key) {
        document.getElementById('auth-gate').classList.remove('hidden');
        return;
      }

      try {
        const res = await fetch('/v1/admin/stats', {
          headers: { 'x-admin-key': key }
        });

        if (res.status === 401) {
          document.getElementById('auth-gate').classList.remove('hidden');
          document.getElementById('auth-error').classList.remove('hidden');
          return;
        }

        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('auth-error').classList.add('hidden');

        const data = await res.json();
        renderDashboard(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }

    function renderDashboard(d) {
      document.getElementById('last-updated').innerText = 'Updated ' + new Date().toLocaleTimeString();

      // KPIs
      document.getElementById('kpi-uv-today').innerText = (d.today.uniqueVisitors || 0).toLocaleString();
      document.getElementById('kpi-pv-today').innerText = (d.today.pageviews || 0).toLocaleString();
      document.getElementById('kpi-uv-total').innerText = (d.totals.uniqueVisitors || 0).toLocaleString();
      document.getElementById('kpi-pv-total').innerText = (d.totals.pageviews || 0).toLocaleString();

      document.getElementById('kpi-npm-week').innerText = (d.npm.lastWeek || 0).toLocaleString();
      document.getElementById('kpi-npm-day').innerText = (d.npm.lastDay || 0).toLocaleString();
      document.getElementById('kpi-npm-month').innerText = (d.npm.lastMonth || 0).toLocaleString();
      document.getElementById('kpi-npm-ver').innerText = d.npm.version || '1.0.1';

      document.getElementById('kpi-renders-total').innerText = (d.totals.renders || 0).toLocaleString();
      document.getElementById('kpi-renders-today').innerText = (d.today.renders || 0).toLocaleString();

      document.getElementById('kpi-users-total').innerText = (d.totals.totalUsers || 0).toLocaleString();
      document.getElementById('kpi-users-free').innerText = (d.totals.freeUsers || 0).toLocaleString();
      document.getElementById('kpi-users-paid').innerText = (d.totals.paidUsers || 0).toLocaleString();
      document.getElementById('kpi-mrr').innerText = (d.totals.estimatedMrrUsd || 0).toLocaleString();

      // 14-day chart
      const chartEl = document.getElementById('chart-14d');
      const days = d.last14Days || [];
      const maxVal = Math.max(10, ...days.map(x => Math.max(x.pageviews, x.renders)));
      chartEl.innerHTML = days.map(day => {
        const pvH = Math.max(4, Math.round((day.pageviews / maxVal) * 140));
        const rnH = Math.max(4, Math.round((day.renders / maxVal) * 140));
        return \`
          <div class="flex-1 flex flex-col items-center group relative">
            <div class="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-950 border border-slate-700 text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
              \${day.label}: \${day.pageviews} views (\${day.uniqueVisitors} UV) • \${day.renders} renders
            </div>
            <div class="w-full flex items-end justify-center space-x-1 h-36">
              <div style="height: \${pvH}px" class="w-2.5 bg-sky-500/80 hover:bg-sky-400 rounded-t transition-all"></div>
              <div style="height: \${rnH}px" class="w-2.5 bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition-all"></div>
            </div>
            <span class="text-[10px] text-slate-500 mt-2 font-mono">\${day.label.split(' ')[1]}</span>
          </div>
        \`;
      }).join('');

      // Feature Breakdown
      const u = d.usage || {};
      const features = [
        { label: '🎮 Playground & Free Tools', count: u.playground || 0, color: 'bg-sky-500' },
        { label: '📄 API PDF Renders', count: u.pdf || 0, color: 'bg-indigo-500' },
        { label: '🖼️ API OG Image Renders', count: u.image || 0, color: 'bg-purple-500' },
        { label: '🇪🇺 Factur-X E-Invoices', count: u.einvoice || 0, color: 'bg-emerald-500' },
        { label: '🕷️ LLM Web Scrapes', count: u.scrape || 0, color: 'bg-amber-500' },
        { label: '🤖 MCP Agent Calls', count: u.mcp || 0, color: 'bg-pink-500' },
      ];
      const maxFeat = Math.max(1, ...features.map(f => f.count));
      document.getElementById('feature-breakdown').innerHTML = features.map(f => {
        const pct = Math.max(3, Math.round((f.count / maxFeat) * 100));
        return \`
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-300 font-medium">\${f.label}</span>
              <span class="font-mono font-bold text-white">\${f.count.toLocaleString()}</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div class="\${f.color} h-full rounded-full" style="width: \${pct}%"></div>
            </div>
          </div>
        \`;
      }).join('');

      // Top Pages
      const pagesEl = document.getElementById('top-pages-list');
      pagesEl.innerHTML = (d.topPages && d.topPages.length)
        ? d.topPages.map(p => \`
            <div class="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span class="font-mono text-sky-300 truncate">\${p.path}</span>
              <span class="font-mono font-bold text-white">\${p.count}</span>
            </div>
          \`).join('')
        : '<p class="text-slate-500 italic">Waiting for page visits...</p>';

      // Top Referrers & Countries
      const refsEl = document.getElementById('top-referrers-list');
      refsEl.innerHTML = (d.topReferrers && d.topReferrers.length)
        ? d.topReferrers.map(r => \`
            <div class="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span class="text-slate-200 truncate">\${r.source}</span>
              <span class="font-mono font-bold text-emerald-400">\${r.count}</span>
            </div>
          \`).join('')
        : '<p class="text-slate-500 italic">No external referrers recorded yet.</p>';

      const countriesEl = document.getElementById('top-countries-list');
      countriesEl.innerHTML = (d.topCountries && d.topCountries.length)
        ? d.topCountries.map(c => \`
            <span class="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              \${c.country}: <strong class="text-white">\${c.count}</strong>
            </span>
          \`).join('')
        : '<span class="text-slate-500 text-xs italic">None yet</span>';

      // AI Bots
      const botsEl = document.getElementById('ai-bots-list');
      botsEl.innerHTML = (d.aiBots && d.aiBots.length)
        ? d.aiBots.map(b => \`
            <div class="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-purple-500/20">
              <span class="text-purple-200 truncate">\${b.bot}</span>
              <span class="font-mono font-bold text-purple-400">\${b.count}</span>
            </div>
          \`).join('')
        : '<p class="text-slate-500 italic">Listening for AI crawlers...</p>';

      // Customers Table
      const tbody = document.getElementById('customers-table-body');
      const customers = d.customers || [];
      if (!customers.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-500">No customers found yet.</td></tr>';
      } else {
        tbody.innerHTML = customers.map(c => {
          const pct = Math.min(100, Math.round(((c.current_usage || 0) / Math.max(1, c.monthly_limit)) * 100));
          const planBadge = c.plan === 'free'
            ? '<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">Free</span>'
            : '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] uppercase">' + c.plan + '</span>';
          const dateStr = c.created_at ? new Date(c.created_at).toLocaleString() : '-';
          return \`
            <tr class="hover:bg-slate-900/40">
              <td class="py-3 px-3 font-medium text-white">\${c.email || c.customer_id}</td>
              <td class="py-3 px-3">\${planBadge}</td>
              <td class="py-3 px-3 font-mono text-slate-400">\${c.key_prefix}...</td>
              <td class="py-3 px-3">
                <div class="flex items-center space-x-2">
                  <div class="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div class="bg-indigo-500 h-full" style="width: \${pct}%"></div>
                  </div>
                  <span class="font-mono text-slate-300">\${c.current_usage} / \${c.monthly_limit}</span>
                </div>
              </td>
              <td class="py-3 px-3">
                <span class="text-emerald-400 font-semibold">\${c.status}</span>
              </td>
              <td class="py-3 px-3 text-right font-mono text-slate-400">\${dateStr}</td>
            </tr>
          \`;
        }).join('');
      }

      // Live Events Stream
      const eventsEl = document.getElementById('live-events-list');
      const events = d.recentEvents || [];
      const badgeStyles = {
        VISIT: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        SIGNUP: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        PDF: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        IMAGE: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        EINVOICE: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        SCRAPE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        PLAYGROUND: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        MCP: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
        AI_BOT: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
      };

      if (!events.length) {
        eventsEl.innerHTML = '<div class="text-slate-500 py-4">No events captured yet. Visit the homepage or run a render to see live events appear here!</div>';
      } else {
        eventsEl.innerHTML = events.map(ev => {
          const time = new Date(ev.timestamp).toLocaleTimeString();
          const style = badgeStyles[ev.type] || 'bg-slate-800 text-slate-300';
          const lat = ev.latencyMs ? \`<span class="text-emerald-400">\${ev.latencyMs}ms</span>\` : '';
          return \`
            <div class="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
              <div class="flex items-center space-x-3 truncate">
                <span class="text-slate-500">\${time}</span>
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold \${style}">\${ev.type}</span>
                <span class="text-white font-semibold">\${ev.path}</span>
                <span class="text-slate-400 truncate">\${ev.detail}</span>
              </div>
              <div class="flex items-center space-x-3 shrink-0 ml-2">
                \${lat}
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px]">\${ev.country}</span>
              </div>
            </div>
          \`;
        }).join('');
      }
    }

    // Initial load & interval
    fetchStats();
    setInterval(() => {
      if (autoRefresh) fetchStats();
    }, 10000);
  </script>
</body>
</html>`;

      return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
    }
  );
};
