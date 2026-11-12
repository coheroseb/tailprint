import { browserService } from './browser.js';

export interface SlideItem {
  headline?: string;
  subheadline?: string;
  content: string;
  tag?: string;
  footer?: string;
}

export interface RenderPresentationOptions {
  title?: string;
  author?: string;
  theme?: 'dark' | 'midnight' | 'gradient' | 'minimal';
  markdown?: string;
  slides?: SlideItem[];
}

export interface RenderPresentationResult {
  pdfBuffer: Buffer;
  previewImageBuffer: Buffer;
  totalSlides: number;
}

export class PresentationService {
  private static instance: PresentationService | null = null;

  public static getInstance(): PresentationService {
    if (!PresentationService.instance) {
      PresentationService.instance = new PresentationService();
    }
    return PresentationService.instance;
  }

  /**
   * Parses markdown into structured slide objects.
   * Splits on `---` or `===`.
   */
  public parseMarkdownSlides(markdown: string): SlideItem[] {
    const rawSlides = markdown
      .split(/\n(?:---|===)\n/g)
      .map((s) => s.trim())
      .filter(Boolean);

    return rawSlides.map((raw) => {
      const lines = raw.split('\n').map((l) => l.trim());
      let headline = '';
      let subheadline = '';
      let tag = '';
      const contentLines: string[] = [];

      for (const line of lines) {
        if (!headline && line.startsWith('# ')) {
          headline = line.replace(/^#\s+/, '').trim();
        } else if (!subheadline && line.startsWith('## ')) {
          subheadline = line.replace(/^##\s+/, '').trim();
        } else if (!tag && line.startsWith('[') && line.includes(']')) {
          tag = line.replace(/^\[(.*?)\]$/, '$1').trim();
        } else {
          contentLines.push(line);
        }
      }

      return {
        headline: headline || 'Presentation Slide',
        subheadline: subheadline || undefined,
        tag: tag || undefined,
        content: contentLines.join('\n').trim(),
      };
    });
  }

  /**
   * Generates a 16:9 widescreen vector presentation PDF.
   */
  public async renderPresentation(options: RenderPresentationOptions): Promise<RenderPresentationResult> {
    const {
      title = 'Executive Briefing',
      author = 'Tailprint AI',
      theme = 'dark',
      markdown,
      slides: providedSlides,
    } = options;

    let slides: SlideItem[] = [];
    if (providedSlides && providedSlides.length > 0) {
      slides = providedSlides;
    } else if (markdown) {
      slides = this.parseMarkdownSlides(markdown);
    } else {
      slides = [
        {
          headline: title,
          subheadline: 'Key Insights & Strategic Overview',
          content: '• Overview of quarterly milestones and growth trajectory\n• Key performance drivers and operational efficiencies\n• Next steps and strategic roadmap for Q3/Q4',
          tag: 'Keynote',
        },
      ];
    }

    // Theme color schemes
    const themes: Record<string, { bg: string; cardBg: string; text: string; subtext: string; accent: string; badge: string }> = {
      dark: {
        bg: 'bg-slate-950',
        cardBg: 'bg-slate-900/80 border border-slate-800/80 shadow-2xl',
        text: 'text-white',
        subtext: 'text-slate-400',
        accent: 'text-indigo-400',
        badge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      },
      midnight: {
        bg: 'bg-black',
        cardBg: 'bg-zinc-950 border border-zinc-800 shadow-2xl',
        text: 'text-zinc-50',
        subtext: 'text-zinc-400',
        accent: 'text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      },
      gradient: {
        bg: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950',
        cardBg: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl',
        text: 'text-white',
        subtext: 'text-purple-200/70',
        accent: 'text-cyan-400',
        badge: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20',
      },
      minimal: {
        bg: 'bg-slate-50',
        cardBg: 'bg-white border border-slate-200/80 shadow-lg',
        text: 'text-slate-900',
        subtext: 'text-slate-600',
        accent: 'text-blue-600',
        badge: 'bg-blue-50 text-blue-700 border border-blue-200',
      },
    };

    const currentTheme = themes[theme] || themes.dark;

    const slidesHtml = slides
      .map((slide, idx) => {
        const slideNum = idx + 1;
        const total = slides.length;

        // Render bullet points or text
        const contentLines = slide.content.split('\n').filter(Boolean);
        const formattedContent = contentLines
          .map((line) => {
            const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
            const cleanText = line.replace(/^[•\-*]\s*/, '').trim();
            if (isBullet) {
              return `
                <div class="flex items-start space-x-4 text-2xl leading-relaxed ${currentTheme.text}">
                  <span class="mt-2.5 h-2.5 w-2.5 rounded-full shrink-0 ${theme === 'midnight' ? 'bg-emerald-400' : 'bg-indigo-400'}"></span>
                  <span>${cleanText}</span>
                </div>
              `;
            }
            return `<p class="text-2xl leading-relaxed ${currentTheme.subtext}">${cleanText}</p>`;
          })
          .join('\n');

        return `
          <div class="slide-page w-[1920px] h-[1080px] p-24 flex flex-col justify-between ${currentTheme.bg} relative overflow-hidden" style="page-break-after: always; break-after: page;">
            <!-- Glow effect -->
            <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

            <!-- Header -->
            <div class="flex items-center justify-between border-b border-white/10 pb-6">
              <div class="flex items-center space-x-4">
                <span class="font-bold text-xl tracking-wider uppercase ${currentTheme.accent}">${title}</span>
                ${slide.tag ? `<span class="px-3.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${currentTheme.badge}">${slide.tag}</span>` : ''}
              </div>
              <div class="text-sm font-medium ${currentTheme.subtext}">${author}</div>
            </div>

            <!-- Slide Body -->
            <div class="my-auto max-w-5xl">
              <h1 class="text-6xl font-extrabold tracking-tight ${currentTheme.text} mb-4">${slide.headline}</h1>
              ${slide.subheadline ? `<h2 class="text-3xl font-medium ${currentTheme.accent} mb-10">${slide.subheadline}</h2>` : '<div class="h-6"></div>'}
              <div class="space-y-6 mt-6">
                ${formattedContent}
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between border-t border-white/10 pt-6 text-sm font-semibold ${currentTheme.subtext}">
              <div>${slide.footer || 'Confidential & Proprietary'}</div>
              <div class="font-mono">Slide ${slideNum} / ${total}</div>
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
      size: 1920px 1080px;
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
      width: 1920px;
      height: 1080px;
      page-break-after: always;
      break-after: page;
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>`;

    // 1. Render multi-page vector presentation PDF
    const pdfBuffer = await browserService.renderPdf({
      html: fullHtml,
      landscape: true,
      print_background: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    // 2. Render first slide preview PNG
    const previewImageBuffer = await browserService.renderImage({
      html: fullHtml,
      width: 1920,
      height: 1080,
      type: 'png',
    });

    return {
      pdfBuffer,
      previewImageBuffer,
      totalSlides: slides.length,
    };
  }
}

export const presentationService = PresentationService.getInstance();
