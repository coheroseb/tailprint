import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { browserService } from './browser.js';

export interface CompareSnapshotsParams {
  beforeUrl?: string;
  beforeHtml?: string;
  afterUrl?: string;
  afterHtml?: string;
  beforeImageBase64?: string;
  afterImageBase64?: string;
  width?: number;
  height?: number;
  threshold?: number;
  generateComposite?: boolean;
  delayMs?: number;
}

export interface CompareSnapshotsResult {
  differentPixels: number;
  totalPixels: number;
  diffPercentage: number;
  isIdentical: boolean;
  diffImageBuffer: Buffer;
  compositeImageBuffer: Buffer;
}

export class VisualDiffService {
  private static instance: VisualDiffService | null = null;

  private constructor() {}

  public static getInstance(): VisualDiffService {
    if (!VisualDiffService.instance) {
      VisualDiffService.instance = new VisualDiffService();
    }
    return VisualDiffService.instance;
  }

  private normalizePng(src: PNG, targetWidth: number, targetHeight: number): PNG {
    if (src.width === targetWidth && src.height === targetHeight) {
      return src;
    }
    const out = new PNG({ width: targetWidth, height: targetHeight });
    out.data.fill(0); // Initialize transparent buffer

    for (let y = 0; y < src.height && y < targetHeight; y++) {
      for (let x = 0; x < src.width && x < targetWidth; x++) {
        const srcIdx = (y * src.width + x) * 4;
        const outIdx = (y * targetWidth + x) * 4;
        out.data[outIdx] = src.data[srcIdx];
        out.data[outIdx + 1] = src.data[srcIdx + 1];
        out.data[outIdx + 2] = src.data[srcIdx + 2];
        out.data[outIdx + 3] = src.data[srcIdx + 3];
      }
    }
    return out;
  }

  /**
   * Captures or decodes two snapshots, computes a pixel-by-pixel diff,
   * and creates a studio 3-column visual regression inspection canvas.
   */
  public async compareSnapshots(
    params: CompareSnapshotsParams
  ): Promise<CompareSnapshotsResult> {
    const width = Math.min(Math.max(params.width || 1200, 320), 2560);
    const height = Math.min(Math.max(params.height || 800, 240), 2560);
    const delayMs = params.delayMs !== undefined ? params.delayMs : 300;
    const threshold = params.threshold !== undefined ? params.threshold : 0.1;

    // 1. Resolve Before Snapshot Buffer
    let beforeBuffer: Buffer;
    if (params.beforeImageBase64) {
      const clean = params.beforeImageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();
      beforeBuffer = Buffer.from(clean, 'base64');
    } else if (params.beforeUrl || params.beforeHtml) {
      beforeBuffer = await browserService.renderImage({
        url: params.beforeUrl,
        html: params.beforeHtml,
        width,
        height,
        type: 'png',
        delay_ms: delayMs,
      });
    } else {
      throw new Error('Must provide beforeUrl, beforeHtml, or beforeImageBase64');
    }

    // 2. Resolve After Snapshot Buffer
    let afterBuffer: Buffer;
    if (params.afterImageBase64) {
      const clean = params.afterImageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();
      afterBuffer = Buffer.from(clean, 'base64');
    } else if (params.afterUrl || params.afterHtml) {
      afterBuffer = await browserService.renderImage({
        url: params.afterUrl,
        html: params.afterHtml,
        width,
        height,
        type: 'png',
        delay_ms: delayMs,
      });
    } else {
      throw new Error('Must provide afterUrl, afterHtml, or afterImageBase64');
    }

    // 3. Parse PNGs
    let png1: PNG = PNG.sync.read(beforeBuffer);
    let png2: PNG = PNG.sync.read(afterBuffer);

    const targetWidth = Math.max(png1.width, png2.width);
    const targetHeight = Math.max(png1.height, png2.height);

    png1 = this.normalizePng(png1, targetWidth, targetHeight);
    png2 = this.normalizePng(png2, targetWidth, targetHeight);

    // 4. Compute pixel diff
    const diffPng = new PNG({ width: targetWidth, height: targetHeight });
    const differentPixels = pixelmatch(
      png1.data,
      png2.data,
      diffPng.data,
      targetWidth,
      targetHeight,
      {
        threshold,
        diffColor: [244, 63, 94], // Neon rose/pink #f43f5e for changed pixels
        diffColorAlt: [56, 189, 248], // Sky blue #38bdf8
        alpha: 0.25,
      }
    );

    const totalPixels = targetWidth * targetHeight;
    const diffPercentage = Number(((differentPixels / totalPixels) * 100).toFixed(2));
    const isIdentical = differentPixels === 0;

    const diffImageBuffer = PNG.sync.write(diffPng);

    // 5. Generate 3-Panel Side-by-Side Visual Regression Studio Canvas
    const beforeBase64 = PNG.sync.write(png1).toString('base64');
    const afterBase64 = PNG.sync.write(png2).toString('base64');
    const diffBase64 = diffImageBuffer.toString('base64');

    const badgeColor = isIdentical
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      : diffPercentage < 1.0
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/40';

    const badgeText = isIdentical
      ? '✓ IDENTICAL (0% DIFF)'
      : `⚠ ${diffPercentage}% DIFF (${differentPixels.toLocaleString()} PIXELS)`;

    const compositeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#090d16] text-slate-100 p-8 font-sans antialiased m-0">
  <div class="max-w-[1700px] mx-auto">
    
    <!-- Top Header -->
    <div class="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
      <div class="flex items-center space-x-3">
        <span class="text-2xl">🔍</span>
        <div>
          <h1 class="text-xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Visual Regression Heatmap</span>
            <span class="text-xs font-mono font-normal text-slate-400">(${targetWidth}×${targetHeight}px)</span>
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">Pixelmatch comparison with highlighted layout and color shifts</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <div class="text-right">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status</span>
          <span class="inline-block px-3 py-1 rounded-full text-xs font-black border ${badgeColor}">
            ${badgeText}
          </span>
        </div>
      </div>
    </div>

    <!-- 3-Column Panels -->
    <div class="grid grid-cols-3 gap-6">
      
      <!-- Panel 1: Baseline / Before -->
      <div class="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div class="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <span class="font-bold text-slate-300 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>1. Baseline (Before)</span>
          </span>
          <span class="text-[10px] font-mono text-slate-400">Original</span>
        </div>
        <div class="p-3 bg-slate-950/40">
          <img src="data:image/png;base64,${beforeBase64}" class="w-full h-auto rounded-lg shadow-inner object-contain max-h-[700px]" />
        </div>
      </div>

      <!-- Panel 2: Diff Heatmap -->
      <div class="rounded-2xl bg-slate-900/90 border border-rose-500/40 overflow-hidden shadow-2xl relative ring-1 ring-rose-500/30">
        <div class="px-4 py-2.5 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between text-xs">
          <span class="font-bold text-rose-300 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>2. Heatmap Diff Overlay</span>
          </span>
          <span class="text-[10px] font-mono text-rose-300 font-bold">${diffPercentage}% Changed</span>
        </div>
        <div class="p-3 bg-slate-950/40">
          <img src="data:image/png;base64,${diffBase64}" class="w-full h-auto rounded-lg shadow-inner object-contain max-h-[700px]" />
        </div>
      </div>

      <!-- Panel 3: Current / After -->
      <div class="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div class="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <span class="font-bold text-indigo-300 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>3. Current (After)</span>
          </span>
          <span class="text-[10px] font-mono text-slate-400">Modified</span>
        </div>
        <div class="p-3 bg-slate-950/40">
          <img src="data:image/png;base64,${afterBase64}" class="w-full h-auto rounded-lg shadow-inner object-contain max-h-[700px]" />
        </div>
      </div>

    </div>

    <!-- Footer Stats Strip -->
    <div class="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
      <div class="flex items-center space-x-6">
        <span>Total Pixels: <strong class="text-white">${totalPixels.toLocaleString()}</strong></span>
        <span>Different Pixels: <strong class="${isIdentical ? 'text-emerald-400' : 'text-rose-400'}">${differentPixels.toLocaleString()}</strong></span>
        <span>Matching Threshold: <strong class="text-white">${threshold}</strong></span>
      </div>
      <div class="text-[11px] text-slate-400">Generated by Tailprint Visual Inspector</div>
    </div>

  </div>
</body>
</html>`;

    const compositeImageBuffer = await browserService.renderImage({
      html: compositeHtml,
      width: 1700,
      height: 980,
      type: 'png',
      delay_ms: 150,
    });

    return {
      differentPixels,
      totalPixels,
      diffPercentage,
      isIdentical,
      diffImageBuffer,
      compositeImageBuffer,
    };
  }
}

export const visualDiffService = VisualDiffService.getInstance();
