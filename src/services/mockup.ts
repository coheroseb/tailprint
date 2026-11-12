import { browserService } from './browser.js';

export interface DeviceMockupOptions {
  url: string;
  title?: string;
  delay_ms?: number;
}

export class MockupService {
  private static instance: MockupService | null = null;

  public static getInstance(): MockupService {
    if (!MockupService.instance) {
      MockupService.instance = new MockupService();
    }
    return MockupService.instance;
  }

  /**
   * Captures a website and composites it into a realistic Laptop + Phone device mockup.
   */
  public async renderDeviceMockup(options: DeviceMockupOptions): Promise<Buffer> {
    const { url, title, delay_ms = 600 } = options;
    const effectiveDelay = Math.max(delay_ms, 600);

    // 1. Capture Desktop Viewport (1280x800) with automatic popup/cookie suppression
    const desktopBuffer = await browserService.renderImage({
      url,
      width: 1280,
      height: 800,
      type: 'png',
      delay_ms: effectiveDelay,
      block_popups: true,
    });

    // 2. Capture Mobile Viewport (390x844) with automatic popup/cookie suppression
    const mobileBuffer = await browserService.renderImage({
      url,
      width: 390,
      height: 844,
      type: 'png',
      delay_ms: effectiveDelay,
      block_popups: true,
    });

    const desktopDataUri = `data:image/png;base64,${desktopBuffer.toString('base64')}`;
    const mobileDataUri = `data:image/png;base64,${mobileBuffer.toString('base64')}`;

    let parsedDomain = url;
    try {
      parsedDomain = new URL(url).hostname;
    } catch {}

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      width: 1600px;
      height: 1000px;
      background: radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 50%, #020617 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
  </style>
</head>
<body class="p-12 text-white">

  <!-- Top Info Badge -->
  <div class="flex items-center justify-between z-10">
    <div class="flex items-center space-x-3">
      <div class="px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md flex items-center space-x-2 text-xs font-mono text-slate-300 shadow-xl">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>${parsedDomain}</span>
      </div>
      ${
        title
          ? `<span class="text-sm font-bold text-slate-300 tracking-tight">${title}</span>`
          : ''
      }
    </div>
    <div class="text-xs font-mono text-slate-500">
      Multi-Device Responsive Mockup • Tailprint Engine
    </div>
  </div>

  <!-- Devices Stage Container -->
  <div class="relative w-full h-[820px] flex items-center justify-center">

    <!-- Desktop / Laptop Frame -->
    <div class="absolute left-10 bottom-6 w-[1050px] shadow-2xl shadow-black/90 z-10 transition">
      <!-- Laptop Screen Shell -->
      <div class="rounded-t-2xl bg-slate-900 p-3 border-t-2 border-x-2 border-slate-700/80 shadow-inner">
        <!-- Top Screen Bezel with Camera -->
        <div class="flex items-center justify-center pb-2">
          <div class="w-2 h-2 rounded-full bg-slate-800 border border-slate-700"></div>
        </div>
        <!-- Screen Content Container -->
        <div class="w-full h-[580px] rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
          <img src="${desktopDataUri}" class="w-full h-full object-cover object-top" />
        </div>
      </div>
      <!-- Laptop Base / Keyboard Deck -->
      <div class="relative h-4 bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-xl border-t border-slate-600 shadow-lg flex justify-center">
        <div class="w-24 h-1.5 bg-slate-900 rounded-b-md"></div>
      </div>
      <div class="h-1 bg-slate-900/50 rounded-b-full mx-6 blur-[1px]"></div>
    </div>

    <!-- Mobile / iPhone Floating Frame (Overlapping Bottom Right) -->
    <div class="absolute right-14 bottom-12 w-[340px] h-[700px] rounded-[48px] p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl shadow-black z-20 flex flex-col justify-between">
      <!-- Outer Antenna Lines & Bezel -->
      <div class="relative w-full h-full rounded-[40px] overflow-hidden bg-black border border-slate-800">
        <!-- Dynamic Island Notch -->
        <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-end px-2">
          <div class="w-2.5 h-2.5 rounded-full bg-slate-900/90 border border-slate-800"></div>
        </div>
        <!-- Mobile Screen Content -->
        <img src="${mobileDataUri}" class="w-full h-full object-cover object-top" />
        <!-- Bottom Home Indicator -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-30"></div>
      </div>
    </div>

  </div>

</body>
</html>`;

    return browserService.renderImage({
      html,
      width: 1600,
      height: 1000,
      type: 'png',
      delay_ms: 200,
    });
  }
}

export const mockupService = MockupService.getInstance();
