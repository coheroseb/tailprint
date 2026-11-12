import { scraperService } from './scraper.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { detectPageLanguage, LANGUAGE_PROFILES } from './language.js';

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
  logoUrl?: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  theme: 'brand' | 'cyberpunk' | 'midnight' | 'gradient' | 'sunset' | 'clean';
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
  screenrecordUrl?: string;
  screenrecordMode?: 'inset' | 'backdrop' | 'none';
  language?: string;
  languageLabel?: string;
  slides: ReelSlide[];
  cta: string;
  sourceUrl?: string;
}

export interface RenderReelResult {
  script: ReelScript;
  pdfStored?: { hostedUrl: string; fileId: string };
  previewStored?: { hostedUrl: string; fileId: string };
}

/**
 * Computes a high-contrast brand color palette from a detected website theme color.
 */
export function deriveBrandPalette(themeColor?: string): { primary: string; secondary: string; accent: string } {
  if (themeColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(themeColor.trim())) {
    let hex = themeColor.trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const rDark = Math.max(6, Math.round(r * 0.18));
    const gDark = Math.max(9, Math.round(g * 0.18));
    const bDark = Math.max(16, Math.round(b * 0.18));
    const secondary = `#${rDark.toString(16).padStart(2, '0')}${gDark.toString(16).padStart(2, '0')}${bDark.toString(16).padStart(2, '0')}`;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const accent = luminance > 0.65 ? '#e11d48' : '#38bdf8';

    return {
      primary: `#${hex}`,
      secondary,
      accent,
    };
  }

  return {
    primary: '#4f46e5',
    secondary: '#090d16',
    accent: '#38bdf8',
  };
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
   * Scrapes any public URL and synthesizes a punchy 4-slide vertical Reel / Story script.
   * Automatically detects the page language (da, en, de, etc.) and analyzes what the page
   * is actually about to generate the most relevant, high-converting slides.
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

    // 1. Detect language
    const detected = detectPageLanguage({
      url,
      htmlLangAttr: (scraped as any).language,
      text: scraped.markdown,
    });

    // 2. Try LLM synthesis if API key is present
    const aiScript = await this.trySynthesizeWithLLM(url, scraped, detected).catch(() => null);
    if (aiScript) {
      if (screenrecord) {
        aiScript.screenrecordUrl = screenrecord.hostedUrl;
        aiScript.screenrecordMode = 'inset';
      }
      return aiScript;
    }

    // 3. Built-in Semantic Relevance Analyzer
    return this.synthesizeWithSemanticAnalyzer(url, scraped, detected, screenrecord);
  }

  /**
   * Generates slides using an LLM (Gemini or OpenAI) if an API key is configured.
   */
  private async trySynthesizeWithLLM(
    url: string,
    scraped: any,
    detected: { code: string; label: string; profile: any }
  ): Promise<ReelScript | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) return null;

    const prompt = `Analyze this webpage URL: ${url}
Detected Language: ${detected.label} (${detected.code})
Page Title: ${scraped.title || 'Untitled'}
Page Description: ${scraped.description || ''}
Page Content:
${scraped.markdown.slice(0, 3500)}

TASK:
Synthesize a viral, punchy 4-slide social media Reel / TikTok / Short video script in ${detected.label}.
Every single tag, headline, body text, and stat label MUST be written fluently in ${detected.label}.
Focus strictly on what is most relevant and compelling about this specific webpage.

Respond ONLY with valid JSON in this exact structure:
{
  "brand": "Brand Name",
  "title": "Short Hook Headline",
  "cta": "Call to action in ${detected.label}",
  "slides": [
    {
      "tag": "Short 1-2 word uppercase tag in ${detected.label}",
      "headline": "Punchy Hook Headline (max 50 chars)",
      "body": "Clear 1-2 sentence hook (max 140 chars)"
    },
    {
      "tag": "Problem Tag in ${detected.label}",
      "headline": "The Hidden Bottleneck or Challenge",
      "body": "Why current systems or manual work fail (max 140 chars)"
    },
    {
      "tag": "Insight Tag in ${detected.label}",
      "headline": "Key Differentiator or Breakthrough",
      "body": "The evidence or unique mechanism (max 140 chars)",
      "stat": "Numerical stat like 10x, 99.9%, 100%, 0 kr.",
      "statLabel": "Uppercase Stat Label in ${detected.label}"
    },
    {
      "tag": "Action Tag in ${detected.label}",
      "headline": "Actionable Takeaway or Solution",
      "body": "How to get started or the main benefit (max 140 chars)"
    }
  ]
}`;

    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
            const brandColors = deriveBrandPalette(scraped.theme_color);
            return {
              title: parsed.title || scraped.title || 'Highlights',
              brand: parsed.brand || detected.profile.defaultBrand,
              handle: `@${(parsed.brand || 'brand').toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
              logoUrl: scraped.logo_url || undefined,
              brandColors,
              theme: 'brand',
              aspectRatio: '9:16',
              language: detected.code,
              languageLabel: detected.label,
              slides: parsed.slides,
              cta: parsed.cta || detected.profile.cta,
              sourceUrl: url,
            };
          }
        }
      }
    }

    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
            const brandColors = deriveBrandPalette(scraped.theme_color);
            return {
              title: parsed.title || scraped.title || 'Highlights',
              brand: parsed.brand || detected.profile.defaultBrand,
              handle: `@${(parsed.brand || 'brand').toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
              logoUrl: scraped.logo_url || undefined,
              brandColors,
              theme: 'brand',
              aspectRatio: '9:16',
              language: detected.code,
              languageLabel: detected.label,
              slides: parsed.slides,
              cta: parsed.cta || detected.profile.cta,
              sourceUrl: url,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * High-accuracy semantic relevance and content extractor.
   * Extracts relevant headings, sentences, statistics, and pain points in the target language.
   */
  private synthesizeWithSemanticAnalyzer(
    url: string,
    scraped: any,
    detected: { code: string; label: string; profile: any },
    screenrecord: any
  ): ReelScript {
    const profile = detected.profile;

    // 1. Derive Brand name cleanly
    let brand = profile.defaultBrand;
    try {
      const parsed = new URL(url);
      const hostPart = parsed.hostname.replace(/^www\./, '').split('.')[0];
      brand = hostPart.charAt(0).toUpperCase() + hostPart.slice(1);
    } catch {}

    const rawTitle = (scraped.title || '').trim();
    if (rawTitle) {
      const separators = [' - ', ' | ', ' • ', ' — ', ': '];
      for (const sep of separators) {
        if (rawTitle.includes(sep)) {
          const parts = rawTitle.split(sep).map((p: string) => p.trim());
          const candidate = parts.find((p: string) => p.length >= 2 && p.length <= 25);
          if (candidate && candidate.toLowerCase().replace(/[^a-z]/g, '') === brand.toLowerCase().replace(/[^a-z]/g, '')) {
            brand = candidate;
            break;
          }
        }
      }
    }

    // 2. Extract Headings and clean sentences
    const headings: string[] = [];
    const lines = (scraped.markdown || '').split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed.startsWith('#')) {
        const text = trimmed.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim();
        if (text.length >= 6 && text.length <= 75 && !/cookie|privatliv|gdpr|navigation|menu|vilkår|terms|log ind|sign in/i.test(text)) {
          headings.push(text);
        }
      }
    }

    const cleanSentences: string[] = [];
    const paragraphs = (scraped.markdown || '')
      .split(/\n{2,}/)
      .map((p: string) => p.trim())
      .filter((p: string) => !p.startsWith('#') && !p.startsWith('!') && !p.startsWith('---'));

    for (const para of paragraphs) {
      const cleanPara = para
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^[\s*\-•]+/gm, '')
        .replace(/[*_`]/g, '')
        .trim();

      const sents = cleanPara
        .split(/(?<=[.!?])\s+/)
        .map((s: string) => s.replace(/^[\s*\-•]+/, '').trim())
        .filter((s: string) => s.length >= 25 && s.length <= 220);

      for (const s of sents) {
        if (!/cookie|privatliv|gdpr|terms of service|alle rettigheder|copyright|rights reserved/i.test(s)) {
          cleanSentences.push(s);
        }
      }
    }

    // 3. Build Slide 1: The Core Hook / Promise
    let hookHeadline = headings.length > 0 && headings[0].length <= 55 ? headings[0] : rawTitle;
    if (hookHeadline.length > 55) {
      // Clean brand suffix/prefix
      const sepIdx = Math.max(hookHeadline.indexOf(' - '), hookHeadline.indexOf(' | '));
      if (sepIdx > 0) {
        hookHeadline = hookHeadline.slice(0, sepIdx).trim();
      }
    }
    if (hookHeadline.length > 55) {
      hookHeadline = hookHeadline.slice(0, 52) + '...';
    }

    let hookBody = scraped.description ? scraped.description.trim() : '';
    if (hookBody.length < 20 || hookBody.length > 150) {
      hookBody = cleanSentences[0]
        ? cleanSentences[0].slice(0, 140)
        : `${profile.slide1Hook} ${brand}.`;
    } else if (hookBody.length > 140) {
      hookBody = hookBody.slice(0, 137) + '...';
    }

    const tag1 = profile.code === 'da' ? 'GENNEMBRUDDET' : profile.code === 'de' ? 'DER DURCHBRUCH' : 'THE BREAKTHROUGH';

    // 4. Build Slide 2: The Challenge / Problem / Bottleneck
    const problemScores = cleanSentences.map((sent, idx) => {
      let score = 0;
      const lower = sent.toLowerCase();
      for (const kw of profile.problemKeywords) {
        if (lower.includes(kw)) score += 2;
      }
      return { sent, score, idx };
    });
    problemScores.sort((a, b) => b.score - a.score);

    let problemSent = problemScores[0]?.score > 0 ? problemScores[0].sent : (cleanSentences[1] || profile.fallbackProblemBody);
    if (problemSent.length > 140) {
      problemSent = problemSent.slice(0, 137) + '...';
    }

    const problemHeading = headings.find((h) => profile.problemKeywords.some((kw: string) => h.toLowerCase().includes(kw)))
      || profile.problemHeadlineFallback;

    // 5. Build Slide 3: Key Insight & Metric / Stat
    const statRegex = /(?:\b\d+(?:[.,]\d+)?\s*(?:%|x|ms|s|kr\.?|€|\$|k|M|GB)\b|\b100%\b|\b24\/7\b|\b\d{1,4}\s*(?:\+|brugere|kunder|users|clients)\b)/i;
    let foundStat = profile.defaultStat;
    let foundStatLabel = profile.defaultStatLabel;
    let insightSent = cleanSentences[2] || profile.fallbackInsightBody;

    for (const sent of cleanSentences) {
      const match = sent.match(statRegex);
      if (match && sent !== problemSent) {
        foundStat = match[0].trim().toUpperCase();
        insightSent = sent;

        const lower = sent.toLowerCase();
        if (lower.includes('gdpr') || lower.includes('sikker') || lower.includes('secure')) {
          foundStatLabel = profile.code === 'da' ? 'GDPR-SIKRET' : 'VERIFIED';
        } else if (lower.includes('tid') || lower.includes('hurtig') || lower.includes('speed') || lower.includes('ms')) {
          foundStatLabel = profile.code === 'da' ? 'EFFEKT' : 'SPEED';
        } else if (lower.includes('kr') || lower.includes('eur') || lower.includes('pris') || lower.includes('cost')) {
          foundStatLabel = profile.code === 'da' ? 'PR. MÅNED' : 'PRICE';
        } else if (lower.includes('vækst') || lower.includes('growth') || lower.includes('kunder') || lower.includes('users')) {
          foundStatLabel = profile.code === 'da' ? 'VÆKST' : 'GROWTH';
        } else {
          foundStatLabel = profile.statLabels[0];
        }
        break;
      }
    }
    if (insightSent.length > 140) {
      insightSent = insightSent.slice(0, 137) + '...';
    }

    const insightHeading = headings.find((h) => h !== hookHeadline && !profile.problemKeywords.some((kw: string) => h.toLowerCase().includes(kw)))
      || profile.insightHeadlineFallback;

    // 6. Build Slide 4: Actionable Takeaway / The Solution
    const solutionScores = cleanSentences.map((sent, idx) => {
      let score = 0;
      if (sent === problemSent || sent === insightSent) return { sent, score: -10, idx };
      const lower = sent.toLowerCase();
      for (const kw of profile.solutionKeywords) {
        if (lower.includes(kw)) score += 2;
      }
      return { sent, score, idx };
    });
    solutionScores.sort((a, b) => b.score - a.score);

    let solutionSent = solutionScores[0]?.score > 0 ? solutionScores[0].sent : (cleanSentences[3] || profile.fallbackActionBody);
    if (solutionSent.length > 140) {
      solutionSent = solutionSent.slice(0, 137) + '...';
    }

    const solutionHeading = headings.find((h) => profile.solutionKeywords.some((kw: string) => h.toLowerCase().includes(kw)))
      || profile.actionHeadlineFallback;

    // Assemble structured slides
    const slides: ReelSlide[] = [
      {
        tag: tag1,
        headline: hookHeadline,
        body: hookBody,
      },
      {
        tag: profile.problemTag,
        headline: problemHeading,
        body: problemSent,
      },
      {
        tag: profile.insightTag,
        headline: insightHeading,
        body: insightSent,
        stat: foundStat,
        statLabel: foundStatLabel,
      },
      {
        tag: profile.actionTag,
        headline: solutionHeading,
        body: solutionSent,
      },
    ];

    const brandColors = deriveBrandPalette(scraped.theme_color);
    const logoUrl = scraped.logo_url || undefined;

    return {
      title: hookHeadline,
      brand,
      handle: `@${brand.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      logoUrl,
      brandColors,
      theme: 'brand',
      aspectRatio: '9:16',
      screenrecordUrl: screenrecord?.hostedUrl,
      screenrecordMode: screenrecord ? 'inset' : 'none',
      language: detected.code,
      languageLabel: detected.label,
      slides,
      cta: profile.cta,
      sourceUrl: url,
    };
  }

  /**
   * Generates a 9:16 vertical (1080x1920) multi-page PDF story deck and cover preview.
   */
  public async renderReelDeck(script: ReelScript): Promise<RenderReelResult> {
    const brandColors = script.brandColors || deriveBrandPalette();

    const themeStyles: Record<string, { bg: string; customStyle?: string; text: string; subtext: string; tagBg: string; tagText: string; accent: string; accentStyle?: string }> = {
      brand: {
        bg: 'bg-slate-950',
        customStyle: `background: linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary});`,
        text: 'text-white',
        subtext: 'text-slate-200/80',
        tagBg: 'bg-white/10 border border-white/20',
        tagText: 'text-white',
        accent: 'text-cyan-400',
        accentStyle: `color: ${brandColors.accent};`,
      },
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

    const currentTheme = themeStyles[script.theme] || themeStyles.brand || themeStyles.gradient;
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
        <div class="slide-page w-[${width}px] h-[${height}px] ${paddingClass} flex flex-col justify-between ${currentTheme.bg} relative overflow-hidden" style="page-break-after: always; break-after: page; ${currentTheme.customStyle || ''}">
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
                ${
                  script.logoUrl
                    ? `<img src="${script.logoUrl}" class="w-12 h-12 rounded-2xl object-contain bg-white/10 p-1 border border-white/20 shadow-lg shadow-black/40" />`
                    : `<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
                        ${script.brand.slice(0, 2).toUpperCase()}
                      </div>`
                }
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
