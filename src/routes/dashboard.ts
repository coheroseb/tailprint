import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const dashboardRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/dashboard',
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
  <title>Customer Dashboard - Tailprint</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/%3E%3C/svg%3E" />
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
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white flex flex-col justify-between">

  <!-- Header -->
  <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <a href="/" class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
            ⚡
          </div>
          <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Tailprint <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold ml-1">Dashboard</span>
          </span>
        </a>
      </div>

      <nav class="flex items-center space-x-4 text-xs font-semibold">
        <a href="/docs" target="_blank" class="text-slate-400 hover:text-white transition">API Docs (/docs)</a>
        <a href="/" class="text-slate-400 hover:text-white transition">Landing Page</a>
        <button id="logout-btn" onclick="logout()" class="hidden px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition">
          Switch Key
        </button>
      </nav>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-6xl mx-auto px-6 py-12 flex-1 w-full">

    <!-- Notification Banner -->
    <div id="welcome-banner" class="hidden mb-8 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
      <div class="flex items-center space-x-3">
        <span class="text-xl">🎉</span>
        <div>
          <span class="font-bold text-sm text-emerald-200">Payment Confirmed!</span>
          <p class="text-slate-300 mt-0.5">Your subscription is active and your live API key is ready below.</p>
        </div>
      </div>
      <button onclick="document.getElementById('welcome-banner').classList.add('hidden')" class="text-slate-400 hover:text-white">✕</button>
    </div>

    <!-- Login View (When no API key is active) -->
    <div id="login-view" class="max-w-md mx-auto py-12 text-center">
      <div class="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 flex items-center justify-center mx-auto text-2xl mb-6 shadow-xl shadow-indigo-600/10">
        🔑
      </div>
      <h2 class="text-2xl font-black text-white">Access Your Dashboard</h2>
      <p class="text-xs text-slate-400 mt-2 leading-relaxed">
        Enter your live API key (<code class="text-indigo-300">sec_live_...</code>) from your Stripe purchase to view real-time usage metrics and manage your plan.
      </p>

      <form onsubmit="handleLogin(event)" class="mt-8 space-y-4">
        <div>
          <input
            id="key-input"
            type="text"
            required
            placeholder="sec_live_abcdef123456..."
            class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 transition shadow-inner"
          />
        </div>
        <button
          type="submit"
          class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30"
        >
          View Live Dashboard ➔
        </button>
        <p id="login-error" class="text-xs text-rose-400 hidden"></p>
      </form>

      <div class="mt-8 pt-8 border-t border-slate-900 text-xs text-slate-500">
        Don't have an API key yet? <a href="/#pricing" class="text-indigo-400 hover:underline">Choose a Plan ($14/mo)</a>
      </div>
    </div>

    <!-- Active Dashboard View -->
    <div id="dashboard-view" class="hidden space-y-8">
      
      <!-- Top Row: Plan & API Key Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Card 1: Subscription Tier -->
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Plan</span>
              <span id="plan-status-badge" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                ● ACTIVE
              </span>
            </div>
            <h3 id="plan-name" class="text-2xl font-black text-white capitalize mt-3">Pro Tier</h3>
            <p id="plan-limit" class="text-xs text-slate-400 mt-1">20,000 renders / month</p>
          </div>
          <button
            onclick="openStripePortal()"
            id="portal-btn"
            class="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition flex items-center justify-center space-x-2 border border-slate-700/60"
          >
            <span>💳 Manage Subscription & VAT</span>
          </button>
        </div>

        <!-- Card 2: Quota & Usage Meter -->
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Usage</span>
              <span id="usage-percent" class="text-xs font-bold text-indigo-400">0.0%</span>
            </div>
            <div class="mt-3 flex items-baseline space-x-2">
              <span id="usage-current" class="text-2xl font-black text-white">0</span>
              <span id="usage-total" class="text-xs text-slate-400">/ 20,000 renders</span>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-2 rounded-full bg-slate-950 mt-4 overflow-hidden border border-slate-800">
              <div id="usage-progress-bar" class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" style="width: 2%"></div>
            </div>
          </div>
          <div class="mt-6 flex justify-between text-[11px] text-slate-500">
            <span>Remaining: <strong id="usage-remaining" class="text-slate-300">20,000</strong></span>
            <span>Renews: <strong id="usage-resets" class="text-slate-300">1st of next month</strong></span>
          </div>
        </div>

        <!-- Card 3: Live API Key -->
        <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Your API Key</span>
              <button onclick="toggleKeyVisibility()" id="toggle-key-btn" class="text-[11px] text-slate-400 hover:text-white">
                Show
              </button>
            </div>
            <div class="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 break-all select-all">
              <span id="masked-key">sec_live_••••••••••••</span>
            </div>
          </div>
          <button
            onclick="copyActiveKey()"
            id="copy-key-btn"
            class="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5"
          >
            <span>📋 Copy API Key</span>
          </button>
        </div>

      </div>

      <!-- Quickstart Code Section -->
      <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 class="text-sm font-bold text-white">Your Ready-to-Run Code Snippet</h4>
            <p class="text-xs text-slate-400 mt-0.5">Your actual API key is pre-injected into the snippet below.</p>
          </div>
          <div class="flex space-x-2">
            <button onclick="switchSnippet('curl')" id="btn-snip-curl" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">cURL</button>
            <button onclick="switchSnippet('node')" id="btn-snip-node" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white">Node.js</button>
            <button onclick="switchSnippet('python')" id="btn-snip-python" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white">Python</button>
          </div>
        </div>

        <pre id="code-snippet-box" class="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 leading-relaxed"></pre>
      </div>

    </div>

  </main>

  <!-- Footer -->
  <footer class="py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
    <p>© 2026 Tailprint (tailprint.com). Powered by Fastify, Playwright, Upstash Redis & Stripe.</p>
  </footer>

  <!-- Script for Dashboard Logic -->
  <script>
    let activeApiKey = '';
    let isKeyVisible = false;

    // Check query params for Checkout return
    (async function init() {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get('checkout_success') === 'true';
      const sessionId = urlParams.get('session_id');

      if (isSuccess && sessionId) {
        document.getElementById('welcome-banner').classList.remove('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);

        // Poll for session key
        let attempts = 0;
        while (attempts < 15) {
          try {
            const res = await fetch('/v1/billing/session-key?session_id=' + encodeURIComponent(sessionId));
            const data = await res.json();
            if (data.status === 'ready' && data.apiKey) {
              localStorage.setItem('tailprint_api_key', data.apiKey);
              loadDashboard(data.apiKey);
              return;
            }
          } catch {}
          attempts++;
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      const storedKey = localStorage.getItem('tailprint_api_key');
      if (storedKey) {
        loadDashboard(storedKey);
      }
    })();

    async function handleLogin(e) {
      e.preventDefault();
      const input = document.getElementById('key-input');
      const errEl = document.getElementById('login-error');
      const key = input.value.trim();

      errEl.classList.add('hidden');
      const success = await loadDashboard(key);
      if (success) {
        localStorage.setItem('tailprint_api_key', key);
      } else {
        errEl.innerText = 'Invalid API key or network error. Please try again.';
        errEl.classList.remove('hidden');
      }
    }

    async function loadDashboard(apiKey) {
      try {
        const res = await fetch('/v1/usage', {
          headers: { 'Authorization': 'Bearer ' + apiKey }
        });

        if (!res.ok) return false;

        const data = await res.json();
        activeApiKey = apiKey;

        // Populate Dashboard UI
        document.getElementById('plan-name').innerText = data.plan + ' tier';
        document.getElementById('plan-limit').innerText = Number(data.monthly_limit).toLocaleString() + ' renders / month';
        document.getElementById('usage-current').innerText = Number(data.current_usage).toLocaleString();
        document.getElementById('usage-total').innerText = '/ ' + Number(data.monthly_limit).toLocaleString() + ' renders';
        document.getElementById('usage-percent').innerText = data.percent_used;
        document.getElementById('usage-remaining').innerText = Number(data.remaining).toLocaleString();

        const resetDate = new Date(data.resets_at);
        document.getElementById('usage-resets').innerText = resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const bar = document.getElementById('usage-progress-bar');
        const pctNum = parseFloat(data.percent_used) || 0;
        bar.style.width = Math.max(2, Math.min(100, pctNum)) + '%';

        updateMaskedKey();
        updateSnippet('curl');

        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');

        return true;
      } catch (err) {
        return false;
      }
    }

    function updateMaskedKey() {
      const el = document.getElementById('masked-key');
      if (isKeyVisible) {
        el.innerText = activeApiKey;
      } else {
        el.innerText = activeApiKey.slice(0, 10) + '••••••••••••' + activeApiKey.slice(-4);
      }
    }

    window.toggleKeyVisibility = function() {
      isKeyVisible = !isKeyVisible;
      document.getElementById('toggle-key-btn').innerText = isKeyVisible ? 'Hide' : 'Show';
      updateMaskedKey();
    };

    window.copyActiveKey = function() {
      if (!activeApiKey) return;
      navigator.clipboard.writeText(activeApiKey).then(() => {
        const btn = document.getElementById('copy-key-btn');
        btn.innerHTML = '<span>✅ Copied!</span>';
        setTimeout(() => { btn.innerHTML = '<span>📋 Copy API Key</span>'; }, 2000);
      });
    };

    window.logout = function() {
      localStorage.removeItem('tailprint_api_key');
      activeApiKey = '';
      document.getElementById('dashboard-view').classList.add('hidden');
      document.getElementById('logout-btn').classList.add('hidden');
      document.getElementById('login-view').classList.remove('hidden');
    };

    window.openStripePortal = async function() {
      const btn = document.getElementById('portal-btn');
      btn.innerText = 'Opening Stripe Portal...';
      try {
        const res = await fetch('/v1/billing/portal', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + activeApiKey }
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('Could not access portal: ' + (data.message || 'Unknown error'));
        }
      } catch (err) {
        alert('Failed to connect to Stripe: ' + err.message);
      } finally {
        btn.innerText = '💳 Manage Subscription & VAT';
      }
    };

    let currentSnippetType = 'curl';
    window.switchSnippet = function(type) {
      currentSnippetType = type;
      ['curl', 'node', 'python'].forEach(t => {
        const btn = document.getElementById('btn-snip-' + t);
        if (t === type) {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white';
        }
      });
      updateSnippet(type);
    };

    function updateSnippet(type) {
      const box = document.getElementById('code-snippet-box');
      const origin = window.location.origin;

      if (type === 'curl') {
        box.innerText = 'curl -X POST ' + origin + '/v1/render/pdf \\\n' +
          '  -H "Authorization: Bearer ' + activeApiKey + '" \\\n' +
          '  -H "Content-Type: application/json" \\\n' +
          '  -d \'{"html":"<div class=\\"p-12 text-2xl font-bold text-indigo-600\\">Invoice from Tailprint</div>"}\' \\\n' +
          '  --output invoice.pdf';
      } else if (type === 'node') {
        box.innerText = 'const response = await fetch("' + origin + '/v1/render/pdf", {\n' +
          '  method: "POST",\n' +
          '  headers: {\n' +
          '    "Authorization": "Bearer ' + activeApiKey + '",\n' +
          '    "Content-Type": "application/json"\n' +
          '  },\n' +
          '  body: JSON.stringify({\n' +
          '    html: "<div class=\\"p-8 text-xl font-bold\\">Hello Tailprint</div>"\n' +
          '  })\n' +
          '});\n' +
          'const pdfBuffer = await response.arrayBuffer();';
      } else if (type === 'python') {
        box.innerText = 'import requests\n\n' +
          'url = "' + origin + '/v1/render/pdf"\n' +
          'headers = {\n' +
          '    "Authorization": "Bearer ' + activeApiKey + '",\n' +
          '    "Content-Type": "application/json"\n' +
          '}\n' +
          'payload = {"html": "<h1 class=\'text-3xl font-bold\'>Hello Tailprint</h1>"}\n\n' +
          'response = requests.post(url, json=payload, headers=headers)\n' +
          'with open("document.pdf", "wb") as f:\n' +
          '    f.write(response.content)';
      }
    }
  </script>
</body>
</html>`;

      return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
    }
  );
};
