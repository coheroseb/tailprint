import { browserService } from './browser.js';

export interface GenerateSocialCardOptions {
  title: string;
  description?: string;
  category?: string;
  authorName?: string;
  authorHandle?: string;
  brandName?: string;
  theme?: 'dark' | 'light' | 'gradient' | 'cyberpunk' | 'emerald' | 'amber';
  badge?: string;
  readingTime?: string;
}

export class SocialCardService {
  private static instance: SocialCardService | null = null;

  public static getInstance(): SocialCardService {
    if (!SocialCardService.instance) {
      SocialCardService.instance = new SocialCardService();
    }
    return SocialCardService.instance;
  }

  /**
   * Generates a 1200x630 pixel-perfect Open Graph / Twitter social banner image.
   */
  public async generateSocialCard(options: GenerateSocialCardOptions): Promise<Buffer> {
    const {
      title,
      description,
      category = 'Engineering',
      authorName,
      authorHandle,
      brandName = 'Tailprint',
      theme = 'dark',
      badge,
      readingTime,
    } = options;

    const themes: Record<string, { bg: string; cardBorder: string; text: string; desc: string; tagBg: string; tagText: string; accentGlow: string }> = {
      dark: {
        bg: 'bg-slate-950',
        cardBorder: 'border-slate-800',
        text: 'text-white',
        desc: 'text-slate-400',
        tagBg: 'bg-indigo-500/10 border border-indigo-500/30',
        tagText: 'text-indigo-400',
        accentGlow: 'bg-indigo-600/20',
      },
      gradient: {
        bg: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950',
        cardBorder: 'border-purple-500/30',
        text: 'text-white',
        desc: 'text-purple-200/80',
        tagBg: 'bg-cyan-500/20 border border-cyan-400/30',
        tagText: 'text-cyan-300',
        accentGlow: 'bg-fuchsia-600/30',
      },
      cyberpunk: {
        bg: 'bg-zinc-950',
        cardBorder: 'border-yellow-400/40',
        text: 'text-yellow-400 font-mono',
        desc: 'text-zinc-300 font-mono',
        tagBg: 'bg-yellow-400/10 border border-yellow-400/40',
        tagText: 'text-yellow-300',
        accentGlow: 'bg-yellow-500/20',
      },
      emerald: {
        bg: 'bg-slate-950',
        cardBorder: 'border-emerald-800/60',
        text: 'text-white',
        desc: 'text-emerald-100/70',
        tagBg: 'bg-emerald-500/15 border border-emerald-500/30',
        tagText: 'text-emerald-400',
        accentGlow: 'bg-emerald-600/20',
      },
      amber: {
        bg: 'bg-stone-950',
        cardBorder: 'border-amber-800/60',
        text: 'text-white',
        desc: 'text-stone-300',
        tagBg: 'bg-amber-500/15 border border-amber-500/30',
        tagText: 'text-amber-400',
        accentGlow: 'bg-amber-600/20',
      },
      light: {
        bg: 'bg-slate-50',
        cardBorder: 'border-slate-200 shadow-xl',
        text: 'text-slate-900',
        desc: 'text-slate-600',
        tagBg: 'bg-indigo-50 border border-indigo-200',
        tagText: 'text-indigo-700',
        accentGlow: 'bg-blue-300/30',
      },
    };

    const currentTheme = themes[theme] || themes.dark;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 1200px;
      height: 630px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body class="${currentTheme.bg} flex flex-col justify-between p-16 relative">
  <!-- Radial background glow -->
  <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full ${currentTheme.accentGlow} blur-3xl pointer-events-none"></div>
  <div class="absolute -bottom-32 -left-32 w-80 h-80 rounded-full ${currentTheme.accentGlow} blur-3xl pointer-events-none"></div>

  <!-- Header -->
  <div class="flex items-center justify-between z-10">
    <div class="flex items-center space-x-3">
      <span class="px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider ${currentTheme.tagBg} ${currentTheme.tagText}">
        ${category}
      </span>
      ${badge ? `<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">${badge}</span>` : ''}
    </div>
    <div class="flex items-center space-x-2 text-sm font-medium ${currentTheme.desc}">
      <span class="font-bold tracking-tight text-white">${brandName}</span>
      ${readingTime ? `<span>•</span><span>${readingTime}</span>` : ''}
    </div>
  </div>

  <!-- Main Content -->
  <div class="my-auto z-10 max-w-4xl">
    <h1 class="text-5xl font-extrabold tracking-tight leading-tight ${currentTheme.text} mb-4">
      ${title}
    </h1>
    ${description ? `<p class="text-2xl leading-relaxed ${currentTheme.desc} line-clamp-2">${description}</p>` : ''}
  </div>

  <!-- Footer / Author -->
  <div class="flex items-center justify-between border-t border-white/10 pt-6 z-10">
    <div class="flex items-center space-x-4">
      ${
        authorName
          ? `
        <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
          ${authorName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div class="font-bold text-base ${currentTheme.text}">${authorName}</div>
          ${authorHandle ? `<div class="text-xs font-mono ${currentTheme.desc}">${authorHandle}</div>` : ''}
        </div>
      `
          : `
        <div class="text-sm font-medium ${currentTheme.desc}">Verified Tailprint Engine</div>
      `
      }
    </div>
    <div class="flex items-center space-x-2 text-xs font-mono ${currentTheme.desc}">
      <span>1200 × 630</span>
      <span>•</span>
      <span>High DPI OG Card</span>
    </div>
  </div>
</body>
</html>`;

    return browserService.renderImage({
      html: htmlContent,
      width: 1200,
      height: 630,
      type: 'png',
    });
  }
}

export const socialCardService = SocialCardService.getInstance();
