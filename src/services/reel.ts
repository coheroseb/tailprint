import { scraperService } from './scraper.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';

export interface ReelSlide {
  tag?: string;
  headline: string;
  body: string;
  stat?: string;
  statLabel?: string;
}

export interface ReelScript {
  title: string;
  brand: string;
  handle?: string;
  theme: 'cyberpunk' | 'midnight' | 'gradient' | 'sunset' | 'clean';
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
  screenrecordUrl?: string;
  screenrecordMode?: 'inset' | 'backdrop' | 'none';
  slides: ReelSlide[];
  cta: string;
  sourceUrl?: string;
}

export interface RenderReelResult {
  script: ReelScript;
  pdfStored?: { hostedUrl: string; fileId: string };
  previewStored?: { hostedUrl: string; fileId: string };
}

export class ReelService {
  private static instance: ReelService | null = null;

  public static getInstance(): ReelService {
    if (!ReelService.instance) {
      ReelService.instance = new ReelService();
    }
    return ReelService.instance;
  }

  /**
   * Captures a smooth scrolling live video of the webpage via Chromium and saves to CDN.
   */
  public async captureLiveScreenrecord(
    url: string,
    options?: { width?: number; height?: number; durationMs?: number; scrollDistance?: number }
  ): Promise<{ hostedUrl: string; width: number; height: number }> {
    const width = options?.width ?? 720;
    const height = options?.height ?? 1280;
    const buffer = await browserService.recordWebpageScroll(url, {
      width,
      height,
      durationMs: options?.durationMs ?? 3500,
      scrollDistance: options?.scrollDistance ?? 900,
    });

    const stored = await storageService.saveFile(buffer, {
      mimeType: 'video/webm',
      extension: 'webm',
      filename: 'live-screenrecord.webm',
    });

    return {
      hostedUrl: stored.hostedUrl,
      width,
      height,
    };
  }

  /**
   * Scrapes any public URL and synthesizes a punchy 4-5 slide vertical Reel / Story script.
   * Optionally captures a live scrolling screen recording of the target website in parallel.
   */
  public async generateScriptFromUrl(url: string, includeScreenrecord = false): Promise<ReelScript> {
    const scrapePromise = scraperService.scrapeUrl({
      url,
      strip_images: true,
      include_raw_html: false,
      timeout_ms: 10000,
    });

    const recordPromise = includeScreenrecord
      ? this.captureLiveScreenrecord(url).catch((err) => {
          console.warn('[ReelService] Screenrecord failed, continuing with script:', err);
          return null;
        })
      : Promise.resolve(null);

    const [scraped, screenrecord] = await Promise.all([scrapePromise, recordPromise]);

    // Derive brand from domain
    let brand = 'Insights';
    try {
      const parsed = new URL(url);
      brand = parsed.hostname.replace(/^www\./, '').split('.')[0];
      brand = brand.charAt(0).toUpperCase() + brand.slice(1);
    } catch {}

    const title = scraped.title || 'Breaking Industry Insights';

    // Break markdown into key sentences/paragraphs
    const rawLines = scraped.markdown
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20 && !l.startsWith('#') && !l.startsWith('!'));

    const slides: ReelSlide[] = [];

    // Slide 1: Hook
    slides.push({
      tag: 'THE BREAKTHROUGH',
      headline: title.length > 60 ? title.slice(0, 57) + '...' : title,
      body: 'Here is what you need to know in under 30 seconds.',
    });

    // Slide 2: The Core Problem or Context
    const line1 = rawLines[0] || 'Modern systems demand faster execution with zero maintenance overhead.';
    slides.push({
      tag: 'THE REALITY',
      headline: 'The Hidden Bottleneck',
      body: line1.slice(0, 160),
    });

    // Slide 3: Key Takeaway or Stat
    const line2 = rawLines[1] || 'Teams spend over 40% of development hours maintaining fragile infrastructure.';
    slides.push({
      tag: 'KEY INSIGHT',
      headline: 'The Turning Point',
      body: line2.slice(0, 160),
      stat: '90%+',
      statLabel: 'Efficiency Boost',
    });

    // Slide 4: Actionable Tip
    const line3 = rawLines[2] || 'Automate repetitive workflows with autonomous tools and modern APIs.';
    slides.push({
      tag: 'HOW TO WIN',
      headline: 'Actionable Takeaway',
      body: line3.slice(0, 160),
    });

    return {
      title,
      brand,
      handle: `@${brand.toLowerCase()}`,
      theme: 'gradient',
      aspectRatio: '9:16',
      screenrecordUrl: screenrecord?.hostedUrl,
      screenrecordMode: screenrecord ? 'inset' : 'none',
      slides,
      cta: 'Follow for more • Link in bio',
      sourceUrl: url,
    };
  }

  /**
   * Generates a 9:16 vertical (1080x1920) multi-page PDF story deck and cover preview.
   */
  public async renderReelDeck(script: ReelScript): Promise<RenderReelResult> {
    const themeStyles: Record<string, { bg: string; text: string; subtext: string; tagBg: string; tagText: string; accent: string }> = {
      gradient: {
        bg: 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950',
        text: 'text-white',
        subtext: 'text-purple-200/80',
        tagBg: 'bg-indigo-500/20 border border-indigo-500/40',
        tagText: 'text-indigo-300',
        accent: 'text-cyan-400',
      },
      cyberpunk: {
        bg: 'bg-zinc-950',
        text: 'text-yellow-400 font-mono',
        subtext: 'text-zinc-300 font-mono',
        tagBg: 'bg-yellow-400/10 border border-yellow-400/40',
        tagText: 'text-yellow-300',
        accent: 'text-pink-500',
      },
      midnight: {
        bg: 'bg-black',
        text: 'text-zinc-50',
        subtext: 'text-zinc-400',
        tagBg: 'bg-emerald-500/15 border border-emerald-500/30',
        tagText: 'text-emerald-400',
        accent: 'text-emerald-400',
      },
      sunset: {
        bg: 'bg-gradient-to-b from-rose-950 via-slate-950 to-amber-950',
        text: 'text-white',
        subtext: 'text-rose-200/80',
        tagBg: 'bg-rose-500/20 border border-rose-500/40',
        tagText: 'text-rose-300',
        accent: 'text-amber-400',
      },
      clean: {
        bg: 'bg-slate-50',
        text: 'text-slate-950',
        subtext: 'text-slate-600',
        tagBg: 'bg-blue-100 border border-blue-200',
        tagText: 'text-blue-700',
        accent: 'text-blue-600',
      },
    };

    const currentTheme = themeStyles[script.theme] || themeStyles.gradient;
    const aspect = script.aspectRatio || '9:16';
    const dimensions: Record<string, { width: number; height: number }> = {
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '16:9': { width: 1920, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
    };
    const { width, height } = dimensions[aspect] || dimensions['9:16'];

    const slidesHtml = script.slides
      .map((slide, idx) => {
        const slideNum = idx + 1;
        const total = script.slides.length;

        const isLandscape = aspect === '16:9';
        const isSquare = aspect === '1:1';
        const paddingClass = isSquare ? 'p-12' : isLandscape ? 'p-16' : 'p-20';

        return `
        <div class="slide-page w-[${width}px] h-[${height}px] ${paddingClass} flex flex-col justify-between ${currentTheme.bg} relative overflow-hidden" style="page-break-after: always; break-after: page;">
          <!-- Top ambient radial glow -->
          <div class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none"></div>

          <!-- Top Progress Bar (Reel Style) -->
          <div class="z-10">
            <div class="flex items-center space-x-2 w-full mb-6">
              ${Array.from({ length: total })
                .map((_, i) => `<div class="h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-white' : 'bg-white/20'}"></div>`)
                .join('')}
            </div>

            <!-- Author & Brand Header -->
            <div class="flex items-center justify-between border-b border-white/10 pb-5">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
                  ${script.brand.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div class="font-extrabold text-xl text-white tracking-tight">${script.brand}</div>
                  <div class="text-xs font-medium ${currentTheme.subtext}">${script.handle || '@insights'}</div>
                </div>
              </div>
              <div class="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentTheme.tagBg} ${currentTheme.tagText}">
                ${slide.tag || `0${slideNum}`}
              </div>
            </div>
          </div>

          <!-- Main Reel Slide Body (Responsive to Aspect Ratio) -->
          ${
            isLandscape
              ? `
            <div class="grid grid-cols-2 gap-12 my-auto z-10 items-center">
              <div class="space-y-6">
                <h1 class="text-5xl font-black tracking-tight leading-tight ${currentTheme.text}">
                  ${slide.headline}
                </h1>
                ${
                  slide.stat
                    ? `
                  <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center space-x-5">
                    <span class="text-6xl font-black ${currentTheme.accent}">${slide.stat}</span>
                    <span class="text-xl font-bold text-white uppercase tracking-wider">${slide.statLabel || 'Metric'}</span>
                  </div>
                `
                    : ''
                }
              </div>
              <div class="space-y-6">
                <p class="text-2xl font-medium leading-relaxed ${currentTheme.subtext}">
                  ${slide.body}
                </p>
              </div>
            </div>
          `
              : `
            <div class="my-auto z-10 max-w-3xl space-y-6">
              <h1 class="${isSquare ? 'text-4xl' : 'text-6xl'} font-black tracking-tight leading-tight ${currentTheme.text}">
                ${slide.headline}
              </h1>
              
              ${
                slide.stat
                  ? `
                <div class="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center space-x-6">
                  <span class="${isSquare ? 'text-5xl' : 'text-7xl'} font-black ${currentTheme.accent}">${slide.stat}</span>
                  <span class="${isSquare ? 'text-lg' : 'text-2xl'} font-bold text-white uppercase tracking-wider">${slide.statLabel || 'Growth Metric'}</span>
                </div>
              `
                  : ''
              }

              <p class="${isSquare ? 'text-xl' : 'text-3xl'} font-medium leading-relaxed ${currentTheme.subtext}">
                ${slide.body}
              </p>
            </div>
          `
          }

          <!-- Footer / CTA -->
          <div class="z-10 flex items-center justify-between border-t border-white/10 pt-6">
            <div class="flex items-center space-x-3 text-base font-bold text-white">
              <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${script.cta}</span>
            </div>
            <div class="text-sm font-mono font-bold ${currentTheme.subtext}">
              Slide ${slideNum} / ${total}
            </div>
          </div>
        </div>
      `;
      })
      .join('\n');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: ${width}px ${height}px;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      background: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slide-page {
      box-sizing: border-box;
      width: ${width}px;
      height: ${height}px;
      page-break-after: always;
      break-after: page;
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>`;

    // 1. Render multi-page vector PDF
    const pdfBuffer = await browserService.renderPdf({
      html: fullHtml,
      format: 'A4',
      print_background: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    // 2. Render cover preview PNG (Slide 1)
    const previewBuffer = await browserService.renderImage({
      html: fullHtml,
      width,
      height,
      type: 'png',
    });

    const pdfStored = await storageService.saveFile(pdfBuffer, {
      mimeType: 'application/pdf',
      extension: 'pdf',
      filename: 'social-reel-story.pdf',
    });

    const previewStored = await storageService.saveFile(previewBuffer, {
      mimeType: 'image/png',
      extension: 'png',
      filename: 'social-reel-cover.png',
    });

    return {
      script,
      pdfStored: { hostedUrl: pdfStored.hostedUrl, fileId: pdfStored.fileId },
      previewStored: { hostedUrl: previewStored.hostedUrl, fileId: previewStored.fileId },
    };
  }
}

export const reelService = ReelService.getInstance();
