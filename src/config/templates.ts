export interface TemplateItem {
  id: string;
  title: string;
  category: string;
  description: string;
  format: 'A4' | 'Letter';
  landscape: boolean;
  html: string;
}

export const TEMPLATES: TemplateItem[] = [
  {
    id: 'invoice',
    title: 'Professional Invoice',
    category: 'Billing & Accounting',
    description: 'Production-ready invoice template with line items, tax breakdown, and banking details.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-12 bg-white text-slate-800 font-sans">
  <!-- Header -->
  <div class="flex justify-between items-start border-b border-slate-200 pb-8">
    <div>
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
        <span class="text-2xl font-black text-slate-900 tracking-tight">RenderCorp Inc.</span>
      </div>
      <p class="text-sm text-slate-500 mt-2">548 Market Street, Suite 3400<br>San Francisco, CA 94104<br>Tax ID: US-9428512</p>
    </div>
    <div class="text-right">
      <h1 class="text-3xl font-black text-slate-900 uppercase tracking-wide">INVOICE</h1>
      <p class="text-sm font-semibold text-indigo-600 mt-1">#INV-2026-042</p>
      <div class="mt-4 text-xs text-slate-500 space-y-1">
        <p><span class="font-medium text-slate-700">Invoice Date:</span> November 10, 2026</p>
        <p><span class="font-medium text-slate-700">Due Date:</span> November 24, 2026</p>
      </div>
    </div>
  </div>

  <!-- Billed To -->
  <div class="mt-8 grid grid-cols-2 gap-8 text-sm">
    <div>
      <p class="text-xs uppercase font-bold text-slate-400 tracking-wider">Billed To</p>
      <p class="font-bold text-slate-900 mt-1 text-base">Acme Corporation</p>
      <p class="text-slate-600 mt-1">Attn: Sebastian Viste<br>100 Montgomery St, Fl 18<br>San Francisco, CA 94104<br>VAT: 987654321</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
      <span class="text-xs uppercase font-bold text-slate-400">Payment Status</span>
      <div class="flex items-center space-x-2 mt-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        <span class="font-bold text-emerald-700 text-sm">Paid via Stripe</span>
      </div>
      <p class="text-xs text-slate-500 mt-2">Transaction: ch_3N4xLm2eZvKYlo2C0pY5</p>
    </div>
  </div>

  <!-- Items Table -->
  <div class="mt-10 overflow-hidden rounded-xl border border-slate-200">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="bg-slate-100 text-slate-700 font-semibold text-xs uppercase tracking-wider">
          <th class="py-3 px-4">Description</th>
          <th class="py-3 px-4 text-center">Qty</th>
          <th class="py-3 px-4 text-right">Unit Price</th>
          <th class="py-3 px-4 text-right">Amount (USD)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">
        <tr>
          <td class="py-3.5 px-4 font-medium text-slate-900">Tailwind Render Engine - Pro Subscription</td>
          <td class="py-3.5 px-4 text-center">1</td>
          <td class="py-3.5 px-4 text-right">$39.00</td>
          <td class="py-3.5 px-4 text-right font-medium">$39.00</td>
        </tr>
        <tr>
          <td class="py-3.5 px-4 font-medium text-slate-900">Dedicated Playwright Concurrency Pool (5 workers)</td>
          <td class="py-3.5 px-4 text-center">1</td>
          <td class="py-3.5 px-4 text-right">$150.00</td>
          <td class="py-3.5 px-4 text-right font-medium">$150.00</td>
        </tr>
        <tr>
          <td class="py-3.5 px-4 font-medium text-slate-900">Upstash Redis Global L2 Cache Replication</td>
          <td class="py-3.5 px-4 text-center">1</td>
          <td class="py-3.5 px-4 text-right">$40.00</td>
          <td class="py-3.5 px-4 text-right font-medium">$40.00</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="mt-6 flex justify-end">
    <div class="w-64 space-y-2 text-sm text-slate-600">
      <div class="flex justify-between py-1">
        <span>Subtotal</span>
        <span class="font-medium text-slate-900">$229.00</span>
      </div>
      <div class="flex justify-between py-1">
        <span>Tax (8.25%)</span>
        <span class="font-medium text-slate-900">$18.89</span>
      </div>
      <div class="border-t border-slate-300 pt-2 flex justify-between text-base font-bold text-slate-900">
        <span>Total Paid</span>
        <span class="text-indigo-600">$247.89</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
    <p>Thank you for choosing Tailprint. Questions? Contact support@tailprint.com</p>
  </div>
</div>`,
  },
  {
    id: 'certificate',
    title: 'Course Certificate of Completion',
    category: 'Education & HR',
    description: 'An elegant award certificate featuring gold border ornamentation, custom typography, and verification stamp.',
    format: 'A4',
    landscape: true,
    html: `<div class="w-full h-full p-10 bg-slate-900 flex items-center justify-center font-serif">
  <div class="w-full h-full p-8 border-4 border-amber-400/80 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-center relative overflow-hidden flex flex-col justify-between shadow-2xl">
    
    <!-- Background Glows -->
    <div class="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl"></div>
    <div class="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"></div>

    <!-- Header -->
    <div class="mt-2">
      <p class="text-amber-400 uppercase tracking-widest text-xs font-sans font-bold">Global Academy of Advanced Engineering</p>
      <h1 class="text-4xl font-normal text-white mt-3 tracking-wide">CERTIFICATE OF ACHIEVEMENT</h1>
      <div class="w-24 h-0.5 bg-amber-400 mx-auto mt-4"></div>
    </div>

    <!-- Recipient -->
    <div class="my-6">
      <p class="text-slate-400 text-sm italic font-sans">This is proudly presented to</p>
      <h2 class="text-4xl font-bold text-amber-200 mt-2 tracking-wide font-sans">Sebastian Viste</h2>
      <p class="text-slate-300 text-sm max-w-xl mx-auto mt-4 font-sans leading-relaxed">
        for successfully completing the rigorous industry training in
        <span class="text-white font-semibold">"Modern Cloud Architecture, Fastify Microservices & High-Performance Headless Automation"</span>
      </p>
    </div>

    <!-- Signatures & Date -->
    <div class="grid grid-cols-3 gap-6 items-end pb-4 font-sans text-xs">
      <div>
        <p class="text-slate-400">November 10, 2026</p>
        <div class="border-t border-slate-700 mt-2 pt-1 text-slate-500">Date of Issuance</div>
      </div>
      
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-full border-2 border-amber-400/60 bg-amber-400/10 flex items-center justify-center text-amber-300 font-bold text-[10px] tracking-wider uppercase shadow-inner">
          VERIFIED
        </div>
      </div>

      <div>
        <p class="text-white font-signature text-base italic">Dr. Christian Lind</p>
        <div class="border-t border-slate-700 mt-2 pt-1 text-slate-500">Program Director & Dean</div>
      </div>
    </div>

  </div>
</div>`,
  },
  {
    id: 'report',
    title: 'Weekly Executive Performance Report',
    category: 'Business & Analytics',
    description: 'Data-dense executive dashboard featuring KPI metric widgets, progress trackers, and system SLA overview.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-10 bg-slate-50 text-slate-800 font-sans">
  <!-- Top Bar -->
  <div class="flex justify-between items-center border-b border-slate-200 pb-5">
    <div>
      <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">Week 46, 2026</span>
      <h1 class="text-2xl font-black text-slate-900 mt-2">Executive Weekly Dashboard</h1>
    </div>
    <div class="text-right text-xs text-slate-500">
      <p>Generated: Nov 10, 2026, 21:00 UTC</p>
      <p class="font-medium text-slate-700">Team: Platform & EaaS</p>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="grid grid-cols-3 gap-4 mt-6">
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Documents Rendered</p>
      <h3 class="text-2xl font-black text-slate-900 mt-1">142,850</h3>
      <div class="flex items-center text-xs text-emerald-600 font-bold mt-2">
        <span>▲ +18.4%</span>
        <span class="text-slate-400 font-normal ml-1.5">vs. last week</span>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Avg Response Time</p>
      <h3 class="text-2xl font-black text-slate-900 mt-1">428 ms</h3>
      <div class="flex items-center text-xs text-emerald-600 font-bold mt-2">
        <span>▼ -42 ms</span>
        <span class="text-slate-400 font-normal ml-1.5">pool optimization</span>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Cache Hit Rate (SHA-256)</p>
      <h3 class="text-2xl font-black text-indigo-600 mt-1">87.2%</h3>
      <div class="flex items-center text-xs text-slate-500 mt-2">
        <span>Upstash Redis L2 Cache</span>
      </div>
    </div>
  </div>

  <!-- Sprint Objectives & Progress -->
  <div class="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <h2 class="text-base font-bold text-slate-900">Sprint Milestones & Deliverables</h2>
    <div class="space-y-4 mt-4">
      <div>
        <div class="flex justify-between text-xs font-semibold text-slate-700 mb-1">
          <span>Stripe Webhooks & Automated Key Provisioning</span>
          <span class="text-emerald-600 font-bold">100%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2">
          <div class="bg-emerald-500 h-2 rounded-full w-full"></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs font-semibold text-slate-700 mb-1">
          <span>Tailwind Play CDN JIT & Font Engine</span>
          <span class="text-emerald-600 font-bold">100%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2">
          <div class="bg-emerald-500 h-2 rounded-full w-full"></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs font-semibold text-slate-700 mb-1">
          <span>OpenAPI 3.1 & Scalar Reference in Dark Mode</span>
          <span class="text-emerald-600 font-bold">100%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2">
          <div class="bg-emerald-500 h-2 rounded-full w-full"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Infrastructure Table -->
  <div class="mt-8">
    <h2 class="text-base font-bold text-slate-900 mb-3">System Resources & Uptime</h2>
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="bg-slate-100 text-slate-700 font-semibold uppercase">
            <th class="py-2.5 px-4">Environment</th>
            <th class="py-2.5 px-4">Node Runtime</th>
            <th class="py-2.5 px-4">Concurrency Pool</th>
            <th class="py-2.5 px-4">Uptime</th>
            <th class="py-2.5 px-4 text-right">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-slate-700">
          <tr>
            <td class="py-3 px-4 font-semibold text-slate-900">Render Engine Prod (Docker)</td>
            <td class="py-3 px-4">Node.js v22 LTS</td>
            <td class="py-3 px-4">5 workers (p-limit)</td>
            <td class="py-3 px-4">99.98%</td>
            <td class="py-3 px-4 text-right"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">OPERATIONAL</span></td>
          </tr>
          <tr>
            <td class="py-3 px-4 font-semibold text-slate-900">Upstash Redis Cluster</td>
            <td class="py-3 px-4">Serverless REST</td>
            <td class="py-3 px-4">Global Replication</td>
            <td class="py-3 px-4">100.0%</td>
            <td class="py-3 px-4 text-right"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">OPERATIONAL</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>`,
  },
  {
    id: 'resume',
    title: 'Modern Tech Resume / CV',
    category: 'Career & HR',
    description: 'Clean two-column technical CV layout with timeline experience, skill tags, and contact links.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-10 bg-white text-slate-800 font-sans">
  <!-- Top Profile Header -->
  <div class="flex justify-between items-center border-b border-slate-200 pb-8">
    <div>
      <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight">Sebastian Viste</h1>
      <p class="text-lg font-semibold text-indigo-600 mt-1">Lead Backend & Distributed Systems Engineer</p>
      <p class="text-sm text-slate-500 mt-2 max-w-xl leading-relaxed">
        Specializing in high-throughput Node.js microservices, headless browser automation at scale, and serverless edge caching architectures.
      </p>
    </div>
    <div class="text-right text-xs text-slate-500 space-y-1.5">
      <p class="font-medium text-slate-700">📍 Copenhagen, Denmark</p>
      <p>✉️ sebastian@example.com</p>
      <p>🔗 github.com/sebastianviste</p>
      <p>📱 +45 20 30 40 50</p>
    </div>
  </div>

  <!-- Two Column Grid -->
  <div class="grid grid-cols-12 gap-8 mt-8">
    <!-- Left Column (Experience) -->
    <div class="col-span-8 space-y-6">
      <div>
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Professional Experience</h2>
        
        <div class="space-y-6">
          <div class="relative pl-6 border-l-2 border-indigo-200">
            <span class="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white"></span>
            <div class="flex justify-between items-baseline">
              <h3 class="text-base font-bold text-slate-900">Principal Engineer & Co-Founder</h3>
              <span class="text-xs font-semibold text-slate-400">2024 — Present</span>
            </div>
            <p class="text-xs font-semibold text-indigo-600">Tailprint</p>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
              Architected a sub-500ms PDF & Open Graph rendering platform handling 15M+ requests monthly. Implemented Playwright Chromium browser pooling and Upstash Redis L2 cache deduplication.
            </p>
          </div>

          <div class="relative pl-6 border-l-2 border-slate-200">
            <span class="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></span>
            <div class="flex justify-between items-baseline">
              <h3 class="text-base font-bold text-slate-900">Senior Backend Engineer</h3>
              <span class="text-xs font-semibold text-slate-400">2021 — 2024</span>
            </div>
            <p class="text-xs font-semibold text-slate-600">Nordic Cloud Platforms</p>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
              Led the migration from legacy monolith to TypeScript/Fastify microservices. Reduced p99 latency by 64% and decreased container infrastructure costs by 40%.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Key Projects</h2>
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h4 class="text-xs font-bold text-slate-900">Tailwind Standalone Render Worker</h4>
          <p class="text-xs text-slate-600 mt-1">Automated injection of Tailwind JIT compiler in headless Chromium contexts with zero pre-build compilation overhead.</p>
        </div>
      </div>
    </div>

    <!-- Right Column (Skills & Education) -->
    <div class="col-span-4 space-y-6">
      <div>
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Core Technical Skills</h2>
        <div class="flex flex-wrap gap-1.5">
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">TypeScript</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Node.js LTS</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Fastify</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Playwright</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Chromium Pool</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Docker</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Upstash Redis</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">OpenAPI 3.1</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">Stripe SDK</span>
        </div>
      </div>

      <div>
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Education</h2>
        <div class="text-xs space-y-1">
          <p class="font-bold text-slate-900">M.Sc. Computer Science</p>
          <p class="text-slate-600">Technical University of Denmark</p>
          <p class="text-slate-400">2019 — 2021</p>
        </div>
      </div>

      <div>
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Certifications</h2>
        <div class="text-xs space-y-2">
          <p class="font-semibold text-slate-800">✓ AWS Certified Solutions Architect</p>
          <p class="font-semibold text-slate-800">✓ Kubernetes CKA Professional</p>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'og-card',
    title: 'Dynamic Open Graph Banner',
    category: 'Social Media & Marketing',
    description: 'High-contrast 1200x630 social sharing card optimized for Twitter, LinkedIn, and Slack preview links.',
    format: 'Letter',
    landscape: true,
    html: `<div class="w-[1200px] h-[630px] p-16 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col justify-between font-sans relative overflow-hidden">
  <!-- Glowing Background Accents -->
  <div class="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
  <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

  <!-- Header -->
  <div class="flex justify-between items-center relative z-10">
    <div class="flex items-center space-x-3">
      <div class="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/40">
        ⚡
      </div>
      <span class="text-2xl font-black tracking-tight text-white">tailprint.com</span>
    </div>
    <span class="px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-sm font-bold tracking-wide">
      DEVELOPER INSIGHTS
    </span>
  </div>

  <!-- Main Headline -->
  <div class="relative z-10 my-auto">
    <div class="flex items-center space-x-2 text-emerald-400 text-sm font-bold uppercase tracking-wider mb-4">
      <span>● Deep Dive</span>
      <span class="text-slate-500">•</span>
      <span class="text-slate-400 font-normal">8 min read</span>
    </div>
    <h1 class="text-5xl font-black leading-tight text-white tracking-tight">
      How We Scaled Chromium to 15 Million PDF Renders at &lt;500ms Latency
    </h1>
    <p class="text-slate-300 text-lg mt-4 max-w-2xl leading-relaxed">
      Learn how concurrency pooling with Playwright, Tailwind JIT on-the-fly injection, and Upstash Redis transformed our microservice economics.
    </p>
  </div>

  <!-- Author & Metrics Footer -->
  <div class="flex justify-between items-center pt-8 border-t border-slate-800/80 relative z-10">
    <div class="flex items-center space-x-4">
      <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg text-white">
        SV
      </div>
      <div>
        <p class="font-bold text-white text-base">Sebastian Viste</p>
        <p class="text-xs text-slate-400">Founder & Systems Architect</p>
      </div>
    </div>

    <div class="flex items-center space-x-6 text-sm text-slate-400">
      <span class="flex items-center space-x-1.5">
        <span class="text-emerald-400 font-bold">✓</span>
        <span>Verified Playwright Engine</span>
      </span>
      <span class="px-3 py-1 rounded-md bg-slate-800/80 text-slate-300 text-xs font-mono font-semibold">
        POST /v1/render/image
      </span>
    </div>
  </div>
</div>`,
  },
  {
    id: 'shipping-label',
    title: 'E-Commerce Packing Slip & Shipping Label',
    category: 'Logistics & Retail',
    description: 'Clean dispatch order note with customer delivery details, package weight, SKU checklist, and return instructions.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-10 bg-white text-slate-900 font-sans">
  <!-- Top Bar & Barcode Header -->
  <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6">
    <div>
      <h1 class="text-2xl font-black tracking-tight uppercase">PACKING SLIP / DISPATCH NOTE</h1>
      <p class="text-xs text-slate-500 mt-1">Order #ORD-849201 • Fulfillment Center: EU-NORTH-1</p>
    </div>
    <!-- Visual Simulated Barcode -->
    <div class="text-right">
      <div class="inline-flex space-x-0.5 items-end h-10 bg-white p-1">
        <div class="w-1 h-full bg-black"></div>
        <div class="w-2 h-full bg-black"></div>
        <div class="w-0.5 h-full bg-black"></div>
        <div class="w-1.5 h-full bg-black"></div>
        <div class="w-0.5 h-full bg-black"></div>
        <div class="w-2 h-full bg-black"></div>
        <div class="w-1 h-full bg-black"></div>
        <div class="w-3 h-full bg-black"></div>
        <div class="w-0.5 h-full bg-black"></div>
        <div class="w-1.5 h-full bg-black"></div>
        <div class="w-1 h-full bg-black"></div>
        <div class="w-2 h-full bg-black"></div>
      </div>
      <p class="text-[10px] font-mono tracking-widest text-slate-700 mt-0.5">TRK-9821-4402-DK</p>
    </div>
  </div>

  <!-- Shipping Addresses Grid -->
  <div class="grid grid-cols-2 gap-8 my-8 text-xs">
    <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
      <p class="font-black text-slate-400 uppercase tracking-wider text-[10px]">SHIP TO (RECIPIENT)</p>
      <p class="font-extrabold text-slate-900 text-sm mt-1">Sebastian Viste</p>
      <p class="text-slate-600 mt-1 leading-relaxed">
        Strandboulevarden 42<br>
        2100 Copenhagen<br>
        Denmark<br>
        Tel: +45 20 30 40 50
      </p>
    </div>

    <div class="p-4 rounded-xl border border-slate-200">
      <p class="font-black text-slate-400 uppercase tracking-wider text-[10px]">SHIP FROM (RETURN SENDER)</p>
      <p class="font-extrabold text-slate-900 text-sm mt-1">Nordic Logistics Fulfillment ApS</p>
      <p class="text-slate-600 mt-1 leading-relaxed">
        Terminalvej 8, Port 14<br>
        2770 Kastrup<br>
        Denmark<br>
        Email: logistics@renderengine.io
      </p>
    </div>
  </div>

  <!-- Items Table -->
  <div class="overflow-hidden rounded-xl border border-slate-200">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-slate-100 text-slate-700 font-bold uppercase">
          <th class="py-2.5 px-4 w-12 text-center">Status</th>
          <th class="py-2.5 px-4">SKU / Item Description</th>
          <th class="py-2.5 px-4 text-center">Qty</th>
          <th class="py-2.5 px-4 text-right">Location</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">
        <tr>
          <td class="py-3 px-4 text-center font-bold text-emerald-600">✓</td>
          <td class="py-3 px-4 font-semibold text-slate-900">
            Wireless Mechanical Keyboard (Nordic ISO / Brown Switch)
            <span class="block text-[10px] text-slate-400 font-normal">SKU: KEYB-ISO-BRN-01</span>
          </td>
          <td class="py-3 px-4 text-center font-bold">1</td>
          <td class="py-3 px-4 text-right font-mono text-slate-500">BIN-A-04</td>
        </tr>
        <tr>
          <td class="py-3 px-4 text-center font-bold text-emerald-600">✓</td>
          <td class="py-3 px-4 font-semibold text-slate-900">
            Ergonomic Desk Mat (900x400mm - Slate Grey)
            <span class="block text-[10px] text-slate-400 font-normal">SKU: MAT-XL-GRY-09</span>
          </td>
          <td class="py-3 px-4 text-center font-bold">1</td>
          <td class="py-3 px-4 text-right font-mono text-slate-500">BIN-C-12</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Package Specs & Return Policy -->
  <div class="mt-8 grid grid-cols-3 gap-4 text-xs">
    <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
      <span class="text-slate-400 font-bold block text-[10px] uppercase">Total Weight</span>
      <span class="font-extrabold text-slate-900 text-sm mt-0.5 block">1.42 kg</span>
    </div>
    <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
      <span class="text-slate-400 font-bold block text-[10px] uppercase">Service Level</span>
      <span class="font-extrabold text-slate-900 text-sm mt-0.5 block">Express Air Priority</span>
    </div>
    <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
      <span class="text-slate-400 font-bold block text-[10px] uppercase">Inspected By</span>
      <span class="font-extrabold text-slate-900 text-sm mt-0.5 block">QC Inspector #44</span>
    </div>
  </div>

  <div class="mt-12 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
    <p>Need to initiate a return? Visit <span class="text-indigo-600 font-semibold">returns.renderengine.io</span> within 30 days of receipt.</p>
  </div>
</div>`,
  },
  {
    id: 'ticket',
    title: 'VIP Event Pass & Boarding Ticket',
    category: 'Events & Ticketing',
    description: 'High-contrast event ticket with perforated tear-line styling, barcode, seat tier badge, and speaker lineup.',
    format: 'A4',
    landscape: true,
    html: `<div class="max-w-4xl mx-auto p-12 bg-slate-950 text-slate-100 font-sans">
  <div class="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
    <!-- Main Ticket Body -->
    <div class="p-8 flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dashed border-slate-700/80 relative">
      <!-- Cutout notches for ticket effect -->
      <div class="hidden md:block absolute -top-4 -right-4 w-8 h-8 rounded-full bg-slate-950 border border-slate-800"></div>
      <div class="hidden md:block absolute -bottom-4 -right-4 w-8 h-8 rounded-full bg-slate-950 border border-slate-800"></div>

      <div>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-black text-white text-sm">TP</div>
            <span class="font-extrabold tracking-tight text-white text-lg">TAILPRINT CONF 2026</span>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            VIP All-Access Pass
          </span>
        </div>

        <div class="mt-8">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Attendee Name</p>
          <h2 class="text-3xl font-black text-white mt-1">Sebastian Viste</h2>
          <p class="text-sm text-indigo-400 font-medium mt-0.5">Founder & Lead Architect @ Cohero</p>
        </div>

        <div class="mt-8 grid grid-cols-3 gap-6">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date & Time</p>
            <p class="text-sm font-bold text-white mt-1">Nov 18, 2026</p>
            <p class="text-xs text-slate-400">09:00 AM CET</p>
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location</p>
            <p class="text-sm font-bold text-white mt-1">KB Hallen</p>
            <p class="text-xs text-slate-400">Copenhagen, DK</p>
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Seat / Tier</p>
            <p class="text-sm font-bold text-indigo-300 mt-1">Front Row • A14</p>
            <p class="text-xs text-slate-400">Stage Access</p>
          </div>
        </div>
      </div>

      <div class="mt-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <p>Order ID: #TP-98214-X</p>
        <p class="text-slate-400">Includes Keynote, Workshop & Afterparty</p>
      </div>
    </div>

    <!-- Stub / Barcode Sidebar -->
    <div class="p-8 w-full md:w-64 bg-slate-900/60 flex flex-col justify-between items-center text-center">
      <div class="w-full">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Security Token</span>
        <div class="mt-3 p-3 bg-white rounded-xl inline-block shadow-inner">
          <!-- Visual QR Pattern -->
          <div class="w-28 h-28 bg-slate-950 flex flex-col justify-between p-2 rounded">
            <div class="flex justify-between">
              <div class="w-6 h-6 border-2 border-white flex items-center justify-center"><div class="w-2 h-2 bg-white"></div></div>
              <div class="w-6 h-6 border-2 border-white flex items-center justify-center"><div class="w-2 h-2 bg-white"></div></div>
            </div>
            <div class="flex items-center justify-center space-x-1">
              <div class="w-1.5 h-1.5 bg-white"></div>
              <div class="w-2 h-2 bg-white"></div>
              <div class="w-1.5 h-1.5 bg-white"></div>
            </div>
            <div class="flex justify-between">
              <div class="w-6 h-6 border-2 border-white flex items-center justify-center"><div class="w-2 h-2 bg-white"></div></div>
              <div class="w-4 h-4 bg-white"></div>
            </div>
          </div>
        </div>
        <p class="text-[11px] font-mono text-slate-400 mt-3 tracking-widest">GATE-A // SCAN</p>
      </div>

      <div class="w-full mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-400">
        Non-transferable. Must present government photo ID at check-in.
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'receipt',
    title: 'POS Thermal Retail Receipt',
    category: 'Retail & Commerce',
    description: 'Compact thermal printer styled receipt with item breakdown, tax details, payment method, and dashed tear line.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-md mx-auto p-8 bg-neutral-100 font-mono text-neutral-800 text-xs antialiased">
  <div class="bg-white p-6 rounded-lg shadow-sm border border-neutral-300">
    <!-- Header -->
    <div class="text-center pb-4 border-b border-dashed border-neutral-400">
      <h1 class="text-base font-black tracking-wider uppercase">COPENHAGEN COFFEE LAB</h1>
      <p class="text-[11px] text-neutral-500 mt-0.5">Strandgade 14, 1401 Copenhagen</p>
      <p class="text-[11px] text-neutral-500">CVR: 38294102 • Tlf: +45 33 12 40 00</p>
      <div class="mt-2 text-[10px] text-neutral-400">
        <span>Receipt: #REC-48291</span> • <span>Station: Register 2</span>
      </div>
    </div>

    <!-- Date & Server -->
    <div class="py-3 border-b border-dashed border-neutral-400 flex justify-between text-[11px]">
      <span>Date: 2026-11-11 14:23</span>
      <span>Cashier: Mikkel K.</span>
    </div>

    <!-- Items -->
    <div class="py-4 space-y-2.5">
      <div class="flex justify-between font-medium">
        <span>2x Flat White (Oat Milk)</span>
        <span>96.00 DKK</span>
      </div>
      <div class="text-[10px] text-neutral-400 pl-4 -mt-1.5">
        @ 48.00 DKK (incl. 25% VAT)
      </div>

      <div class="flex justify-between font-medium">
        <span>1x Cardamom Bun</span>
        <span>38.00 DKK</span>
      </div>

      <div class="flex justify-between font-medium">
        <span>1x Ethiopian Pour-Over (Single Origin)</span>
        <span>52.00 DKK</span>
      </div>
    </div>

    <!-- Summary -->
    <div class="pt-3 border-t-2 border-neutral-900 space-y-1.5">
      <div class="flex justify-between text-neutral-600">
        <span>Subtotal (Net)</span>
        <span>148.80 DKK</span>
      </div>
      <div class="flex justify-between text-neutral-600">
        <span>Moms / VAT (25%)</span>
        <span>37.20 DKK</span>
      </div>
      <div class="flex justify-between text-base font-black text-neutral-900 pt-2 border-t border-dashed border-neutral-300">
        <span>TOTAL DUE</span>
        <span>186.00 DKK</span>
      </div>
    </div>

    <!-- Payment info -->
    <div class="mt-5 pt-3 border-t border-dashed border-neutral-400 space-y-1 text-[11px] text-neutral-600">
      <div class="flex justify-between">
        <span>Paid via Apple Pay (Visa **** 4028)</span>
        <span class="font-bold text-neutral-900">APPROVED</span>
      </div>
      <div class="flex justify-between text-[10px] text-neutral-400">
        <span>Auth Code: 894102</span>
        <span>Seq: 004819</span>
      </div>
    </div>

    <!-- Footer Barcode & Thank You -->
    <div class="mt-6 pt-4 border-t border-dashed border-neutral-400 text-center">
      <!-- Simulated 1D Barcode -->
      <div class="inline-flex space-x-0.5 items-end h-8 bg-white p-1">
        <div class="w-1 h-full bg-neutral-900"></div>
        <div class="w-2 h-full bg-neutral-900"></div>
        <div class="w-0.5 h-full bg-neutral-900"></div>
        <div class="w-1.5 h-full bg-neutral-900"></div>
        <div class="w-0.5 h-full bg-neutral-900"></div>
        <div class="w-2 h-full bg-neutral-900"></div>
        <div class="w-1 h-full bg-neutral-900"></div>
        <div class="w-3 h-full bg-neutral-900"></div>
        <div class="w-0.5 h-full bg-neutral-900"></div>
        <div class="w-2 h-full bg-neutral-900"></div>
      </div>
      <p class="text-[10px] text-neutral-400 mt-1">Thank you for visiting Copenhagen Coffee Lab!</p>
      <p class="text-[9px] text-neutral-400">Retain receipt for 14-day exchange</p>
    </div>
  </div>
</div>`,
  },
  {
    id: 'quote',
    title: 'B2B Sales Quotation & Estimate',
    category: 'Sales & Commercial',
    description: 'Commercial project proposal with scope of work, itemized pricing, payment milestones, and client signature sign-off.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-12 bg-white text-slate-800 font-sans">
  <!-- Top Header & Branding -->
  <div class="flex justify-between items-start border-b border-slate-200 pb-8">
    <div>
      <div class="flex items-center space-x-3">
        <div class="w-11 h-11 bg-gradient-to-tr from-indigo-700 to-sky-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
          N
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 tracking-tight">Nordic Digital Agency ApS</span>
          <p class="text-xs text-slate-500 font-medium">Enterprise Web & Cloud Solutions</p>
        </div>
      </div>
      <p class="text-xs text-slate-500 mt-3 leading-relaxed">
        Strandgade 42, 2. sal<br>
        1401 København K, Denmark<br>
        CVR/VAT: DK-38291044 • contact@nordicdigital.io
      </p>
    </div>
    <div class="text-right">
      <span class="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-200">
        Formal Proposal
      </span>
      <h1 class="text-3xl font-black text-slate-900 mt-2 tracking-tight">PROJECT QUOTE</h1>
      <p class="text-sm font-bold text-indigo-600 font-mono mt-0.5">#QUO-2026-0842</p>
      
      <div class="mt-4 text-xs text-slate-500 space-y-1">
        <p><span class="font-semibold text-slate-700">Date Issued:</span> November 12, 2026</p>
        <p><span class="font-semibold text-slate-700">Valid Until:</span> December 12, 2026 (30 Days)</p>
      </div>
    </div>
  </div>

  <!-- Client & Project Overview -->
  <div class="mt-8 grid grid-cols-2 gap-8 text-xs">
    <div class="p-5 rounded-xl bg-slate-50 border border-slate-200">
      <p class="uppercase font-bold text-slate-400 tracking-wider text-[10px]">Client Information</p>
      <p class="text-sm font-extrabold text-slate-900 mt-1">Apex Health Systems Nordic</p>
      <p class="text-slate-600 mt-1 leading-relaxed">
        Attn: Dr. Henrik Lindholm, VP Digital Health<br>
        Vesterbrogade 128<br>
        1620 København V, Denmark<br>
        VAT ID: DK-84920194
      </p>
    </div>

    <div class="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
      <div>
        <p class="uppercase font-bold text-slate-400 tracking-wider text-[10px]">Project Scope & Timeline</p>
        <p class="text-sm font-extrabold text-slate-900 mt-1">Patient Portal & Automated E-Invoicing</p>
        <p class="text-slate-600 mt-1">
          Full cloud migration, automated Factur-X billing backend, and responsive patient portal UI.
        </p>
      </div>
      <div class="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
        <span class="text-slate-500 font-medium">Estimated Delivery:</span>
        <span class="font-bold text-slate-900">8 Weeks (Sprint Based)</span>
      </div>
    </div>
  </div>

  <!-- Detailed Scope & Deliverables Table -->
  <div class="mt-8 overflow-hidden rounded-xl border border-slate-200">
    <table class="w-full text-left border-collapse text-xs">
      <thead>
        <tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
          <th class="py-3 px-4">Item & Deliverable Description</th>
          <th class="py-3 px-4 text-center">Unit / Hours</th>
          <th class="py-3 px-4 text-right">Rate</th>
          <th class="py-3 px-4 text-right">Amount (EUR)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">
        <tr>
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-900">Architecture & Technical Discovery</span>
            <p class="text-[11px] text-slate-500 mt-0.5">System blueprint, GDPR data flow audit, and API contract specifications.</p>
          </td>
          <td class="py-3.5 px-4 text-center font-mono">40 hrs</td>
          <td class="py-3.5 px-4 text-right font-mono">€ 140.00</td>
          <td class="py-3.5 px-4 text-right font-bold font-mono">€ 5,600.00</td>
        </tr>
        <tr>
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-900">Automated E-Invoicing & Compliance Engine</span>
            <p class="text-[11px] text-slate-500 mt-0.5">Integration of Factur-X / EN 16931 hybrid PDF generation and ERP sync.</p>
          </td>
          <td class="py-3.5 px-4 text-center font-mono">65 hrs</td>
          <td class="py-3.5 px-4 text-right font-mono">€ 150.00</td>
          <td class="py-3.5 px-4 text-right font-bold font-mono">€ 9,750.00</td>
        </tr>
        <tr>
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-900">Responsive Patient Portal UI & Design System</span>
            <p class="text-[11px] text-slate-500 mt-0.5">Tailwind CSS frontend, accessibility WCAG 2.1 AA compliance, and mobile responsive views.</p>
          </td>
          <td class="py-3.5 px-4 text-center font-mono">80 hrs</td>
          <td class="py-3.5 px-4 text-right font-mono">€ 135.00</td>
          <td class="py-3.5 px-4 text-right font-bold font-mono">€ 10,800.00</td>
        </tr>
        <tr>
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-900">QA, Penetration Testing & Production Deployment</span>
            <p class="text-[11px] text-slate-500 mt-0.5">Automated end-to-end tests, security hardening, and zero-downtime deployment setup.</p>
          </td>
          <td class="py-3.5 px-4 text-center font-mono">35 hrs</td>
          <td class="py-3.5 px-4 text-right font-mono">€ 140.00</td>
          <td class="py-3.5 px-4 text-right font-bold font-mono">€ 4,900.00</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Summary & Milestone Breakdown -->
  <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
      <p class="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Payment Milestone Schedule</p>
      <div class="flex justify-between py-1 border-b border-slate-200 text-slate-600">
        <span>1. Upfront Deposit (Project Kick-off)</span>
        <span class="font-bold text-slate-900">40% (€ 12,420.00)</span>
      </div>
      <div class="flex justify-between py-1 border-b border-slate-200 text-slate-600">
        <span>2. Mid-point Sprint Acceptance (Week 4)</span>
        <span class="font-bold text-slate-900">30% (€ 9,315.00)</span>
      </div>
      <div class="flex justify-between py-1 text-slate-600">
        <span>3. Final Release & Handover (Week 8)</span>
        <span class="font-bold text-slate-900">30% (€ 9,315.00)</span>
      </div>
    </div>

    <div class="space-y-2 text-xs text-slate-600">
      <div class="flex justify-between py-1.5 border-b border-slate-100">
        <span>Subtotal Services</span>
        <span class="font-mono font-bold text-slate-900">€ 31,050.00</span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100">
        <span>EU Reverse Charge / VAT (0% B2B)</span>
        <span class="font-mono font-medium text-slate-900">€ 0.00</span>
      </div>
      <div class="flex justify-between py-2 text-sm font-black text-slate-900 border-t-2 border-slate-900">
        <span>TOTAL ESTIMATE</span>
        <span class="text-indigo-600 font-mono text-base">€ 31,050.00</span>
      </div>
      <p class="text-[10px] text-slate-400 text-right">Prices in EUR. Excludes 3rd-party hosting and external SaaS subscriptions.</p>
    </div>
  </div>

  <!-- Acceptance & Formal Sign-off (Protected with break-inside-avoid) -->
  <div class="break-inside-avoid mt-10 pt-6 border-t-2 border-slate-200">
    <div class="flex justify-between items-end mb-4">
      <div>
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">Acceptance of Quote & Proposal</h3>
        <p class="text-xs text-slate-500 mt-0.5">By signing below, the client agrees to the scope, milestones, and commercial terms stated herein.</p>
      </div>
      <span class="text-[10px] text-slate-400 font-mono">Doc ref: SIG-QUO-2026-0842</span>
    </div>

    <div class="grid grid-cols-2 gap-8 mt-6">
      <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/50">
        <p class="text-[10px] uppercase font-bold text-slate-400">Authorized Client Signature (Apex Health)</p>
        <div class="h-16 border-b border-dashed border-slate-300 flex items-end pb-2">
          <span class="font-serif italic text-lg text-indigo-900">Dr. Henrik Lindholm</span>
        </div>
        <div class="mt-3 flex justify-between text-[11px] text-slate-500">
          <span>Date: Nov 14, 2026</span>
          <span>Title: VP Digital Health</span>
        </div>
      </div>

      <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/50">
        <p class="text-[10px] uppercase font-bold text-slate-400">Accepted By (Nordic Digital Agency)</p>
        <div class="h-16 border-b border-dashed border-slate-300 flex items-end pb-2">
          <span class="font-serif italic text-lg text-slate-800">Sebastian Viste</span>
        </div>
        <div class="mt-3 flex justify-between text-[11px] text-slate-500">
          <span>Date: Nov 12, 2026</span>
          <span>Title: Managing Partner</span>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'nda',
    title: 'Mutual Non-Disclosure Agreement (NDA)',
    category: 'Legal & Contracts',
    description: 'Enforceable bilateral confidentiality agreement with defined purpose, exclusions, IP clauses, and dual signature blocks.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-12 bg-white text-slate-900 font-sans leading-relaxed">
  <!-- Document Header -->
  <div class="text-center border-b border-slate-200 pb-6">
    <div class="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest mb-2">
      CONFIDENTIAL &amp; LEGALLY BINDING
    </div>
    <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">
      Mutual Non-Disclosure &amp; Confidentiality Agreement
    </h1>
    <p class="text-xs text-slate-500 mt-1">Standard Bilateral Corporate Form • Standard European Legal Framework</p>
  </div>

  <!-- Parties Definition -->
  <div class="mt-6 text-xs text-slate-700 space-y-3">
    <p>
      This Mutual Non-Disclosure Agreement (the <strong class="text-slate-900">"Agreement"</strong>) is entered into and made effective as of <strong class="text-slate-900">November 12, 2026</strong> (the <strong class="text-slate-900">"Effective Date"</strong>), by and between:
    </p>

    <div class="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div>
        <span class="font-bold text-slate-900 uppercase text-[10px] tracking-wider block text-indigo-700">Party A (Disclosing &amp; Receiving)</span>
        <strong class="text-slate-900 block mt-1">Antigravity Technologies ApS</strong>
        <p class="text-slate-600 mt-0.5">
          Registration / CVR: DK-40291844<br>
          Gammeltorv 8, 1457 København K, Denmark<br>
          Represented by: Sebastian Viste, Chief Technology Officer
        </p>
      </div>
      <div>
        <span class="font-bold text-slate-900 uppercase text-[10px] tracking-wider block text-indigo-700">Party B (Disclosing &amp; Receiving)</span>
        <strong class="text-slate-900 block mt-1">Vanguard Robotics Europe B.V.</strong>
        <p class="text-slate-600 mt-0.5">
          Registration / KvK: NL-84920194<br>
          Keizersgracht 421, 1016 EK Amsterdam, Netherlands<br>
          Represented by: Emma van der Meer, VP Corporate Strategy
        </p>
      </div>
    </div>

    <p>
      Party A and Party B are collectively referred to as the <strong class="text-slate-900">"Parties"</strong> and individually as a <strong class="text-slate-900">"Party"</strong>.
    </p>
  </div>

  <!-- Recitals & Purpose -->
  <div class="mt-6 space-y-4 text-xs text-slate-700">
    <div class="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
      <span class="font-bold text-indigo-900 uppercase text-[10px] tracking-wider">Recitals &amp; Stated Purpose:</span>
      <p class="text-slate-700 mt-1">
        The Parties intend to explore a potential strategic business collaboration regarding autonomous AI agent document automation, headless cloud browser orchestration, and compliance architectures (the <strong class="text-slate-900">"Authorized Purpose"</strong>).
      </p>
    </div>

    <!-- Numbered Sections -->
    <div class="space-y-3.5">
      <div>
        <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">1. Definition of Confidential Information</h2>
        <p class="mt-1 leading-normal text-slate-600">
          "Confidential Information" shall mean all proprietary, non-public, or confidential information disclosed by one Party (the "Disclosing Party") to the other Party (the "Receiving Party"), whether orally, visually, electronically, or in writing, including but not limited to source code, browser architectures, business models, financial data, customer lists, and machine learning models.
        </p>
      </div>

      <div>
        <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">2. Exclusions from Confidentiality</h2>
        <p class="mt-1 leading-normal text-slate-600">
          Confidential Information does not include information that: (a) is or becomes publicly known through no breach of this Agreement; (b) was already rightfully in the Receiving Party's possession prior to disclosure; (c) is independently developed without reference to the Disclosing Party's Confidential Information; or (d) is required to be disclosed by applicable law or court order.
        </p>
      </div>

      <div>
        <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">3. Non-Disclosure &amp; Security Obligations</h2>
        <p class="mt-1 leading-normal text-slate-600">
          The Receiving Party shall exercise the same degree of care it uses to protect its own confidential materials (and never less than reasonable care). The Receiving Party agrees not to disclose Confidential Information to any third party, except to employees, advisors, or contractors who have a legitimate need to know and are bound by written confidentiality obligations at least as restrictive as this Agreement.
        </p>
      </div>

      <div>
        <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">4. Term &amp; Survival</h2>
        <p class="mt-1 leading-normal text-slate-600">
          This Agreement shall remain in effect for a period of <strong class="text-slate-900">two (2) years</strong> from the Effective Date. The confidentiality obligations regarding trade secrets and source code shall survive termination indefinitely.
        </p>
      </div>

      <div>
        <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">5. Governing Law &amp; Dispute Resolution</h2>
        <p class="mt-1 leading-normal text-slate-600">
          This Agreement shall be governed by and construed in accordance with the substantive laws of <strong class="text-slate-900">Denmark</strong>, without regard to conflict of laws principles. Any dispute arising out of or in connection with this Agreement shall be settled by the courts of Copenhagen.
        </p>
      </div>
    </div>
  </div>

  <!-- Signatures Block (Protected against page splitting) -->
  <div class="break-inside-avoid mt-8 pt-6 border-t-2 border-slate-200">
    <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">IN WITNESS WHEREOF, the Parties have executed this Mutual NDA:</p>

    <div class="grid grid-cols-2 gap-8 text-xs">
      <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/60">
        <span class="text-[10px] uppercase font-bold text-slate-400 block">For Party A: Antigravity Technologies</span>
        <div class="h-14 border-b border-dashed border-slate-400 flex items-end pb-1.5">
          <span class="font-serif italic text-lg text-slate-900">Sebastian Viste</span>
        </div>
        <div class="mt-2.5 space-y-0.5 text-[11px] text-slate-600">
          <p><span class="font-semibold text-slate-800">Name:</span> Sebastian Viste</p>
          <p><span class="font-semibold text-slate-800">Title:</span> Chief Technology Officer</p>
          <p><span class="font-semibold text-slate-800">Date:</span> November 12, 2026</p>
        </div>
      </div>

      <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/60">
        <span class="text-[10px] uppercase font-bold text-slate-400 block">For Party B: Vanguard Robotics Europe</span>
        <div class="h-14 border-b border-dashed border-slate-400 flex items-end pb-1.5">
          <span class="font-serif italic text-lg text-slate-900">Emma van der Meer</span>
        </div>
        <div class="mt-2.5 space-y-0.5 text-[11px] text-slate-600">
          <p><span class="font-semibold text-slate-800">Name:</span> Emma van der Meer</p>
          <p><span class="font-semibold text-slate-800">Title:</span> VP Corporate Strategy</p>
          <p><span class="font-semibold text-slate-800">Date:</span> November 12, 2026</p>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'statement',
    title: 'Monthly Financial Statement & Ledger',
    category: 'FinTech & Banking',
    description: 'Multi-page financial statement featuring opening/closing balance cards, itemized transaction ledger with repeated headers, and regulatory notices.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-12 bg-white text-slate-800 font-sans">
  <!-- FinTech Statement Header -->
  <div class="flex justify-between items-start border-b border-slate-200 pb-8">
    <div>
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-xl shadow">
          ◈
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 tracking-tight">FinScale Bank Europe</span>
          <p class="text-xs text-slate-500 font-medium">Licensed Financial Entity • BIC: FINSDKK1</p>
        </div>
      </div>
      <p class="text-xs text-slate-500 mt-3 leading-relaxed">
        Kongens Nytorv 18<br>
        1050 København K, Denmark<br>
        Support: business@finscale.eu • +45 70 20 80 90
      </p>
    </div>

    <div class="text-right">
      <span class="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider border border-emerald-200">
        Account Statement
      </span>
      <h1 class="text-2xl font-black text-slate-900 mt-2 tracking-tight">MONTHLY LEDGER</h1>
      <p class="text-xs font-mono text-slate-500 mt-0.5">Statement #STM-2026-11</p>

      <div class="mt-3 text-xs text-slate-500 space-y-1">
        <p><span class="font-semibold text-slate-700">Statement Period:</span> 01 Oct 2026 – 31 Oct 2026</p>
        <p><span class="font-semibold text-slate-700">Issue Date:</span> 01 Nov 2026</p>
      </div>
    </div>
  </div>

  <!-- Account Summary Cards -->
  <div class="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Account IBAN</span>
      <span class="font-mono font-bold text-slate-900 text-xs mt-1 block">DK50 0044 0332 8109</span>
      <span class="text-[10px] text-slate-500">Corporate EUR Account</span>
    </div>

    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Opening Balance</span>
      <span class="font-mono font-bold text-slate-900 text-sm mt-1 block">€ 42,850.20</span>
      <span class="text-[10px] text-slate-500">As of Oct 1, 2026</span>
    </div>

    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
      <span class="text-[10px] uppercase font-bold text-emerald-600 block">Total Inflow</span>
      <span class="font-mono font-bold text-emerald-600 text-sm mt-1 block">+ € 38,420.00</span>
      <span class="text-[10px] text-slate-500">14 Credits received</span>
    </div>

    <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-md">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Closing Balance</span>
      <span class="font-mono font-black text-emerald-400 text-base mt-1 block">€ 61,424.95</span>
      <span class="text-[10px] text-slate-400">As of Oct 31, 2026</span>
    </div>
  </div>

  <!-- Itemized Transaction History (Protected with Smart Pagination Shield) -->
  <div class="mt-8 overflow-hidden rounded-xl border border-slate-200">
    <table class="w-full text-left border-collapse text-xs">
      <thead>
        <tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
          <th class="py-3 px-4">Date</th>
          <th class="py-3 px-4">Transaction Details &amp; Merchant</th>
          <th class="py-3 px-4">Reference</th>
          <th class="py-3 px-4 text-right">Debit (-)</th>
          <th class="py-3 px-4 text-right">Credit (+)</th>
          <th class="py-3 px-4 text-right">Balance</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">
        <tr>
          <td class="py-3 px-4 font-mono text-slate-500">02 Oct 2026</td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900">Stripe Payments Europe</span>
            <p class="text-[10px] text-slate-400">Merchant Payout #po_9381042</p>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">TRX-948102</td>
          <td class="py-3 px-4 text-right font-mono text-slate-400">—</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600">+ € 12,450.00</td>
          <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">€ 55,300.20</td>
        </tr>
        <tr>
          <td class="py-3 px-4 font-mono text-slate-500">05 Oct 2026</td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900">Amazon Web Services EMEA</span>
            <p class="text-[10px] text-slate-400">Direct Debit Cloud Compute</p>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">AWS-INV-849</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-rose-600">- € 2,845.25</td>
          <td class="py-3 px-4 text-right font-mono text-slate-400">—</td>
          <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">€ 52,454.95</td>
        </tr>
        <tr>
          <td class="py-3 px-4 font-mono text-slate-500">12 Oct 2026</td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900">Client Wire Transfer (Acme Corp)</span>
            <p class="text-[10px] text-slate-400">SEPA Credit Transfer #INV-2026-042</p>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">SEPA-004812</td>
          <td class="py-3 px-4 text-right font-mono text-slate-400">—</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600">+ € 15,000.00</td>
          <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">€ 67,454.95</td>
        </tr>
        <tr>
          <td class="py-3 px-4 font-mono text-slate-500">18 Oct 2026</td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900">Tailprint SaaS Pro Subscription</span>
            <p class="text-[10px] text-slate-400">Card Payment ch_3N4xLm2eZv</p>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">TP-SUB-PRO</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-rose-600">- € 39.00</td>
          <td class="py-3 px-4 text-right font-mono text-slate-400">—</td>
          <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">€ 67,415.95</td>
        </tr>
        <tr>
          <td class="py-3 px-4 font-mono text-slate-500">25 Oct 2026</td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900">Staff Payroll &amp; Social Taxes</span>
            <p class="text-[10px] text-slate-400">Automated Salary Batch Run</p>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">PAY-BATCH-10</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-rose-600">- € 16,961.00</td>
          <td class="py-3 px-4 text-right font-mono text-slate-400">—</td>
          <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">€ 50,454.95</td>
        </tr>
        <tr>
          <td class="py-3 px-4 font-mono text-slate-500">30 Oct 2026</td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900">Inbound Customer Retainer</span>
            <p class="text-[10px] text-slate-400">Consulting Services Q4</p>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">WIRE-891048</td>
          <td class="py-3 px-4 text-right font-mono text-slate-400">—</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600">+ € 10,970.00</td>
          <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">€ 61,424.95</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Regulatory & Legal Footer (Protected against page splitting) -->
  <div class="break-inside-avoid mt-8 pt-6 border-t border-slate-200 text-[10px] text-slate-500 space-y-2">
    <div class="flex justify-between items-center text-slate-700 font-semibold">
      <span>Deposit Guarantee Scheme Notice:</span>
      <span>Covered up to € 100,000 per depositor</span>
    </div>
    <p class="leading-relaxed">
      FinScale Bank Europe is authorized and regulated by the European Central Bank and the Danish Financial Supervisory Authority (Finanstilsynet). Please inspect all entries carefully. Discrepancies must be reported in writing within 30 days of receipt.
    </p>
    <div class="pt-2 flex justify-between font-mono text-[9px] text-slate-400">
      <span>SHA-256 Ledger Stamp: 9f82c01928abce847291a0b3820942851948</span>
      <span>Page 1 of 1 • End of Statement</span>
    </div>
  </div>
</div>`,
  },
  {
    id: 'einvoice',
    title: 'EU Factur-X & PEPPOL E-Invoice',
    category: 'Billing & Accounting',
    description: 'European hybrid e-invoice compliant with EN 16931 and ZUGFeRD 2.2 containing dual visual PDF and embedded factur-x.xml.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-12 bg-white text-slate-800 font-sans leading-relaxed">
  <!-- E-Invoice Header & Compliance Badge -->
  <div class="flex justify-between items-start border-b border-slate-200 pb-8">
    <div>
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xl shadow">
          EU
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 tracking-tight">Acme Nordic Cloud ApS</span>
          <p class="text-xs text-slate-500">European B2B Infrastructure Provider</p>
        </div>
      </div>
      <p class="text-xs text-slate-500 mt-3 leading-relaxed">
        Industrivej 24<br>
        2600 Glostrup, Denmark<br>
        VAT/CVR: DK-12345678 • PEPPOL ID: 0184:DK12345678
      </p>
    </div>

    <div class="text-right">
      <div class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
        <span>🇪🇺 Factur-X / EN 16931 Compliant</span>
      </div>
      <h1 class="text-3xl font-black text-slate-900 mt-2 tracking-tight">TAX INVOICE</h1>
      <p class="text-sm font-bold text-indigo-600 font-mono mt-0.5">#INV-2026-0042</p>

      <div class="mt-4 text-xs text-slate-500 space-y-1">
        <p><span class="font-semibold text-slate-700">Issue Date:</span> November 12, 2026</p>
        <p><span class="font-semibold text-slate-700">Due Date:</span> December 12, 2026</p>
        <p><span class="font-semibold text-slate-700">Profile:</span> EN 16931 (COMFORT/EXTENDED)</p>
      </div>
    </div>
  </div>

  <!-- Buyer Details & Embedded Metadata Notice -->
  <div class="mt-8 grid grid-cols-2 gap-8 text-xs">
    <div class="p-5 rounded-xl bg-slate-50 border border-slate-200">
      <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Buyer (Customer)</span>
      <strong class="text-sm font-extrabold text-slate-900 mt-1 block">Global Logistics Deutschland GmbH</strong>
      <p class="text-slate-600 mt-1 leading-relaxed">
        Alexanderplatz 4<br>
        10178 Berlin, Germany<br>
        USt-IdNr: DE-987654321 • PEPPOL ID: 0204:987654321
      </p>
    </div>

    <div class="p-5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between">
      <div>
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-[10px] uppercase font-bold text-amber-900 tracking-wider">Embedded Factur-X Machine XML</span>
        </div>
        <p class="text-[11px] text-amber-900 mt-1.5 leading-relaxed">
          This hybrid PDF/A-3 contains an embedded standardized <code class="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono text-[10px]">factur-x.xml</code> file for direct robotic ingestion in SAP, DATEV, Dinero, and Chorus Pro.
        </p>
      </div>
      <div class="pt-3 border-t border-amber-200/60 text-[10px] font-mono text-amber-800 flex justify-between">
        <span>CII Schema: urn:un:unece:uncefact:...</span>
        <span class="font-bold">VALIDATED</span>
      </div>
    </div>
  </div>

  <!-- Line Items Table -->
  <div class="mt-8 overflow-hidden rounded-xl border border-slate-200">
    <table class="w-full text-left border-collapse text-xs">
      <thead>
        <tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
          <th class="py-3 px-4">Line Item Description</th>
          <th class="py-3 px-4 text-center">Qty</th>
          <th class="py-3 px-4 text-right">Unit Price</th>
          <th class="py-3 px-4 text-right">VAT Rate</th>
          <th class="py-3 px-4 text-right">Amount (EUR)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-700">
        <tr>
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-900">Enterprise Cloud Rendering &amp; MCP Cluster</span>
            <p class="text-[10px] text-slate-500">Dedicated Playwright pool reservation (Month of Nov 2026)</p>
          </td>
          <td class="py-3.5 px-4 text-center font-mono">1</td>
          <td class="py-3.5 px-4 text-right font-mono">€ 450.00</td>
          <td class="py-3.5 px-4 text-right font-mono text-slate-500">0% (RC)</td>
          <td class="py-3.5 px-4 text-right font-bold font-mono">€ 450.00</td>
        </tr>
        <tr>
          <td class="py-3.5 px-4">
            <span class="font-bold text-slate-900">Factur-X European Compliance Gateway Add-on</span>
            <p class="text-[10px] text-slate-500">Real-time PDF/A-3 compilation &amp; CII XML embedding</p>
          </td>
          <td class="py-3.5 px-4 text-center font-mono">1</td>
          <td class="py-3.5 px-4 text-right font-mono">€ 150.00</td>
          <td class="py-3.5 px-4 text-right font-mono text-slate-500">0% (RC)</td>
          <td class="py-3.5 px-4 text-right font-bold font-mono">€ 150.00</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- VAT Breakdown & Payment Info -->
  <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
      <span class="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">Banking &amp; Settlement Details</span>
      <div class="space-y-1 text-slate-600 text-[11px]">
        <p><span class="font-semibold text-slate-800">Bank:</span> Danske Bank A/S</p>
        <p><span class="font-semibold text-slate-800">IBAN:</span> <span class="font-mono">DK50 0044 0332 8109</span></p>
        <p><span class="font-semibold text-slate-800">BIC/SWIFT:</span> <span class="font-mono">DABADKKK</span></p>
        <p><span class="font-semibold text-slate-800">Payment Reference:</span> <span class="font-mono font-bold text-indigo-600">INV-2026-0042</span></p>
      </div>
      <p class="text-[10px] text-slate-400 pt-1">Intra-Community Supply: VAT Reverse Charged under Art. 196 EU VAT Directive.</p>
    </div>

    <div class="space-y-2 text-xs text-slate-600">
      <div class="flex justify-between py-1.5 border-b border-slate-100">
        <span>Net Total (Excl. VAT)</span>
        <span class="font-mono font-bold text-slate-900">€ 600.00</span>
      </div>
      <div class="flex justify-between py-1.5 border-b border-slate-100">
        <span>VAT Total (0% Reverse Charge)</span>
        <span class="font-mono font-medium text-slate-900">€ 0.00</span>
      </div>
      <div class="flex justify-between py-2 text-sm font-black text-slate-900 border-t-2 border-slate-900">
        <span>TOTAL PAYABLE</span>
        <span class="text-amber-600 font-mono text-base">€ 600.00</span>
      </div>
      <p class="text-[10px] text-slate-400 text-right">Payable in EUR within 30 days of invoice date.</p>
    </div>
  </div>
</div>`,
  },
  {
    id: 'presentation',
    title: '16:9 Executive Pitch Slide Deck',
    category: 'Presentations & Pitch Decks',
    description: 'Modern widescreen 16:9 presentation keynote slide with high-contrast typography, metrics cards, accent badges, and speaker branding.',
    format: 'A4',
    landscape: true,
    html: `<div class="w-full h-full min-h-[580px] p-16 bg-slate-950 text-white font-sans flex flex-col justify-between relative overflow-hidden">
  <!-- Ambient Gradient Aura -->
  <div class="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

  <!-- Top Bar -->
  <div class="flex items-center justify-between border-b border-slate-800 pb-6 relative z-10">
    <div class="flex items-center space-x-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-black text-sm">TP</div>
      <span class="font-bold text-sm tracking-tight text-slate-200">Tailprint • Series A Investor Deck</span>
    </div>
    <div class="flex items-center space-x-2">
      <span class="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">Q4 2026 Executive Summary</span>
    </div>
  </div>

  <!-- Slide Core Content -->
  <div class="my-auto max-w-4xl relative z-10">
    <span class="text-xs font-bold font-mono tracking-widest uppercase text-emerald-400">01 / MARKET VALIDATION</span>
    <h1 class="text-4xl sm:text-5xl font-black text-white mt-3 leading-tight tracking-tight">
      Developers Hate Puppeteer in Docker.<br>
      <span class="bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">We Turn HTML into PDF in &lt; 500ms.</span>
    </h1>

    <div class="grid grid-cols-3 gap-6 mt-8">
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <span class="text-3xl font-black text-white block">380 ms</span>
        <span class="text-xs text-slate-400 mt-1 block">Median Vector PDF Latency</span>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <span class="text-3xl font-black text-emerald-400 block">22 Tools</span>
        <span class="text-xs text-slate-400 mt-1 block">Native MCP Agent Catalog</span>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <span class="text-3xl font-black text-indigo-400 block">100%</span>
        <span class="text-xs text-slate-400 mt-1 block">GDPR Zero-Retention Mode</span>
      </div>
    </div>
  </div>

  <!-- Slide Footer -->
  <div class="flex items-center justify-between border-t border-slate-800 pt-6 text-xs text-slate-500 relative z-10">
    <span>Confidential &amp; Proprietary • For Investment Review Only</span>
    <span class="font-mono">Slide 04 / 18</span>
  </div>
</div>`,
  },
  {
    id: 'contract',
    title: 'Independent Contractor Agreement',
    category: 'Legal & Contracts',
    description: 'B2B service agreement specifying contractor deliverables, IP assignment, payment milestones, and dual signature blocks.',
    format: 'A4',
    landscape: false,
    html: `<div class="max-w-4xl mx-auto p-12 bg-white text-slate-800 font-sans leading-relaxed">
  <!-- Contract Header -->
  <div class="text-center border-b border-slate-200 pb-6">
    <span class="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest mb-2">
      B2B Professional Services
    </span>
    <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tight">
      Independent Contractor Agreement
    </h1>
    <p class="text-xs text-slate-500 mt-1">Consulting, Software Engineering &amp; IP Assignment Contract</p>
  </div>

  <!-- Parties -->
  <div class="mt-6 text-xs text-slate-700 space-y-3">
    <p>
      This Independent Contractor Agreement (the <strong class="text-slate-900">"Agreement"</strong>) is entered into on <strong class="text-slate-900">November 12, 2026</strong>, by and between:
    </p>

    <div class="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div>
        <span class="font-bold text-slate-900 uppercase text-[10px] tracking-wider block text-indigo-700">Client</span>
        <strong class="text-slate-900 block mt-1">Antigravity Technologies ApS</strong>
        <p class="text-slate-600 mt-0.5">CVR: DK-40291844 • Gammeltorv 8, 1457 København K</p>
      </div>
      <div>
        <span class="font-bold text-slate-900 uppercase text-[10px] tracking-wider block text-indigo-700">Contractor</span>
        <strong class="text-slate-900 block mt-1">Viste Engineering Consulting</strong>
        <p class="text-slate-600 mt-0.5">VAT: DK-98201944 • Strandvejen 102, 2900 Hellerup</p>
      </div>
    </div>
  </div>

  <!-- Numbered Contract Sections -->
  <div class="mt-6 space-y-4 text-xs text-slate-700">
    <div>
      <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">1. Scope of Work &amp; Deliverables</h2>
      <p class="mt-1 leading-normal text-slate-600">
        Contractor agrees to perform cloud rendering infrastructure optimization, Playwright browser pool scaling, and Factur-X XML validation tools as detailed in Exhibit A.
      </p>
    </div>

    <div>
      <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">2. Compensation &amp; Invoicing</h2>
      <p class="mt-1 leading-normal text-slate-600">
        Client shall compensate Contractor at the fixed rate of <strong class="text-slate-900">€ 140.00 / hour</strong>, invoiced bi-weekly with 14-day payment terms via SEPA bank transfer.
      </p>
    </div>

    <div>
      <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">3. Intellectual Property Assignment</h2>
      <p class="mt-1 leading-normal text-slate-600">
        All works, code, models, documentation, and inventions authored by Contractor under this Agreement shall be considered "work made for hire" and are the sole and exclusive property of Client immediately upon creation.
      </p>
    </div>

    <div>
      <h2 class="text-xs font-black text-slate-900 uppercase tracking-wide">4. Independent Contractor Status</h2>
      <p class="mt-1 leading-normal text-slate-600">
        Nothing in this Agreement shall be construed to create an employment, partnership, or joint venture relationship. Contractor is solely responsible for all tax, social security, and pension filings.
      </p>
    </div>
  </div>

  <!-- Dual Signatures (Protected from page breaks) -->
  <div class="break-inside-avoid mt-8 pt-6 border-t-2 border-slate-200">
    <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">IN WITNESS WHEREOF, the parties hereto have executed this Agreement:</p>

    <div class="grid grid-cols-2 gap-8 text-xs">
      <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/60">
        <span class="text-[10px] uppercase font-bold text-slate-400 block">Client Signature</span>
        <div class="h-14 border-b border-dashed border-slate-400 flex items-end pb-1.5">
          <span class="font-serif italic text-lg text-slate-900">Sebastian Viste</span>
        </div>
        <p class="mt-2 text-[11px] text-slate-600">For Antigravity Technologies ApS • Date: Nov 12, 2026</p>
      </div>

      <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/60">
        <span class="text-[10px] uppercase font-bold text-slate-400 block">Contractor Signature</span>
        <div class="h-14 border-b border-dashed border-slate-400 flex items-end pb-1.5">
          <span class="font-serif italic text-lg text-indigo-900">Alexandre Moreau</span>
        </div>
        <p class="mt-2 text-[11px] text-slate-600">For Viste Engineering Consulting • Date: Nov 12, 2026</p>
      </div>
    </div>
  </div>
</div>`,
  },
];
