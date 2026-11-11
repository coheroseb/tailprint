import { browserService } from './browser.js';
import { storageService, type StoredFileMetadata } from './storage.js';

export interface CarouselSlide {
  headline: string;
  content: string | string[];
  tag?: string;
  takeaway?: string;
  slideNumber?: number;
}

export interface CarouselOptions {
  title?: string;
  subtitle?: string;
  author?: {
    name: string;
    handle?: string;
    role?: string;
    avatarUrl?: string;
  };
  theme?: 'dark' | 'light' | 'emerald' | 'gradient';
  slides?: CarouselSlide[];
  markdown?: string;
}

export interface RenderCarouselResult {
  pdfBuffer: Buffer;
  previewImageBuffer: Buffer;
  slideCount: number;
  pdfStored?: StoredFileMetadata;
  previewStored?: StoredFileMetadata;
}

export class CarouselService {
  private static instance: CarouselService | null = null;

  private constructor() {}

  public static getInstance(): CarouselService {
    if (!CarouselService.instance) {
      CarouselService.instance = new CarouselService();
    }
    return CarouselService.instance;
  }

  /**
   * Parses simple markdown divided by "---" into carousel slides.
   */
  public parseMarkdownToSlides(markdown: string): CarouselSlide[] {
    const rawSlides = markdown.split(/\n\s*---\s*\n/).filter((s) => s.trim().length > 0);
    const slides: CarouselSlide[] = [];

    for (let i = 0; i < rawSlides.length; i++) {
      const lines = rawSlides[i].trim().split('\n');
      let headline = '';
      let tag = `SLIDE 0${i + 1}`;
      let takeaway = '';
      const contentLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
          headline = trimmed.replace(/^#+\s*/, '');
        } else if (trimmed.toLowerCase().startsWith('tag:') || trimmed.toLowerCase().startsWith('category:')) {
          tag = trimmed.replace(/^(tag|category):\s*/i, '');
        } else if (trimmed.toLowerCase().startsWith('takeaway:') || trimmed.toLowerCase().startsWith('pro tip:')) {
          takeaway = trimmed.replace(/^(takeaway|pro tip):\s*/i, '');
        } else if (trimmed.length > 0) {
          contentLines.push(trimmed);
        }
      }

      if (!headline && contentLines.length > 0) {
        headline = contentLines.shift() || `Insight #${i + 1}`;
      }

      slides.push({
        headline: headline || `Key Takeaway #${i + 1}`,
        content: contentLines.length > 0 ? contentLines : 'Follow this framework to streamline your workflow.',
        tag,
        takeaway: takeaway || undefined,
        slideNumber: i + 1,
      });
    }

    return slides;
  }

  /**
   * Generates a multi-page 1080x1350 px carousel PDF (LinkedIn standard)
   * and a high-resolution PNG preview of the cover slide.
   */
  public async renderCarousel(options: CarouselOptions): Promise<RenderCarouselResult> {
    let slides: CarouselSlide[] = [];

    if (options.slides && options.slides.length > 0) {
      slides = options.slides.map((s, idx) => ({
        ...s,
        slideNumber: s.slideNumber || idx + 1,
        tag: s.tag || `0${idx + 1}`,
      }));
    } else if (options.markdown) {
      slides = this.parseMarkdownToSlides(options.markdown);
    } else {
      slides = [
        {
          headline: options.title || '10x Your Productivity with AI Automation',
          content: 'Modern tools allow agents to execute complex visual workflows without human intervention.',
          tag: 'FRAMEWORK',
          takeaway: 'Autonomous tools convert natural language into production assets.',
          slideNumber: 1,
        },
        {
          headline: 'Eliminate Browser Infrastructure',
          content: [
            'Running headless Chrome locally causes OOM crashes and zombie processes.',
            'Cloud render engines give you sub-500ms execution with zero server maintenance.',
            'Directly render Tailwind HTML without build steps.',
          ],
          tag: 'INFRASTRUCTURE',
          takeaway: 'Focus on your core app; let specialized microservices handle rendering.',
          slideNumber: 2,
        },
        {
          headline: 'Start Automating Today',
          content: 'Connect Tailprint to your agent runtime and generate print-ready PDFs in seconds.',
          tag: 'NEXT STEPS',
          takeaway: 'Save this post and follow for weekly architectural blueprints.',
          slideNumber: 3,
        },
      ];
    }

    const totalSlides = slides.length;
    const authorName = options.author?.name || 'Tailprint Insights';
    const authorHandle = options.author?.handle || '@tailprint';
    const authorRole = options.author?.role || 'High-Performance PDF & Render Engine';
    const theme = options.theme || 'dark';

    // Theme color palette definitions
    const themeStyles = {
      dark: {
        bg: 'bg-[#080c14]',
        border: 'border-slate-800',
        textHeadline: 'text-white',
        textContent: 'text-slate-300',
        cardBg: 'bg-slate-900/80',
        accentGradient: 'from-indigo-500 to-purple-500',
        accentText: 'text-indigo-400',
        tagBg: 'bg-indigo-950/70 border-indigo-800/50 text-indigo-300',
        takeawayBox: 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200',
      },
      light: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        textHeadline: 'text-slate-900',
        textContent: 'text-slate-700',
        cardBg: 'bg-white',
        accentGradient: 'from-blue-600 to-indigo-600',
        accentText: 'text-indigo-600',
        tagBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        takeawayBox: 'bg-indigo-50 border-indigo-300 text-indigo-900',
      },
      emerald: {
        bg: 'bg-[#06110f]',
        border: 'border-emerald-900/50',
        textHeadline: 'text-white',
        textContent: 'text-slate-300',
        cardBg: 'bg-slate-900/80',
        accentGradient: 'from-emerald-400 to-teal-400',
        accentText: 'text-emerald-400',
        tagBg: 'bg-emerald-950/70 border-emerald-800/50 text-emerald-300',
        takeawayBox: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
      },
      gradient: {
        bg: 'bg-gradient-to-br from-[#0a0e1c] via-[#09152e] to-[#0a0e1c]',
        border: 'border-indigo-800/40',
        textHeadline: 'text-white',
        textContent: 'text-slate-200',
        cardBg: 'bg-slate-900/60',
        accentGradient: 'from-purple-400 via-pink-400 to-amber-300',
        accentText: 'text-pink-400',
        tagBg: 'bg-purple-950/70 border-purple-800/50 text-purple-300',
        takeawayBox: 'bg-purple-950/40 border-pink-500/30 text-pink-200',
      },
    }[theme];

    // Build multi-page HTML
    const slidesHtml = slides
      .map((slide, index) => {
        const isCover = index === 0;
        const isLast = index === totalSlides - 1;
        const slideNum = index + 1;

        const contentHtml = Array.isArray(slide.content)
          ? `<ul class="space-y-6 text-2xl ${themeStyles.textContent}">
              ${slide.content
                .map(
                  (c) => `<li class="flex items-start space-x-4">
                  <span class="flex-shrink-0 w-8 h-8 rounded-full ${themeStyles.tagBg} flex items-center justify-center text-base font-bold mt-1">✓</span>
                  <span class="leading-relaxed">${c}</span>
                </li>`
                )
                .join('')}
            </ul>`
          : `<p class="text-3xl leading-relaxed ${themeStyles.textContent} font-normal">${slide.content}</p>`;

        return `
    <div class="slide ${themeStyles.bg} flex flex-col justify-between p-20 relative">
      
      <!-- Top Decorative Glow -->
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br ${themeStyles.accentGradient} opacity-20 blur-3xl pointer-events-none rounded-full"></div>

      <!-- Slide Header -->
      <header class="flex items-center justify-between pb-8 border-b ${themeStyles.border} relative z-10">
        <div class="flex items-center space-x-5">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr ${themeStyles.accentGradient} p-0.5 shadow-lg">
            <div class="w-full h-full bg-[#080c14] rounded-2xl flex items-center justify-center font-black text-xl text-white">
              ${authorName.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div>
            <div class="text-2xl font-bold ${themeStyles.textHeadline}">${authorName}</div>
            <div class="text-lg text-slate-400 font-medium">${authorRole}</div>
          </div>
        </div>

        <div class="px-5 py-2 rounded-full text-sm font-black tracking-wider uppercase border ${themeStyles.tagBg}">
          ${slide.tag || `PART 0${slideNum}`}
        </div>
      </header>

      <!-- Center Slide Main Content -->
      <main class="my-auto py-12 relative z-10 space-y-10">
        
        <h2 class="text-6xl sm:text-7xl font-black ${themeStyles.textHeadline} tracking-tight leading-[1.15]">
          ${slide.headline}
        </h2>

        <div class="pt-4">
          ${contentHtml}
        </div>

        ${
          slide.takeaway
            ? `<div class="p-8 rounded-3xl border ${themeStyles.takeawayBox} shadow-xl backdrop-blur-sm">
                <div class="text-xs font-black uppercase tracking-wider mb-2 opacity-80">💡 Key Takeaway</div>
                <div class="text-2xl font-bold leading-snug">${slide.takeaway}</div>
              </div>`
            : ''
        }

      </main>

      <!-- Slide Footer & Pagination Strip -->
      <footer class="pt-8 border-t ${themeStyles.border} flex items-center justify-between relative z-10 text-xl text-slate-400 font-mono">
        <div class="flex items-center space-x-3">
          <span class="font-bold ${themeStyles.accentText}">${authorHandle}</span>
          <span>•</span>
          <span class="text-slate-500">${slideNum} / ${totalSlides}</span>
        </div>

        <div class="flex items-center space-x-4">
          ${
            isLast
              ? `<div class="px-6 py-2.5 rounded-2xl bg-gradient-to-r ${themeStyles.accentGradient} text-white font-black text-base shadow-lg">
                  📌 Save & Share
                </div>`
              : `<div class="flex items-center space-x-2 font-bold ${themeStyles.accentText}">
                  <span>Swipe</span>
                  <span>→</span>
                </div>`
          }
        </div>
      </footer>

    </div>`;
      })
      .join('\n');

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: 1080px 1350px;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: transparent;
      -webkit-print-color-adjust: exact;
    }
    .slide {
      width: 1080px;
      height: 1350px;
      page-break-after: always;
      box-sizing: border-box;
      overflow: hidden;
    }
    .slide:last-child {
      page-break-after: avoid;
    }
  </style>
</head>
<body class="m-0 p-0 font-sans antialiased">
  ${slidesHtml}
</body>
</html>`;

    // 1. Render multi-page vector PDF for LinkedIn
    const pdfBuffer = await browserService.renderPdf({
      html: fullHtml,
      format: 'A4', // overridden by CSS @page size 1080px 1350px
      print_background: true,
    });

    // 2. Render cover slide as high-res PNG preview
    const previewImageBuffer = await browserService.renderImage({
      html: fullHtml,
      width: 1080,
      height: 1350,
      type: 'png',
      delay_ms: 100,
    });

    // 3. Store on Tailprint Hosted CDN
    const pdfStored = await storageService.saveFile(pdfBuffer, {
      mimeType: 'application/pdf',
      extension: 'pdf',
      filename: 'linkedin-carousel.pdf',
    });

    const previewStored = await storageService.saveFile(previewImageBuffer, {
      mimeType: 'image/png',
      extension: 'png',
      filename: 'carousel-cover.png',
    });

    return {
      pdfBuffer,
      previewImageBuffer,
      slideCount: totalSlides,
      pdfStored,
      previewStored,
    };
  }
}

export const carouselService = CarouselService.getInstance();
