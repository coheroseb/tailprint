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
   * Scrapes any public URL and synthesizes a punchy 4-5 slide vertical Reel / Story script.
   */
  public async generateScriptFromUrl(url: string): Promise<ReelScript> {
    const scraped = await scraperService.scrapeUrl({
      url,
      strip_images: true,
      include_raw_html: false,
      timeout_ms: 10000,
    });

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

    const slidesHtml = script.slides
      .map((slide, idx) => {
        const slideNum = idx + 1;
        const total = script.slides.length;

        return `
        <div class="slide-page w-[1080px] h-[1920px] p-20 flex flex-col justify-between ${currentTheme.bg} relative overflow-hidden" style="page-break-after: always; break-after: page;">
          <!-- Top ambient radial glow -->
          <div class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none"></div>

          <!-- Top Progress Bar (Reel Style) -->
          <div class="z-10">
            <div class="flex items-center space-x-2 w-full mb-8">
              ${Array.from({ length: total })
                .map((_, i) => `<div class="h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-white' : 'bg-white/20'}"></div>`)
                .join('')}
            </div>

            <!-- Author & Brand Header -->
            <div class="flex items-center justify-between border-b border-white/10 pb-6">
              <div class="flex items-center space-x-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30">
                  ${script.brand.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div class="font-extrabold text-2xl text-white tracking-tight">${script.brand}</div>
                  <div class="text-sm font-medium ${currentTheme.subtext}">${script.handle || '@insights'}</div>
                </div>
              </div>
              <div class="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${currentTheme.tagBg} ${currentTheme.tagText}">
                ${slide.tag || `0${slideNum}`}
              </div>
            </div>
          </div>

          <!-- Main Reel Slide Body -->
          <div class="my-auto z-10 max-w-3xl space-y-8">
            <h1 class="text-6xl font-black tracking-tight leading-tight ${currentTheme.text}">
              ${slide.headline}
            </h1>
            
            ${
              slide.stat
                ? `
              <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center space-x-6">
                <span class="text-7xl font-black ${currentTheme.accent}">${slide.stat}</span>
                <span class="text-2xl font-bold text-white uppercase tracking-wider">${slide.statLabel || 'Growth Metric'}</span>
              </div>
            `
                : ''
            }

            <p class="text-3xl font-medium leading-relaxed ${currentTheme.subtext}">
              ${slide.body}
            </p>
          </div>

          <!-- Footer / CTA -->
          <div class="z-10 flex items-center justify-between border-t border-white/10 pt-8">
            <div class="flex items-center space-x-3 text-lg font-bold text-white">
              <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${script.cta}</span>
            </div>
            <div class="text-base font-mono font-bold ${currentTheme.subtext}">
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
      size: 1080px 1920px;
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
      width: 1080px;
      height: 1920px;
      page-break-after: always;
      break-after: page;
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>`;

    // 1. Render multi-page 9:16 PDF
    const pdfBuffer = await browserService.renderPdf({
      html: fullHtml,
      format: 'A4',
      print_background: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    // 2. Render cover preview PNG (Slide 1)
    const previewBuffer = await browserService.renderImage({
      html: fullHtml,
      width: 1080,
      height: 1920,
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
