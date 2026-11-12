import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { scraperService } from './scraper.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { detectPageLanguage, LANGUAGE_PROFILES } from './language.js';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

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
  layout?: 'classic' | 'split' | 'iphone' | 'editorial';
  audioMode?: 'voice_beat' | 'beat_only' | 'voice_only' | 'none';
  karaoke?: boolean;
  duration?: number;
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
  screenrecordUrl?: string;
  screenrecordMode?: 'inset' | 'backdrop' | 'none';
  cleanExport?: boolean;
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
    const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
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
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(15000),
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
        } else {
          console.warn('[ReelService] Gemini API returned error:', res.status, await res.text().catch(() => ''));
        }
      } catch (err) {
        console.warn('[ReelService] Gemini synthesis error:', err);
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

          <!-- Top Progress Bar (Reel Style, optional) -->
          ${script.cleanExport === false ? `
          <div class="z-10">
            <div class="flex items-center space-x-2 w-full mb-6">
              ${Array.from({ length: total })
                .map((_, i) => `<div class="h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-white' : 'bg-white/20'}"></div>`)
                .join('')}
            </div>
          </div>
          ` : ''}

          <!-- Author & Brand Header -->
          <div class="z-10 flex items-center justify-between border-b border-white/10 pb-5">
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
          <div class="z-10 flex items-center justify-between ${script.cleanExport === false ? 'border-t border-white/10 pt-6' : ''}">
            <div class="flex items-center space-x-3 text-base font-bold text-white px-4 py-2 rounded-2xl bg-white/10 border border-white/20">
              <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${script.cta}</span>
            </div>
            ${script.cleanExport === false ? `
            <div class="text-sm font-mono font-bold ${currentTheme.subtext}">
              Slide ${slideNum} / ${total}
            </div>
            ` : ''}
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

  /**
   * Synthesizes natural spoken TTS MP3 audio in the target language (da, en, de, sv, no, es, fr, nl).
   */
  public async generateTtsMp3(text: string, lang = 'da'): Promise<Buffer> {
    const cleanText = (text || '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#`~>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return Buffer.alloc(0);
    }

    const langMap: Record<string, string> = {
      da: 'da',
      en: 'en',
      de: 'de',
      sv: 'sv',
      no: 'no',
      nb: 'no',
      es: 'es',
      fr: 'fr',
      nl: 'nl',
    };
    const tl = langMap[(lang || 'da').toLowerCase().slice(0, 2)] || 'da';

    // Split text into chunks <= 175 chars along sentence or word boundaries
    const chunks: string[] = [];
    const words = cleanText.split(' ');
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length <= 175) {
        current = (current + ' ' + word).trim();
      } else {
        if (current) chunks.push(current);
        current = word.slice(0, 175);
      }
    }
    if (current) chunks.push(current);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        if (arr.byteLength > 0) {
          buffers.push(Buffer.from(arr));
        }
      }
    }

    return Buffer.concat(buffers);
  }

  /**
   * Renders a full H.264 + AAC .MP4 video server-side with AI Voiceover (TTS),
   * ambient synth chord beat, live screenrecording, Kinetic Karaoke, and 4 layout templates.
   */
  public async renderReelVideoMp4(script: ReelScript): Promise<{
    videoStored: { hostedUrl: string; downloadUrl: string; fileId: string };
    durationSec: number;
    hasAudio: boolean;
  }> {
    const jobId = randomUUID().replace(/-/g, '').slice(0, 12);
    const tmpFiles: string[] = [];
    const slides = Array.isArray(script.slides) && script.slides.length > 0
      ? script.slides
      : [{ tag: '01', headline: script.title || 'Highlights', body: script.cta || '' }];

    const audioMode = script.audioMode || 'voice_beat';
    const lang = script.language || 'da';
    const baseSlideDur = Math.max(2, Math.min(10, Number(script.duration) || 3.2));
    const slideDurations: number[] = slides.map(() => baseSlideDur);

    const audioOutPath = `/tmp/reel_${jobId}_audio.m4a`;
    const videoOutPath = `/tmp/reel_${jobId}_out.mp4`;
    tmpFiles.push(audioOutPath, videoOutPath);

    let hasAudio = false;

    try {
      // 1. Build Audio Track (AI Voiceover + Ambient Synth Beat)
      if (audioMode === 'voice_beat' || audioMode === 'voice_only') {
        const padPaths: string[] = [];
        let voiceSuccess = true;

        for (let i = 0; i < slides.length; i++) {
          const s = slides[i];
          const spokenParts = [
            s.headline,
            s.stat ? `${s.stat} ${s.statLabel || ''}`.trim() : '',
            s.body,
          ].filter(Boolean);
          const spokenText = spokenParts.join('. ');

          try {
            const mp3Buf = await this.generateTtsMp3(spokenText, lang);
            if (mp3Buf.length < 200) {
              voiceSuccess = false;
              break;
            }
            const rawMp3Path = `/tmp/reel_${jobId}_s${i}.mp3`;
            const padWavPath = `/tmp/reel_${jobId}_s${i}_pad.wav`;
            tmpFiles.push(rawMp3Path, padWavPath);
            await writeFile(rawMp3Path, mp3Buf);

            // Probe spoken duration via ffprobe
            const { stdout } = await execFileAsync('ffprobe', [
              '-v', 'error',
              '-show_entries', 'format=duration',
              '-of', 'default=noprint_wrappers=1:nokey=1',
              rawMp3Path,
            ]);
            const probedDur = parseFloat(stdout.trim());
            const slideDur = !isNaN(probedDur) && probedDur > 0.8
              ? Math.max(2.6, Math.min(11.0, probedDur + 0.45))
              : baseSlideDur;
            slideDurations[i] = slideDur;

            await execFileAsync('ffmpeg', [
              '-y',
              '-i', rawMp3Path,
              '-af', `apad=whole_dur=${slideDur.toFixed(3)}`,
              '-ar', '44100',
              '-ac', '2',
              padWavPath,
            ]);
            padPaths.push(padWavPath);
          } catch (ttsErr) {
            console.warn('[ReelService] TTS slide generation fallback:', ttsErr);
            voiceSuccess = false;
            break;
          }
        }

        const totalDur = slideDurations.reduce((acc, d) => acc + d, 0);

        if (voiceSuccess && padPaths.length === slides.length) {
          const inputs: string[] = [];
          for (const p of padPaths) {
            inputs.push('-i', p);
          }
          const concatInputs = padPaths.map((_, idx) => `[${idx}:a]`).join('');

          if (audioMode === 'voice_beat') {
            const beatIdx = padPaths.length;
            const fadeStart = Math.max(0.5, totalDur - 0.8).toFixed(2);
            const filterComplex = `${concatInputs}concat=n=${padPaths.length}:v=0:a=1,volume=1.35[voice];[${beatIdx}:a]afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeStart}:d=0.8,volume=0.28[beat];[voice][beat]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
            await execFileAsync('ffmpeg', [
              '-y',
              ...inputs,
              '-f', 'lavfi',
              '-i', `aevalsrc=0.12*sin(2*PI*110*t)+0.09*sin(2*PI*164.81*t)+0.07*sin(2*PI*220*t)+0.05*sin(2*PI*277.18*t)*(0.6+0.4*sin(2*PI*2*t)):s=44100:d=${totalDur.toFixed(3)}`,
              '-filter_complex', filterComplex,
              '-map', '[aout]',
              '-c:a', 'aac',
              '-b:a', '128k',
              audioOutPath,
            ]);
            hasAudio = true;
          } else {
            const filterComplex = `${concatInputs}concat=n=${padPaths.length}:v=0:a=1,volume=1.35[aout]`;
            await execFileAsync('ffmpeg', [
              '-y',
              ...inputs,
              '-filter_complex', filterComplex,
              '-map', '[aout]',
              '-c:a', 'aac',
              '-b:a', '128k',
              audioOutPath,
            ]);
            hasAudio = true;
          }
        }
      }

      // Fallback or 'beat_only': synthesize warm ambient synth chord beat
      if (!hasAudio && audioMode !== 'none') {
        const totalDur = slideDurations.reduce((acc, d) => acc + d, 0);
        const fadeStart = Math.max(0.5, totalDur - 0.8).toFixed(2);
        try {
          await execFileAsync('ffmpeg', [
            '-y',
            '-f', 'lavfi',
            '-i', `aevalsrc=0.14*sin(2*PI*110*t)+0.11*sin(2*PI*164.81*t)+0.09*sin(2*PI*220*t)+0.06*sin(2*PI*277.18*t)*(0.55+0.45*sin(2*PI*2.2*t)):s=44100:d=${totalDur.toFixed(3)}`,
            '-af', `afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeStart}:d=0.8`,
            '-c:a', 'aac',
            '-b:a', '128k',
            audioOutPath,
          ]);
          hasAudio = true;
        } catch (beatErr) {
          console.warn('[ReelService] Beat synthesis warning:', beatErr);
        }
      }

      // 2. Resolve screenrecordUrl to in-memory data URI if hosted locally in storageService
      let resolvedScreenrecordUrl = script.screenrecordUrl || '';
      if (resolvedScreenrecordUrl) {
        const match = resolvedScreenrecordUrl.match(/\/d\/(f_[a-zA-Z0-9_.-]+)/);
        if (match && match[1]) {
          const storedVideo = await storageService.getFile(match[1]);
          if (storedVideo) {
            resolvedScreenrecordUrl = `data:${storedVideo.metadata.mimeType || 'video/webm'};base64,${storedVideo.buffer.toString('base64')}`;
          }
        }
      }

      // 3. Determine virtual & physical canvas dimensions (2/3 scale for fast HD 720p H.264 encoding)
      const aspect = script.aspectRatio || '9:16';
      const virtualDims: Record<string, { w: number; h: number; outW: number; outH: number }> = {
        '9:16': { w: 1080, h: 1920, outW: 720, outH: 1280 },
        '1:1': { w: 1080, h: 1080, outW: 720, outH: 720 },
        '16:9': { w: 1920, h: 1080, outW: 1280, outH: 720 },
        '4:5': { w: 1080, h: 1350, outW: 720, outH: 900 },
      };
      const dim = virtualDims[aspect] || virtualDims['9:16'];
      const totalDurationSec = slideDurations.reduce((a, b) => a + b, 0);

      // 4. Spawn FFmpeg H.264 + AAC encoder receiving piped JPEG frames at 15fps (interpolated to 30fps)
      const renderFps = 15;
      const ffmpegArgs: string[] = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-framerate', String(renderFps),
        '-i', '-',
      ];
      if (hasAudio) {
        ffmpegArgs.push('-i', audioOutPath);
      }
      ffmpegArgs.push(
        '-vf', 'fps=30,format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '21',
        '-pix_fmt', 'yuv420p'
      );
      if (hasAudio) {
        ffmpegArgs.push('-c:a', 'copy', '-shortest');
      }
      ffmpegArgs.push('-movflags', '+faststart', videoOutPath);

      await browserService.executeTask(async (context) => {
        const page = await context.newPage();
        await page.setViewportSize({ width: dim.outW, height: dim.outH });
        await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; padding: 0; background: #000; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; }
  </style>
</head>
<body>
  <canvas id="c" width="${dim.outW}" height="${dim.outH}"></canvas>
</body>
</html>`);

        // Initialize canvas renderer and preload assets inside page
        const payload = {
          script: {
            ...script,
            slides,
            layout: script.layout || 'classic',
            cleanExport: script.cleanExport !== false,
            karaoke: script.karaoke !== false,
            screenrecordUrl: resolvedScreenrecordUrl,
            screenrecordMode: script.screenrecordMode || (resolvedScreenrecordUrl ? 'inset' : 'none'),
            brandColors: script.brandColors || deriveBrandPalette(),
          },
          dim,
        };

        await page.evaluate(async (data) => {
          const { script: st, dim: d } = data;
          (window as any).__reelData = data;

          // Preload logo if present
          if (st.logoUrl) {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                (window as any).__logoImg = img;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = st.logoUrl!;
              setTimeout(resolve, 2000);
            });
          }

          // Preload screenrecord video if present
          if (st.screenrecordUrl && st.screenrecordMode !== 'none') {
            await new Promise<void>((resolve) => {
              const vid = document.createElement('video');
              vid.muted = true;
              vid.loop = true;
              vid.playsInline = true;
              vid.crossOrigin = 'anonymous';
              vid.onloadeddata = () => {
                (window as any).__bgVideo = vid;
                vid.play().catch(() => {});
                resolve();
              };
              vid.onerror = () => resolve();
              vid.src = st.screenrecordUrl;
              setTimeout(resolve, 2500);
            });
          }

          // Define frame drawer function on window
          (window as any).__renderFrame = (slideIdx: number, slideProgress: number): string => {
            const canvas = document.getElementById('c') as HTMLCanvasElement;
            const ctx = canvas.getContext('2d')!;
            const W = d.w;
            const H = d.h;
            const scale = d.outW / d.w;

            ctx.save();
            ctx.scale(scale, scale);

            const slide = st.slides[slideIdx] || st.slides[0];
            const total = st.slides.length;
            const layout = st.layout || 'classic';
            const cleanExport = st.cleanExport !== false;

            const themes: Record<string, any> = {
              brand: {
                bg1: st.brandColors?.primary || '#4f46e5',
                bg2: st.brandColors?.secondary || '#090d16',
                text: '#ffffff',
                sub: '#cbd5e1',
                accent: st.brandColors?.accent || '#38bdf8',
                tagBg: 'rgba(255, 255, 255, 0.14)',
                tagText: '#ffffff',
              },
              gradient: { bg1: '#1e1b4b', bg2: '#3b0764', text: '#ffffff', sub: '#c4b5fd', accent: '#22d3ee', tagBg: 'rgba(99, 102, 241, 0.25)', tagText: '#a5b4fc' },
              cyberpunk: { bg1: '#09090b', bg2: '#18181b', text: '#facc15', sub: '#d4d4d8', accent: '#ec4899', tagBg: 'rgba(250, 204, 21, 0.15)', tagText: '#fde047' },
              midnight: { bg1: '#000000', bg2: '#090d16', text: '#f8fafc', sub: '#94a3b8', accent: '#34d399', tagBg: 'rgba(16, 185, 129, 0.2)', tagText: '#34d399' },
              sunset: { bg1: '#4c0519', bg2: '#451a03', text: '#ffffff', sub: '#fecdd3', accent: '#fbbf24', tagBg: 'rgba(244, 63, 94, 0.25)', tagText: '#fda4af' },
              clean: { bg1: '#f8fafc', bg2: '#e2e8f0', text: '#0f172a', sub: '#475569', accent: '#2563eb', tagBg: 'rgba(37, 99, 235, 0.12)', tagText: '#1d4ed8' },
            };
            const t = themes[st.theme] || themes.brand;

            function roundRect(x: number, y: number, w: number, h: number, r: number) {
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.arcTo(x + w, y, x + w, y + h, r);
              ctx.arcTo(x + w, y + h, x, y + h, r);
              ctx.arcTo(x, y + h, x, y, r);
              ctx.arcTo(x, y, x + w, y, r);
              ctx.closePath();
            }

            function wrapLines(text: string, maxWidth: number): string[] {
              const words = (text || '').split(' ');
              const lines: string[] = [];
              let current = words[0] || '';
              for (let i = 1; i < words.length; i++) {
                const test = current + ' ' + words[i];
                if (ctx.measureText(test).width < maxWidth) {
                  current = test;
                } else {
                  lines.push(current);
                  current = words[i];
                }
              }
              if (current) lines.push(current);
              return lines;
            }

            function drawKaraokeText(text: string, x: number, startY: number, maxWidth: number, lineHeight: number) {
              const words = (text || '').trim().split(/\s+/).filter(Boolean);
              if (words.length === 0) return startY;
              const activeWordIdx = st.karaoke !== false
                ? Math.min(words.length - 1, Math.floor(slideProgress * words.length * 1.12))
                : words.length;
              const spaceW = ctx.measureText(' ').width;
              const lines: { word: string; index: number; width: number }[][] = [];
              let currentLine: { word: string; index: number; width: number }[] = [];
              let currentW = 0;

              words.forEach((w, idx) => {
                const wWidth = ctx.measureText(w).width;
                if (currentLine.length > 0 && currentW + spaceW + wWidth > maxWidth) {
                  lines.push(currentLine);
                  currentLine = [{ word: w, index: idx, width: wWidth }];
                  currentW = wWidth;
                } else {
                  if (currentLine.length > 0) currentW += spaceW;
                  currentLine.push({ word: w, index: idx, width: wWidth });
                  currentW += wWidth;
                }
              });
              if (currentLine.length > 0) lines.push(currentLine);

              let curY = startY;
              lines.forEach((line) => {
                let curX = x;
                line.forEach((item) => {
                  const isCurrent = st.karaoke !== false && item.index === activeWordIdx;
                  const isPast = st.karaoke === false || item.index < activeWordIdx;
                  if (isCurrent) {
                    ctx.save();
                    ctx.fillStyle = t.accent;
                    roundRect(curX - 8, curY - lineHeight * 0.72, item.width + 16, lineHeight * 0.92, 12);
                    ctx.fill();
                    ctx.fillStyle = '#090d16';
                    ctx.fillText(item.word, curX, curY);
                    ctx.restore();
                  } else if (isPast) {
                    ctx.fillStyle = t.text;
                    ctx.fillText(item.word, curX, curY);
                  } else {
                    ctx.save();
                    ctx.globalAlpha = 0.45;
                    ctx.fillStyle = t.sub;
                    ctx.fillText(item.word, curX, curY);
                    ctx.restore();
                  }
                  curX += item.width + spaceW;
                });
                curY += lineHeight;
              });
              return curY;
            }

            // 1. Base Gradient Background
            const grad = ctx.createLinearGradient(0, 0, W, H);
            grad.addColorStop(0, t.bg1);
            grad.addColorStop(1, t.bg2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            const bgVid = (window as any).__bgVideo as HTMLVideoElement | undefined;
            const videoReady = !!(bgVid && bgVid.readyState >= 2);

            if (videoReady && st.screenrecordMode === 'backdrop' && layout === 'classic') {
              ctx.save();
              ctx.globalAlpha = 0.36;
              ctx.drawImage(bgVid!, 0, 0, W, H);
              ctx.fillStyle = 'rgba(9, 13, 22, 0.58)';
              ctx.fillRect(0, 0, W, H);
              ctx.restore();
            }

            const isLandscape = W > H;
            const isSquare = W === H;
            const padX = isLandscape ? 110 : isSquare ? 80 : 90;

            // Layout-specific background stages (e.g. Split-Screen Cinema top 44% stage)
            const splitY = Math.round(H * 0.43);
            if (layout === 'split') {
              ctx.save();
              ctx.beginPath();
              ctx.rect(0, 0, W, splitY);
              ctx.clip();
              if (videoReady) {
                ctx.drawImage(bgVid!, 0, 0, W, splitY);
                const topVig = ctx.createLinearGradient(0, 0, 0, splitY);
                topVig.addColorStop(0, 'rgba(9,13,22,0.72)');
                topVig.addColorStop(0.4, 'rgba(9,13,22,0.18)');
                topVig.addColorStop(1, 'rgba(9,13,22,0.75)');
                ctx.fillStyle = topVig;
                ctx.fillRect(0, 0, W, splitY);
              } else {
                const stageGrad = ctx.createRadialGradient(W * 0.5, splitY * 0.55, 20, W * 0.5, splitY * 0.55, W * 0.65);
                stageGrad.addColorStop(0, t.accent + '44');
                stageGrad.addColorStop(1, 'rgba(9,13,22,0.65)');
                ctx.fillStyle = stageGrad;
                ctx.fillRect(0, 0, W, splitY);

                // Big visual metric or slide badge in center of top stage
                const heroText = slide.stat || `0${slideIdx + 1}`;
                ctx.fillStyle = t.accent;
                ctx.font = '900 130px Inter, sans-serif';
                const hw = ctx.measureText(heroText).width;
                ctx.fillText(heroText, (W - hw) / 2, splitY * 0.62);
                if (slide.statLabel) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 28px Inter, sans-serif';
                  const lw = ctx.measureText(slide.statLabel.toUpperCase()).width;
                  ctx.fillText(slide.statLabel.toUpperCase(), (W - lw) / 2, splitY * 0.62 + 52);
                }
              }
              ctx.restore();

              // Bottom dark cinema panel
              const botGrad = ctx.createLinearGradient(0, splitY, 0, H);
              botGrad.addColorStop(0, '#090d16');
              botGrad.addColorStop(1, t.bg2);
              ctx.fillStyle = botGrad;
              ctx.fillRect(0, splitY, W, H - splitY);

              // Glowing neon divider line
              ctx.fillStyle = t.accent;
              ctx.fillRect(0, splitY - 3, W, 6);
            }

            // 2. Top Progress Bars (only if cleanExport === false)
            if (!cleanExport) {
              const barGap = 16;
              const barW = (W - padX * 2 - barGap * (total - 1)) / total;
              for (let i = 0; i < total; i++) {
                const bx = padX + i * (barW + barGap);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                roundRect(bx, 80, barW, 12, 6);
                ctx.fill();
                if (i < slideIdx) {
                  ctx.fillStyle = t.text;
                  roundRect(bx, 80, barW, 12, 6);
                  ctx.fill();
                } else if (i === slideIdx) {
                  ctx.fillStyle = t.text;
                  roundRect(bx, 80, Math.max(12, barW * slideProgress), 12, 6);
                  ctx.fill();
                }
              }
            }

            // 3. Brand Header
            const headerY = cleanExport ? 76 : 140;
            const logoImg = (window as any).__logoImg as HTMLImageElement | undefined;
            if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
              ctx.save();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
              roundRect(padX, headerY, 92, 92, 24);
              ctx.fill();
              roundRect(padX, headerY, 92, 92, 24);
              ctx.clip();
              ctx.drawImage(logoImg, padX + 10, headerY + 10, 72, 72);
              ctx.restore();
            } else {
              ctx.fillStyle = t.accent;
              roundRect(padX, headerY, 92, 92, 24);
              ctx.fill();
              ctx.fillStyle = '#090d16';
              ctx.font = '900 36px Inter, sans-serif';
              ctx.fillText((st.brand || 'TP').slice(0, 2).toUpperCase(), padX + 22, headerY + 58);
            }

            ctx.fillStyle = t.text;
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.fillText(st.brand || 'Brand', padX + 116, headerY + 42);

            ctx.fillStyle = t.sub;
            ctx.font = '500 25px Inter, sans-serif';
            ctx.fillText(st.handle || '@insights', padX + 116, headerY + 78);

            const tagText = (slide.tag || `0${slideIdx + 1}`).toUpperCase();
            ctx.font = 'bold 23px Inter, sans-serif';
            const tagW = ctx.measureText(tagText).width + 48;
            ctx.fillStyle = t.tagBg;
            roundRect(W - padX - tagW, headerY + 18, tagW, 54, 27);
            ctx.fill();
            ctx.fillStyle = t.tagText;
            ctx.fillText(tagText, W - padX - tagW + 24, headerY + 53);

            // 4. Main Slide Body by Layout
            const popScale = slideProgress < 0.12 ? 0.96 + (slideProgress / 0.12) * 0.04 : 1.0;
            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.scale(popScale, popScale);
            ctx.translate(-W / 2, -H / 2);

            if (layout === 'split') {
              // Bottom 57% panel content
              let curY = splitY + 95;
              const headFont = isSquare ? 54 : 66;
              const headLineH = isSquare ? 66 : 80;
              ctx.fillStyle = t.text;
              ctx.font = `900 ${headFont}px Inter, sans-serif`;
              const hLines = wrapLines(slide.headline || '', W - padX * 2);
              hLines.forEach((line) => {
                ctx.fillText(line, padX, curY);
                curY += headLineH;
              });

              if (slide.stat && videoReady) {
                curY += 15;
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                roundRect(padX, curY, W - padX * 2, 128, 26);
                ctx.fill();
                ctx.fillStyle = t.accent;
                ctx.font = '900 68px Inter, sans-serif';
                const sw = ctx.measureText(slide.stat).width;
                ctx.fillText(slide.stat, padX + 36, curY + 88);
                ctx.fillStyle = t.text;
                ctx.font = 'bold 28px Inter, sans-serif';
                ctx.fillText((slide.statLabel || '').toUpperCase(), padX + 36 + sw + 28, curY + 76);
                curY += 175;
              } else {
                curY += 32;
              }

              const bodyFont = isSquare ? 34 : 42;
              const bodyLineH = isSquare ? 50 : 62;
              ctx.font = `600 ${bodyFont}px Inter, sans-serif`;
              drawKaraokeText(slide.body || '', padX, curY, W - padX * 2, bodyLineH);

            } else if (layout === 'iphone') {
              // Headline above 3D iPhone 16 Pro frame + Karaoke below
              let curY = headerY + 150;
              const headFont = isSquare ? 44 : 54;
              const headLineH = isSquare ? 54 : 66;
              ctx.fillStyle = t.text;
              ctx.font = `900 ${headFont}px Inter, sans-serif`;
              const hLines = wrapLines(slide.headline || '', W - padX * 2).slice(0, 2);
              hLines.forEach((line) => {
                const lw = ctx.measureText(line).width;
                ctx.fillText(line, (W - lw) / 2, curY);
                curY += headLineH;
              });

              const phoneW = isSquare ? 340 : 450;
              const phoneH = isSquare ? 430 : 760;
              const phoneX = (W - phoneW) / 2;
              const phoneY = curY + 12;

              // Outer titanium bezel
              ctx.save();
              ctx.fillStyle = '#334155';
              roundRect(phoneX - 10, phoneY - 10, phoneW + 20, phoneH + 20, 66);
              ctx.fill();
              ctx.fillStyle = '#090d16';
              roundRect(phoneX, phoneY, phoneW, phoneH, 56);
              ctx.fill();

              // Clip inside iPhone screen
              roundRect(phoneX + 8, phoneY + 8, phoneW - 16, phoneH - 16, 48);
              ctx.clip();

              if (videoReady) {
                ctx.drawImage(bgVid!, phoneX + 8, phoneY + 8, phoneW - 16, phoneH - 16);
              } else {
                const screenGrad = ctx.createLinearGradient(phoneX, phoneY, phoneX, phoneY + phoneH);
                screenGrad.addColorStop(0, '#0f172a');
                screenGrad.addColorStop(1, t.bg1);
                ctx.fillStyle = screenGrad;
                ctx.fillRect(phoneX, phoneY, phoneW, phoneH);

                const pStat = slide.stat || `0${slideIdx + 1}`;
                ctx.fillStyle = t.accent;
                ctx.font = '900 86px Inter, sans-serif';
                const psw = ctx.measureText(pStat).width;
                ctx.fillText(pStat, phoneX + (phoneW - psw) / 2, phoneY + phoneH * 0.48);

                const pLbl = (slide.statLabel || st.brand || 'LIVE').toUpperCase();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Inter, sans-serif';
                const plw = ctx.measureText(pLbl).width;
                ctx.fillText(pLbl, phoneX + (phoneW - plw) / 2, phoneY + phoneH * 0.48 + 46);
              }

              // Dynamic Island pill
              ctx.fillStyle = '#000000';
              roundRect(W / 2 - 68, phoneY + 22, 136, 34, 17);
              ctx.fill();
              ctx.restore();

              // Karaoke caption below iPhone
              const capY = phoneY + phoneH + 64;
              ctx.font = `600 ${isSquare ? 30 : 38}px Inter, sans-serif`;
              drawKaraokeText(slide.body || '', padX, capY, W - padX * 2, isSquare ? 44 : 54);

            } else if (layout === 'editorial') {
              // Giant background watermark stat/number + vertical accent bar + quote style
              const watermark = slide.stat || `0${slideIdx + 1}`;
              ctx.save();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
              ctx.font = '900 300px Inter, sans-serif';
              ctx.fillText(watermark, padX - 20, H * 0.46);
              ctx.restore();

              const editX = padX + 44;
              const editW = W - editX - padX;
              let curY = isSquare ? 290 : 470;

              // Giant quote mark
              ctx.fillStyle = t.accent;
              ctx.font = '900 120px Georgia, serif';
              ctx.fillText('“', editX - 8, curY - 30);

              const headFont = isSquare ? 56 : 74;
              const headLineH = isSquare ? 68 : 88;
              ctx.fillStyle = t.text;
              ctx.font = `900 ${headFont}px Inter, sans-serif`;
              const hLines = wrapLines(slide.headline || '', editW);
              const barStartY = curY - headFont;
              hLines.forEach((line) => {
                ctx.fillText(line, editX, curY);
                curY += headLineH;
              });

              if (slide.stat) {
                curY += 20;
                ctx.fillStyle = t.accent;
                ctx.font = '900 88px Inter, sans-serif';
                const sw = ctx.measureText(slide.stat).width;
                ctx.fillText(slide.stat, editX, curY + 68);
                ctx.fillStyle = t.text;
                ctx.font = 'bold 30px Inter, sans-serif';
                ctx.fillText((slide.statLabel || '').toUpperCase(), editX + sw + 28, curY + 56);
                curY += 120;
              } else {
                curY += 36;
              }

              const bodyFont = isSquare ? 36 : 44;
              const bodyLineH = isSquare ? 52 : 64;
              ctx.font = `600 ${bodyFont}px Inter, sans-serif`;
              const endY = drawKaraokeText(slide.body || '', editX, curY, editW, bodyLineH);

              // Left vertical accent bar
              ctx.fillStyle = t.accent;
              roundRect(padX, barStartY, 12, Math.max(180, endY - barStartY - 10), 6);
              ctx.fill();

            } else {
              // 'classic' layout (supports inset browser window when videoReady && screenrecordMode === 'inset')
              const hasInsetVideo = videoReady && st.screenrecordMode === 'inset' && !isLandscape;
              let curY = hasInsetVideo ? headerY + 165 : (isSquare ? 310 : 490);
              const headFont = hasInsetVideo ? 58 : (isSquare ? 56 : 74);
              const headLineH = hasInsetVideo ? 70 : (isSquare ? 68 : 88);

              ctx.fillStyle = t.text;
              ctx.font = `900 ${headFont}px Inter, sans-serif`;
              const hLines = wrapLines(slide.headline || '', W - padX * 2);
              hLines.forEach((line) => {
                ctx.fillText(line, padX, curY);
                curY += headLineH;
              });

              if (hasInsetVideo) {
                curY += 10;
                const winW = W - padX * 2;
                const winH = isSquare ? 260 : 430;
                const winX = padX;
                const winY = curY;

                ctx.save();
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                roundRect(winX, winY, winW, winH, 28);
                ctx.fill();
                roundRect(winX, winY, winW, winH, 28);
                ctx.clip();

                // Browser top bar
                ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
                ctx.fillRect(winX, winY, winW, 44);
                ctx.fillStyle = '#f87171';
                ctx.beginPath(); ctx.arc(winX + 24, winY + 22, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(winX + 46, winY + 22, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#34d399';
                ctx.beginPath(); ctx.arc(winX + 68, winY + 22, 7, 0, Math.PI * 2); ctx.fill();

                ctx.drawImage(bgVid!, winX, winY + 44, winW, winH - 44);
                ctx.restore();

                curY += winH + 54;
              }

              if (slide.stat) {
                curY += 16;
                const statBoxH = hasInsetVideo ? 130 : 168;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
                roundRect(padX, curY, W - padX * 2, statBoxH, 28);
                ctx.fill();

                ctx.fillStyle = t.accent;
                ctx.font = `900 ${hasInsetVideo ? 68 : 84}px Inter, sans-serif`;
                const statW = ctx.measureText(slide.stat).width;
                ctx.fillText(slide.stat, padX + 40, curY + (hasInsetVideo ? 90 : 112));

                ctx.fillStyle = t.text;
                ctx.font = 'bold 30px Inter, sans-serif';
                ctx.fillText((slide.statLabel || 'METRIC').toUpperCase(), padX + 40 + statW + 32, curY + (hasInsetVideo ? 78 : 98));

                curY += statBoxH + 56;
              } else {
                curY += 28;
              }

              const bodyFont = hasInsetVideo ? 38 : (isSquare ? 36 : 44);
              const bodyLineH = hasInsetVideo ? 54 : (isSquare ? 52 : 64);
              ctx.font = `600 ${bodyFont}px Inter, sans-serif`;
              drawKaraokeText(slide.body || '', padX, curY, W - padX * 2, bodyLineH);
            }

            ctx.restore();

            // 5. Footer CTA
            const footerY = H - (isLandscape ? 85 : 115);
            if (!cleanExport) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
              ctx.fillRect(padX, footerY - 52, W - padX * 2, 2);

              ctx.fillStyle = '#34d399';
              ctx.beginPath();
              ctx.arc(padX + 14, footerY - 12, 10, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = t.text;
              ctx.font = 'bold 30px Inter, sans-serif';
              ctx.fillText(st.cta || 'Learn more', padX + 42, footerY);

              ctx.fillStyle = t.sub;
              ctx.font = 'bold 28px monospace';
              const slideCountText = `${slideIdx + 1} / ${total}`;
              const scW = ctx.measureText(slideCountText).width;
              ctx.fillText(slideCountText, W - padX - scW, footerY);
            } else {
              ctx.font = 'bold 28px Inter, sans-serif';
              const ctaText = st.cta || 'Learn more';
              const pillW = Math.min(W - padX * 2, ctx.measureText(ctaText).width + 82);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              roundRect(padX, footerY - 42, pillW, 60, 30);
              ctx.fill();

              ctx.fillStyle = '#34d399';
              ctx.beginPath();
              ctx.arc(padX + 30, footerY - 12, 9, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = t.text;
              ctx.fillText(ctaText, padX + 54, footerY - 2);
            }

            ctx.restore();
            return canvas.toDataURL('image/jpeg', 0.88);
          };
        }, payload);

        // Start FFmpeg process and stream frames
        const ffmpegProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
        let ffmpegStderr = '';
        ffmpegProc.stderr?.on('data', (chunk) => {
          ffmpegStderr += chunk.toString();
        });

        const ffmpegExitPromise = new Promise<void>((resolve, reject) => {
          ffmpegProc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegStderr.slice(-400)}`));
          });
          ffmpegProc.on('error', reject);
        });

        for (let sIdx = 0; sIdx < slides.length; sIdx++) {
          const sDur = slideDurations[sIdx];
          const frameCount = Math.max(10, Math.round(sDur * renderFps));
          for (let f = 0; f < frameCount; f++) {
            const progress = f / frameCount;
            const dataUrl = await page.evaluate(
              ({ idx, prog }) => (window as any).__renderFrame(idx, prog),
              { idx: sIdx, prog: progress }
            );
            const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            const frameBuf = Buffer.from(base64Data, 'base64');
            const canContinue = ffmpegProc.stdin.write(frameBuf);
            if (!canContinue) {
              await new Promise<void>((r) => ffmpegProc.stdin.once('drain', r));
            }
          }
        }

        ffmpegProc.stdin.end();
        await ffmpegExitPromise;
      });

      const mp4Buffer = await readFile(videoOutPath);
      const safeBrand = (script.brand || 'reel').toLowerCase().replace(/[^a-z0-9]/g, '') || 'reel';
      const safeRatio = (script.aspectRatio || '9:16').replace(':', '-');
      const stored = await storageService.saveFile(mp4Buffer, {
        mimeType: 'video/mp4',
        extension: 'mp4',
        filename: `social-${safeRatio}-${safeBrand}.mp4`,
      });

      return {
        videoStored: {
          hostedUrl: stored.hostedUrl,
          downloadUrl: `${stored.hostedUrl}?download=true`,
          fileId: stored.fileId,
        },
        durationSec: Number(totalDurationSec.toFixed(1)),
        hasAudio,
      };
    } finally {
      for (const f of tmpFiles) {
        await unlink(f).catch(() => {});
      }
    }
  }
}

export const reelService = ReelService.getInstance();
