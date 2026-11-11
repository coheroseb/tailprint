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
        Strandboulevarden 42, 3. th.<br>
        2100 Copenhagen Ø<br>
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
      <p class="text-[11px] text-neutral-500 mt-0.5">Strandgade 14, 1401 København K</p>
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
];
