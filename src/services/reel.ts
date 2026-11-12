import { spawn, execFile } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { scraperService } from './scraper.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { detectPageLanguage, LANGUAGE_PROFILES } from './language.js';
import { env } from '../config/env.js';

export interface ReelSlide {
  tag?: string;
  headline: string;
  body: string;
  stat?: string;
  statLabel?: string;
  slideType?: 'hook' | 'problem' | 'stat' | 'cta' | 'standard';
  highlightWords?: string[];
}

export type ReelTheme =
  | 'brand'
  | 'nordic'
  | 'bento'
  | 'brutalist'
  | 'creator'
  | 'terminal'
  | 'cyberpunk'
  | 'midnight'
  | 'gradient'
  | 'sunset'
  | 'clean';

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
  theme: ReelTheme;
  layout?: 'classic' | 'split' | 'iphone' | 'editorial';
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
 * Extracts 1-3 high-impact, punchy phrases or keywords to highlight inside a slide.
 */
export function extractHighlightWords(text: string): string[] {
  if (!text) return [];
  const highlights: string[] = [];

  // 1. Quoted terms
  const quoted = text.match(/["'«»]([^"'«»]{2,30})["'«»]/g);
  if (quoted) {
    for (const q of quoted) {
      highlights.push(q.replace(/["'«»]/g, '').trim());
    }
  }

  // 2. High-impact keyword pairs or stats
  const powerPatterns = [
    /\b(?:roligt flow|ét roligt flow|saml hele|under ét minut|14 dage|uden binding|100% gdpr|sikker mail|tunnelmail)\b/gi,
    /\b(?:for meget tid|dyrebare timer|papirarbejde|spildtid|manuel journalisering|manuelle processer|flaskehals|fejl|kaos)\b/gi,
    /\b(?:direkte til e-boks|e-boks|nemt og hurtigt|klart overblik|alt samlet|spar tid|sikker deling|ro i maven)\b/gi,
    /\b(?:10x|99\.9%|100%|0 kr|gratis|\d+ kr|\d+ min|\d+ timer|\d+x)\b/gi,
    /\b(?:alt-i-ét|automatisk|fagsystem|journalføring|nemt|enkelt|effektivt|i skyen|all-in-one)\b/gi,
    /\b(?:sub-500ms|vector pdf|zero retention|api-first|high converting|game changer|lightning fast)\b/gi,
  ];

  for (const pat of powerPatterns) {
    const matches = text.match(pat);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim();
        if (!highlights.some((h) => h.toLowerCase() === clean.toLowerCase())) {
          highlights.push(clean);
        }
      }
    }
  }

  // 3. Fallback: If no power keywords found, pick the most salient keyword from text
  if (highlights.length === 0) {
    const words = text
      .split(/\s+/)
      .map((w) => w.replace(/[,.!?«»"']/g, '').trim())
      .filter((w) => w.length >= 6);
    const stopWords = ['hvordan', 'hvorfor', 'hvilke', 'hvilken', 'altid', 'mange', 'virksomheder', 'skaber', 'bruger', 'koster'];
    const candidate = words.find((w) => !stopWords.includes(w.toLowerCase()));
    if (candidate) highlights.push(candidate);
  }

  return highlights.slice(0, 3);
}

/**
 * Wraps highlighted words in a slide text with custom HTML mark tags.
 */
export function formatHighlightedHtml(text: string, highlightWords?: string[], markClass = ''): string {
  if (!text) return '';
  const candidates = (highlightWords && highlightWords.length > 0)
    ? highlightWords
    : extractHighlightWords(text).slice(0, 1);

  let formatted = text;
  const applyCandidates = (words: string[]) => {
    for (const word of words) {
      if (!word || word.trim().length < 2) continue;
      const cleanWord = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${cleanWord})`, 'gi');
      if (regex.test(formatted)) {
        formatted = formatted.replace(regex, `<mark class="${markClass}">$1</mark>`);
        break;
      }
    }
  };

  applyCandidates(candidates);
  if (formatted === text) {
    applyCandidates(extractHighlightWords(text).slice(0, 1));
  }
  return formatted;
}

/**
 * Automatically detects the most fitting design archetype based on URL and scraped page content.
 */
export function detectAestheticArchetype(url: string, scraped: any): ReelTheme {
  const combined = `${url} ${scraped.title || ''} ${scraped.description || ''} ${(scraped.markdown || '').slice(0, 2500)}`.toLowerCase();

  // 1. Nordic Editorial / Paper Calm
  // Clinic, therapy, psychology, health, social work, wellness, calm SaaS, hospitality (e.g. cohero.dk)
  if (/(?:psykolog|terapi|socialrådgiver|behandler|praksis|roligt|sundhed|klinik|botilbud|wellness|meditation|læge|tandlæge|journal|omsorg|mental|mindful|skandinav|nordic|arkitekt|architecture|hospitality|atelier|journalist|editorial)/i.test(combined)) {
    return 'nordic';
  }

  // 2. Dev Terminal
  // APIs, code, CLI, developers, documentation, Github
  if (/(?:api|github|terminal|developer|cli|sdk|json|backend|code|programming|endpoint|fastify|docker|kubernetes|devtools|npm|opensource|open-source|postgres)/i.test(combined)) {
    return 'terminal';
  }

  // 3. Creator Pop
  // Social media, video, TikTok, creator economy, viral marketing
  if (/(?:creator|tiktok|youtube|viral|hook|growth|marketing|influencer|audience|personal brand|podcast|newsletter|community|content|video)/i.test(combined)) {
    return 'creator';
  }

  // 4. Brutalist Impact
  // Drops, edgy fashion, streetwear, radical, rebel, disruptive tech, bold design
  if (/(?:brutal|drop|fashion|streetwear|underground|rebel|disrupt|uncensored|raw|manifesto|punk|avant-garde|design studio|creative agency)/i.test(combined)) {
    return 'brutalist';
  }

  // 5. Linear Bento Modern SaaS
  // Modern B2B software, project management, dashboards, platforms
  if (/(?:saas|platform|automation|workflow|cloud|bento|dashboard|enterprise|collaborat|fintech|accounting|analytics|crm|workspace|software)/i.test(combined)) {
    return 'bento';
  }

  // 6. Warm Sunset / Lifestyle when theme_color is warm or lifestyle-oriented
  if (/(?:coffee|kaffe|restaurant|mad|bistro|bakery|hotel|rejser|travel|wine|sunset|botanical|organic|skønhed|beauty)/i.test(combined)) {
    return 'sunset';
  }

  // Fallback: if site provides a custom brand theme_color, honor 'brand',
  // otherwise pick a distinctive archetype seeded by domain so arbitrary sites never look identical.
  if (scraped?.theme_color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(scraped.theme_color).trim())) {
    return 'brand';
  }

  const domainSeed = url.replace(/^https?:\/\//i, '').split('/')[0] || url;
  let hash = 0;
  for (let i = 0; i < domainSeed.length; i++) {
    hash = (hash * 31 + domainSeed.charCodeAt(i)) >>> 0;
  }
  const archetypes: ReelTheme[] = ['bento', 'nordic', 'creator', 'brutalist', 'gradient', 'clean'];
  return archetypes[hash % archetypes.length];
}

/**
 * Recommends the ideal spatial layout composition for a detected archetype and asset mix.
 */
export function recommendReelLayout(
  archetype: ReelTheme,
  hasScreenrecord: boolean,
  hasStrongStat = false
): 'classic' | 'split' | 'iphone' | 'editorial' {
  if (hasScreenrecord) {
    return 'classic';
  }

  switch (archetype) {
    case 'nordic':
    case 'sunset':
    case 'clean':
      return 'editorial';
    case 'brutalist':
    case 'cyberpunk':
      return hasStrongStat ? 'editorial' : 'classic';
    case 'bento':
    case 'midnight':
      return hasStrongStat ? 'editorial' : 'classic';
    case 'terminal':
    case 'creator':
    default:
      return 'classic';
  }
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
      durationMs: options?.durationMs ?? 5400,
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
    const aiScript = await this.trySynthesizeWithLLM(url, scraped, detected, Boolean(screenrecord)).catch(() => null);
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
   * Maps parsed LLM JSON into a strongly typed ReelScript with archetype & layout orchestration.
   */
  private buildScriptFromLlmJson(
    parsed: any,
    url: string,
    scraped: any,
    detected: { code: string; label: string; profile: any },
    hasScreenrecord: boolean
  ): ReelScript | null {
    if (!parsed?.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return null;
    }

    const brandColors = deriveBrandPalette(scraped.theme_color);
    const detectedTheme = detectAestheticArchetype(url, scraped);
    const hasStrongStat = Boolean(parsed.slides[2]?.stat);
    const validLayouts = new Set(['classic', 'split', 'iphone', 'editorial']);
    const chosenLayout = validLayouts.has(parsed.suggestedLayout)
      ? parsed.suggestedLayout
      : recommendReelLayout(detectedTheme, hasScreenrecord, hasStrongStat);

    const roleOrder: Array<'hook' | 'problem' | 'stat' | 'cta'> = ['hook', 'problem', 'stat', 'cta'];
    const mappedSlides: ReelSlide[] = parsed.slides.map((s: any, idx: number) => {
      const llmHighlights = Array.isArray(s.highlightWords)
        ? s.highlightWords.filter((w: any) => typeof w === 'string' && w.trim().length >= 2).slice(0, 3)
        : [];
      return {
        tag: s.tag,
        headline: s.headline,
        body: s.body,
        stat: s.stat,
        statLabel: s.statLabel,
        slideType: roleOrder[idx] || 'standard',
        highlightWords: llmHighlights.length > 0
          ? llmHighlights
          : extractHighlightWords(`${s.headline || ''} ${s.body || ''}`),
      };
    });

    return {
      title: parsed.title || scraped.title || 'Highlights',
      brand: parsed.brand || detected.profile.defaultBrand,
      handle: `@${(parsed.brand || 'brand').toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      logoUrl: scraped.logo_url || undefined,
      brandColors,
      theme: detectedTheme,
      layout: chosenLayout,
      cleanExport: true,
      aspectRatio: '9:16',
      language: detected.code,
      languageLabel: detected.label,
      slides: mappedSlides,
      cta: parsed.cta || detected.profile.cta,
      sourceUrl: url,
    };
  }

  /**
   * Generates slides using an LLM (Gemini or OpenAI) if an API key is configured.
   */
  private async trySynthesizeWithLLM(
    url: string,
    scraped: any,
    detected: { code: string; label: string; profile: any },
    hasScreenrecord = false
  ): Promise<ReelScript | null> {
    const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) return null;

    const archetypeHint = detectAestheticArchetype(url, scraped);
    const prompt = `Analyze this webpage URL: ${url}
Detected Language: ${detected.label} (${detected.code})
Detected Aesthetic Vibe: ${archetypeHint}
Has Live Screen Recording: ${hasScreenrecord ? 'yes' : 'no'}
Page Title: ${scraped.title || 'Untitled'}
Page Description: ${scraped.description || ''}
Page Content:
${scraped.markdown.slice(0, 3500)}

TASK:
Synthesize an original, scroll-stopping 4-slide social media Reel / TikTok / Short video script in ${detected.label}.
Do NOT sound like a generic brochure or repeat the same phrasing across slides.
Each slide must play a distinct narrative role:
1) "hook": Contrarian insight or curiosity-gap opener (no generic "Welcome to X"!).
2) "problem": Specific everyday friction, waste, or bottleneck the audience feels.
3) "stat": Quantified proof, speed/cost/time gain, or concrete differentiator with a punchy numeric/short stat.
4) "cta": Confident resolution and immediate next step.

Every single tag, headline, body text, and stat label MUST be written fluently in ${detected.label}.
For each slide, pick 1-2 short impactful words/phrases from its headline/body in "highlightWords" so typography can emphasize them.

Respond ONLY with valid JSON in this exact structure:
{
  "brand": "Brand Name",
  "title": "Short Hook Headline",
  "suggestedLayout": "${recommendReelLayout(archetypeHint, hasScreenrecord, true)}",
  "cta": "Call to action in ${detected.label}",
  "slides": [
    {
      "tag": "Short 1-2 word uppercase tag in ${detected.label}",
      "headline": "Punchy Hook Headline (max 48 chars)",
      "body": "Clear 1-2 sentence hook (max 140 chars)",
      "highlightWords": ["key phrase"]
    },
    {
      "tag": "Problem Tag in ${detected.label}",
      "headline": "The Hidden Bottleneck or Challenge",
      "body": "Why current systems or manual work fail (max 140 chars)",
      "highlightWords": ["bottleneck"]
    },
    {
      "tag": "Insight Tag in ${detected.label}",
      "headline": "Key Differentiator or Breakthrough",
      "body": "The evidence or unique mechanism (max 140 chars)",
      "stat": "Numerical stat like 10x, 99.9%, 100%, 0 kr.",
      "statLabel": "Uppercase Stat Label in ${detected.label}",
      "highlightWords": ["key differentiator"]
    },
    {
      "tag": "Action Tag in ${detected.label}",
      "headline": "Actionable Takeaway or Solution",
      "body": "How to get started or the main benefit (max 140 chars)",
      "highlightWords": ["main benefit"]
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
              temperature: 0.35,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const json = await res.json();
          const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const mapped = this.buildScriptFromLlmJson(JSON.parse(raw), url, scraped, detected, hasScreenrecord);
            if (mapped) return mapped;
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
          temperature: 0.35,
        }),
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json.choices?.[0]?.message?.content;
        if (raw) {
          const mapped = this.buildScriptFromLlmJson(JSON.parse(raw), url, scraped, detected, hasScreenrecord);
          if (mapped) return mapped;
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

    // 3. Build Slide 1: The Core Hook / Promise (strip generic brand title prefix/suffix)
    const cleanBrandPrefix = (text: string): string => {
      for (const sep of [' - ', ' | ', ' — ', ' • ']) {
        if (text.includes(sep)) {
          const parts = text.split(sep).map((p) => p.trim()).filter(Boolean);
          const nonBrand = parts.find((p) => p.toLowerCase() !== brand.toLowerCase() && p.length >= 8);
          if (nonBrand) return nonBrand;
        }
      }
      return text;
    };

    const rawHookCandidate = headings.find((h) => h.toLowerCase() !== brand.toLowerCase() && h.length >= 10 && h.length <= 55)
      || cleanBrandPrefix(rawTitle);
    let hookHeadline = rawHookCandidate || rawTitle;
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

    // Assemble structured slides with distinctive storytelling types & highlighted keywords
    const slides: ReelSlide[] = [
      {
        tag: tag1,
        headline: hookHeadline,
        body: hookBody,
        slideType: 'hook',
        highlightWords: extractHighlightWords(`${hookHeadline} ${hookBody}`),
      },
      {
        tag: profile.problemTag,
        headline: problemHeading,
        body: problemSent,
        slideType: 'problem',
        highlightWords: extractHighlightWords(`${problemHeading} ${problemSent}`),
      },
      {
        tag: profile.insightTag,
        headline: insightHeading,
        body: insightSent,
        stat: foundStat,
        statLabel: foundStatLabel,
        slideType: 'stat',
        highlightWords: extractHighlightWords(`${insightHeading} ${insightSent}`),
      },
      {
        tag: profile.actionTag,
        headline: solutionHeading,
        body: solutionSent,
        slideType: 'cta',
        highlightWords: extractHighlightWords(`${solutionHeading} ${solutionSent}`),
      },
    ];

    const brandColors = deriveBrandPalette(scraped.theme_color);
    const logoUrl = scraped.logo_url || undefined;
    const detectedTheme = detectAestheticArchetype(url, scraped);
    const recommendedLayout = recommendReelLayout(detectedTheme, Boolean(screenrecord), foundStat !== profile.defaultStat);

    return {
      title: hookHeadline,
      brand,
      handle: `@${brand.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      logoUrl,
      brandColors,
      theme: detectedTheme,
      layout: recommendedLayout,
      cleanExport: true,
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
   * Formats a structured ReelScript into an engaging, high-converting social caption with bullets and hashtags.
   */
  public formatInstagramCaption(script: ReelScript): string {
    const lines: string[] = [`🚀 ${script.title}`, ''];
    if (Array.isArray(script.slides)) {
      script.slides.slice(0, 5).forEach((s, idx) => {
        const tag = s.tag ? `[${s.tag}] ` : '';
        lines.push(`${idx + 1}. ${tag}${s.headline}`);
        if (s.body) lines.push(`   ${s.body}`);
      });
      lines.push('');
    }
    lines.push(`👉 ${script.cta || 'Link in bio for full article & code!'}`);
    if (script.sourceUrl) {
      lines.push('');
      lines.push(`🔗 ${script.sourceUrl}`);
    }
    lines.push('');
    lines.push('#webdev #tailwindcss #programming #fullstack #saas #automation #coding #frontend #reels');
    return lines.join('\n');
  }

  /**
   * Generates a 9:16 vertical (1080x1920) multi-page PDF story deck and cover preview.
   */
  public async renderReelDeck(script: ReelScript): Promise<RenderReelResult> {
    const brandColors = script.brandColors || deriveBrandPalette();

    const themeStyles: Record<string, {
      fontHead: string;
      fontBody: string;
      bg: string;
      customStyle?: string;
      cardStyle?: string;
      text: string;
      subtext: string;
      tagBg: string;
      tagText: string;
      tagBorder?: string;
      accent: string;
      accentStyle?: string;
      markClass: string;
      statColor: string;
      badgeIcon?: string;
      buttonBg?: string;
    }> = {
      nordic: {
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-[#0e141f]',
        customStyle: 'background: radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.14), transparent 55%), radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.08), transparent 55%), linear-gradient(165deg, #101726 0%, #0c111c 100%);',
        cardStyle: 'background: rgba(16, 23, 38, 0.75); backdrop-filter: blur(24px); border: 1px solid rgba(217, 119, 6, 0.25); box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);',
        text: 'text-amber-50',
        subtext: 'text-slate-300',
        tagBg: 'bg-amber-500/10',
        tagText: 'text-amber-300',
        tagBorder: 'border border-amber-500/30',
        accent: 'text-amber-400',
        accentStyle: 'color: #fbbf24;',
        markClass: 'bg-amber-400/20 text-amber-200 border-b-2 border-amber-400/70 px-2 py-0.5 rounded',
        statColor: '#fbbf24',
        badgeIcon: '✦',
        buttonBg: 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-black',
      },
      bento: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
        bg: 'bg-[#080d1a]',
        customStyle: 'background: radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.2), transparent 55%), linear-gradient(180deg, #070b14 0%, #030509 100%);',
        cardStyle: 'background: rgba(255, 255, 255, 0.04); backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1);',
        text: 'text-white',
        subtext: 'text-slate-300',
        tagBg: 'bg-sky-500/15',
        tagText: 'text-sky-300',
        tagBorder: 'border border-sky-500/30',
        accent: 'text-sky-400',
        accentStyle: 'color: #38bdf8;',
        markClass: 'bg-sky-500/20 text-sky-200 rounded-lg px-2 py-0.5 border border-sky-400/30',
        statColor: '#38bdf8',
        badgeIcon: '●',
        buttonBg: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold',
      },
      brutalist: {
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'Space Grotesk', monospace, sans-serif",
        bg: 'bg-black',
        customStyle: 'background-color: #000; background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 0); background-size: 24px 24px;',
        cardStyle: 'background: #000; border: 3px solid #fff; box-shadow: 8px 8px 0px #facc15;',
        text: 'text-white',
        subtext: 'text-zinc-300',
        tagBg: 'bg-yellow-400',
        tagText: 'text-black font-black',
        tagBorder: 'border-2 border-white',
        accent: 'text-yellow-400',
        accentStyle: 'color: #facc15;',
        markClass: 'bg-yellow-400 text-black font-black px-2 py-0.5 -rotate-1 inline-block',
        statColor: '#facc15',
        badgeIcon: '⚡',
        buttonBg: 'bg-yellow-400 text-black font-black border-2 border-white shadow-[4px_4px_0px_#fff]',
      },
      creator: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-slate-950',
        customStyle: 'background: radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.25), transparent 45%), radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.25), transparent 45%), linear-gradient(135deg, #180828 0%, #080310 100%);',
        cardStyle: 'background: rgba(30, 15, 45, 0.7); backdrop-filter: blur(20px); border: 2px solid rgba(244, 63, 94, 0.35); box-shadow: 0 25px 60px -10px rgba(244, 63, 94, 0.25);',
        text: 'text-white',
        subtext: 'text-rose-100/90',
        tagBg: 'bg-gradient-to-r from-rose-500 to-amber-500',
        tagText: 'text-white font-black',
        accent: 'text-amber-400',
        accentStyle: 'color: #fbbf24;',
        markClass: 'bg-gradient-to-r from-rose-500/30 to-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg px-2 py-0.5',
        statColor: '#fbbf24',
        badgeIcon: '🔥',
        buttonBg: 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white font-black shadow-lg shadow-rose-600/40',
      },
      terminal: {
        fontHead: "'JetBrains Mono', monospace",
        fontBody: "'JetBrains Mono', monospace",
        bg: 'bg-[#090d16]',
        customStyle: 'background: #080c14; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 32px 32px;',
        cardStyle: 'background: rgba(10, 15, 26, 0.9); backdrop-filter: blur(16px); border: 1px solid rgba(52, 211, 153, 0.3); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);',
        text: 'text-emerald-400',
        subtext: 'text-slate-300',
        tagBg: 'bg-emerald-950/80',
        tagText: 'text-emerald-400',
        tagBorder: 'border border-emerald-500/40',
        accent: 'text-emerald-400',
        accentStyle: 'color: #34d399;',
        markClass: 'bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30',
        statColor: '#34d399',
        badgeIcon: '>_',
        buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black',
      },
      brand: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-slate-950',
        customStyle: `background: linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary});`,
        cardStyle: 'background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);',
        text: 'text-white',
        subtext: 'text-slate-200/90',
        tagBg: 'bg-white/10',
        tagText: 'text-white',
        tagBorder: 'border border-white/20',
        accent: 'text-cyan-400',
        accentStyle: `color: ${brandColors.accent};`,
        markClass: 'bg-white/15 text-white border-b-2 border-white/50 px-2 py-0.5 rounded',
        statColor: brandColors.accent,
        badgeIcon: '✨',
        buttonBg: 'bg-white text-slate-950 font-black',
      },
      gradient: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950',
        text: 'text-white',
        subtext: 'text-purple-200/80',
        tagBg: 'bg-indigo-500/20',
        tagText: 'text-indigo-300',
        tagBorder: 'border border-indigo-500/40',
        accent: 'text-cyan-400',
        markClass: 'bg-indigo-500/25 text-cyan-300 border-b-2 border-cyan-400/60 px-2 py-0.5 rounded',
        statColor: '#38bdf8',
        badgeIcon: '✦',
        buttonBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold',
      },
      cyberpunk: {
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'JetBrains Mono', monospace",
        bg: 'bg-zinc-950',
        text: 'text-yellow-400 font-mono',
        subtext: 'text-zinc-300 font-mono',
        tagBg: 'bg-yellow-400/10',
        tagText: 'text-yellow-300',
        tagBorder: 'border border-yellow-400/40',
        accent: 'text-pink-500',
        markClass: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-2 py-0.5 rounded',
        statColor: '#ec4899',
        badgeIcon: '⚡',
        buttonBg: 'bg-yellow-400 text-black font-black',
      },
      midnight: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-black',
        customStyle: 'background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15), transparent 60%), #040707;',
        cardStyle: 'background: rgba(8, 16, 14, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(16, 185, 129, 0.25); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);',
        text: 'text-zinc-50',
        subtext: 'text-zinc-400',
        tagBg: 'bg-emerald-500/15',
        tagText: 'text-emerald-400',
        tagBorder: 'border border-emerald-500/30',
        accent: 'text-emerald-400',
        markClass: 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400/60 px-2 py-0.5 rounded',
        statColor: '#34d399',
        badgeIcon: '●',
        buttonBg: 'bg-emerald-500 text-black font-black',
      },
      sunset: {
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-gradient-to-b from-rose-950 via-slate-950 to-amber-950',
        customStyle: 'background: radial-gradient(circle at 80% 10%, rgba(244, 63, 94, 0.3), transparent 50%), linear-gradient(180deg, #2a0b18 0%, #0f0714 50%, #201006 100%);',
        cardStyle: 'background: rgba(30, 15, 25, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(251, 146, 60, 0.25); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);',
        text: 'text-white',
        subtext: 'text-rose-200/80',
        tagBg: 'bg-rose-500/20',
        tagText: 'text-rose-300',
        tagBorder: 'border border-rose-500/40',
        accent: 'text-amber-400',
        markClass: 'bg-rose-500/20 text-rose-200 border-b-2 border-rose-400/60 px-2 py-0.5 rounded',
        statColor: '#fbbf24',
        badgeIcon: '🌅',
        buttonBg: 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black',
      },
      clean: {
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        bg: 'bg-slate-50',
        customStyle: 'background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);',
        cardStyle: 'background: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.08);',
        text: 'text-slate-950',
        subtext: 'text-slate-600',
        tagBg: 'bg-blue-100',
        tagText: 'text-blue-700',
        tagBorder: 'border border-blue-200',
        accent: 'text-blue-600',
        markClass: 'bg-blue-100 text-blue-900 border-b-2 border-blue-400 px-2 py-0.5 rounded',
        statColor: '#2563eb',
        badgeIcon: '✦',
        buttonBg: 'bg-slate-950 text-white font-bold',
      },
    };

    const themeKey = script.theme || 'brand';
    const currentTheme = themeStyles[themeKey] || themeStyles.brand || themeStyles.nordic;
    const isLightTheme = themeKey === 'clean';
    const borderHairline = isLightTheme ? 'border-slate-300/80' : themeKey === 'brutalist' ? 'border-white/80' : themeKey === 'nordic' ? 'border-amber-500/20' : 'border-white/10';
    const footerPillClass = isLightTheme
      ? 'bg-slate-900 text-white border border-slate-800 shadow-sm'
      : themeKey === 'brutalist'
        ? 'bg-yellow-400 text-black border-2 border-white shadow-[4px_4px_0px_#fff]'
        : 'text-white bg-white/10 border border-white/20';
    const progressActiveClass = isLightTheme ? 'bg-slate-900' : themeKey === 'brutalist' ? 'bg-yellow-400' : themeKey === 'terminal' ? 'bg-emerald-400' : 'bg-white';
    const progressIdleClass = isLightTheme ? 'bg-slate-300' : 'bg-white/20';

    const aspect = script.aspectRatio || '9:16';
    const dimensions: Record<string, { width: number; height: number }> = {
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '16:9': { width: 1920, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
    };
    const { width, height } = dimensions[aspect] || dimensions['9:16'];

    const buildArchetypeChrome = (slideIdx: number, totalSlides: number, slideTag?: string) => {
      if (themeKey === 'terminal') {
        return `
          <div class="flex items-center justify-between px-4 py-2.5 rounded-t-2xl bg-slate-900/95 border border-b-0 border-emerald-500/30 font-mono text-xs text-emerald-400">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-rose-500/90 inline-block"></span>
              <span class="w-3 h-3 rounded-full bg-amber-400/90 inline-block"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-400/90 inline-block"></span>
              <span class="ml-3 text-slate-400">~/${(script.brand || 'app').toLowerCase().replace(/[^a-z0-9_-]/g, '')}/slide-0${slideIdx + 1}.sh</span>
            </div>
            <span class="text-emerald-300/80">[0${slideIdx + 1}/0${totalSlides}]</span>
          </div>`;
      }
      if (themeKey === 'brutalist') {
        return `
          <div class="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3">
            <span>+ ${slideTag || 'RAW IMPACT'} +</span>
            <span class="px-2 py-0.5 bg-white text-black">FRAME 0${slideIdx + 1}</span>
          </div>`;
      }
      if (themeKey === 'nordic') {
        return `
          <div class="flex items-center space-x-3 text-xs tracking-[0.25em] uppercase text-amber-300/90 mb-4">
            <span class="italic font-serif lowercase text-base text-amber-200">kap. 0${slideIdx + 1}</span>
            <span class="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent"></span>
          </div>`;
      }
      return '';
    };

    const slidesHtml = script.slides
      .map((slide, idx) => {
        const slideNum = idx + 1;
        const total = script.slides.length;
        const slideType = slide.slideType || (idx === 0 ? 'hook' : idx === 1 ? 'problem' : idx === 2 ? 'stat' : 'cta');

        const isLandscape = aspect === '16:9';
        const isSquare = aspect === '1:1';
        const paddingClass = isSquare ? 'p-12' : isLandscape ? 'p-16' : 'p-20';
        const widthWrap = isLandscape ? 'max-w-6xl w-full' : 'max-w-3xl w-full';
        const cardRounded = themeKey === 'brutalist' ? 'rounded-none' : themeKey === 'terminal' ? 'rounded-b-3xl rounded-t-none' : 'rounded-3xl';
        const chromeHeader = buildArchetypeChrome(idx, total, slide.tag);

        let bodyMarkup = '';
        if (slideType === 'hook') {
          const layoutClass = isLandscape ? 'grid grid-cols-12 gap-10 items-center' : 'space-y-6';
          bodyMarkup = `
            <div class="my-auto z-10 ${widthWrap} ${layoutClass}">
              <div class="${isLandscape ? 'col-span-7 space-y-6' : 'space-y-6'}">
                ${themeKey === 'nordic' ? chromeHeader : ''}
                <div class="inline-flex items-center space-x-2 px-4 py-1.5 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-full'} text-sm font-bold uppercase tracking-wider ${currentTheme.tagBg} ${currentTheme.tagText} ${currentTheme.tagBorder || ''}">
                  <span>${currentTheme.badgeIcon || '✦'}</span>
                  <span>${slide.tag || 'HOVEDBUDSKAB'}</span>
                </div>
                <h1 class="${isSquare ? 'text-4xl' : isLandscape ? 'text-6xl' : 'text-6xl'} font-black tracking-tight leading-[1.12] ${currentTheme.text}" style="font-family: ${currentTheme.fontHead};">
                  ${formatHighlightedHtml(slide.headline, slide.highlightWords, currentTheme.markClass)}
                </h1>
              </div>
              <div class="${isLandscape ? 'col-span-5' : ''}">
                ${themeKey === 'terminal' || themeKey === 'brutalist' ? chromeHeader : ''}
                <div class="${themeKey === 'terminal' || themeKey === 'brutalist' ? `p-8 ${cardRounded}` : ''}" style="${themeKey === 'terminal' || themeKey === 'brutalist' ? (currentTheme.cardStyle || '') : ''}">
                  <p class="${isSquare ? 'text-xl' : isLandscape ? 'text-2xl' : 'text-3xl'} font-medium leading-relaxed ${currentTheme.subtext}" style="font-family: ${currentTheme.fontBody};">
                    ${themeKey === 'terminal' ? `<span class="text-emerald-400 font-bold mr-2">$</span>` : ''}${slide.body}
                  </p>
                </div>
              </div>
            </div>
          `;
        } else if (slideType === 'problem') {
          bodyMarkup = `
            <div class="my-auto z-10 ${widthWrap} space-y-6">
              <div class="inline-flex items-center space-x-2 px-4 py-1.5 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-full'} text-sm font-bold uppercase tracking-wider bg-rose-500/15 ${isLightTheme ? 'text-rose-700 border-rose-300' : 'text-rose-300 border-rose-500/30'} border">
                <span>⚡</span>
                <span>${slide.tag || 'UDFORDRINGEN'}</span>
              </div>
              <div>
                ${chromeHeader}
                <div class="p-10 ${cardRounded} ${isLandscape ? 'grid grid-cols-12 gap-8 items-center' : 'space-y-6'}" style="${currentTheme.cardStyle || 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);'}">
                  <h2 class="${isLandscape ? 'col-span-6' : ''} ${isSquare ? 'text-3xl' : 'text-5xl'} font-black tracking-tight leading-tight ${currentTheme.text}" style="font-family: ${currentTheme.fontHead};">
                    ${formatHighlightedHtml(slide.headline, slide.highlightWords, currentTheme.markClass)}
                  </h2>
                  <p class="${isLandscape ? `col-span-6 border-l ${borderHairline} pl-8` : ''} ${isSquare ? 'text-lg' : 'text-2xl'} font-medium leading-relaxed ${currentTheme.subtext}" style="font-family: ${currentTheme.fontBody};">
                    ${slide.body}
                  </p>
                </div>
              </div>
            </div>
          `;
        } else if (slideType === 'stat') {
          bodyMarkup = `
            <div class="my-auto z-10 ${widthWrap} space-y-6">
              <div class="inline-flex items-center space-x-2 px-4 py-1.5 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-full'} text-sm font-bold uppercase tracking-wider bg-emerald-500/15 ${isLightTheme ? 'text-emerald-700 border-emerald-300' : 'text-emerald-300 border-emerald-500/30'} border">
                <span>📈</span>
                <span>${slide.tag || 'DOKUMENTERET EFFEKT'}</span>
              </div>
              <h2 class="${isSquare ? 'text-3xl' : 'text-5xl'} font-black tracking-tight leading-tight ${currentTheme.text}" style="font-family: ${currentTheme.fontHead};">
                ${formatHighlightedHtml(slide.headline, slide.highlightWords, currentTheme.markClass)}
              </h2>
              <div>
                ${chromeHeader}
                <div class="p-10 ${cardRounded} flex ${isLandscape ? 'items-center justify-between gap-12' : 'items-center justify-between space-x-6'}" style="${currentTheme.cardStyle || 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);'}">
                  <div>
                    <div class="${isSquare ? 'text-6xl' : isLandscape ? 'text-9xl' : 'text-8xl'} font-black tracking-tight" style="color: ${currentTheme.statColor}; font-family: ${currentTheme.fontHead};">
                      ${slide.stat || '10x'}
                    </div>
                    <div class="text-base font-bold uppercase tracking-widest ${currentTheme.subtext} mt-2">
                      ${slide.statLabel || 'RESULTAT'}
                    </div>
                  </div>
                  <div class="text-right ${isLandscape ? 'max-w-xl' : 'max-w-sm'}">
                    <p class="${isLandscape ? 'text-3xl' : 'text-2xl'} font-medium leading-relaxed ${currentTheme.subtext}" style="font-family: ${currentTheme.fontBody};">
                      ${slide.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          `;
        } else {
          // CTA Climax
          bodyMarkup = `
            <div class="my-auto z-10 ${widthWrap} mx-auto space-y-8 flex flex-col items-center text-center">
              ${themeKey === 'brutalist' ? chromeHeader : ''}
              <div class="inline-flex items-center space-x-2 px-4 py-1.5 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-full'} text-sm font-bold uppercase tracking-wider bg-indigo-500/15 ${isLightTheme ? 'text-indigo-700 border-indigo-300' : 'text-indigo-300 border-indigo-500/30'} border">
                <span>🚀</span>
                <span>${slide.tag || 'NÆSTE SKRIDT'}</span>
              </div>
              <h2 class="${isSquare ? 'text-4xl' : 'text-6xl'} font-black tracking-tight leading-tight ${currentTheme.text}" style="font-family: ${currentTheme.fontHead};">
                ${formatHighlightedHtml(slide.headline, slide.highlightWords, currentTheme.markClass)}
              </h2>
              <p class="${isSquare ? 'text-xl' : 'text-2xl'} font-medium leading-relaxed ${currentTheme.subtext} max-w-2xl" style="font-family: ${currentTheme.fontBody};">
                ${slide.body}
              </p>
              <div class="w-full max-w-md pt-4">
                <div class="p-6 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-3xl'} ${currentTheme.buttonBg || 'bg-white text-slate-950 font-black'} text-2xl shadow-2xl flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <span class="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>${script.cta}</span>
                  </div>
                  <span class="text-3xl font-black">→</span>
                </div>
              </div>
            </div>
          `;
        }

        const cornerDecor = themeKey === 'brutalist'
          ? `<div class="absolute top-6 left-6 font-mono text-white/60 text-xl font-black pointer-events-none">+</div>
             <div class="absolute top-6 right-6 font-mono text-white/60 text-xl font-black pointer-events-none">+</div>
             <div class="absolute bottom-6 left-6 font-mono text-white/60 text-xl font-black pointer-events-none">+</div>
             <div class="absolute bottom-6 right-6 font-mono text-white/60 text-xl font-black pointer-events-none">+</div>`
          : themeKey === 'nordic'
            ? `<div class="absolute inset-8 border border-amber-500/15 pointer-events-none rounded-2xl"></div>`
            : `<div class="absolute -top-40 -right-40 w-[650px] h-[650px] rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>
               <div class="absolute -bottom-40 -left-40 w-[650px] h-[650px] rounded-full bg-rose-500/15 blur-3xl pointer-events-none"></div>`;

        return `
        <div class="slide-page w-[${width}px] h-[${height}px] ${paddingClass} flex flex-col justify-between ${currentTheme.bg} relative overflow-hidden" style="page-break-after: always; break-after: page; ${currentTheme.customStyle || ''}">
          ${cornerDecor}

          <!-- Top Progress Bar (Reel Style, optional) -->
          ${script.cleanExport === false ? `
          <div class="z-10">
            <div class="flex items-center space-x-2 w-full mb-6">
              ${Array.from({ length: total })
                .map((_, i) => `<div class="h-1.5 flex-1 rounded-full ${i <= idx ? progressActiveClass : progressIdleClass}"></div>`)
                .join('')}
            </div>
          </div>
          ` : ''}

          <!-- Author & Brand Header -->
          <div class="z-10 flex items-center justify-between border-b ${borderHairline} pb-5">
            <div class="flex items-center space-x-4">
              ${
                script.logoUrl
                  ? `<img src="${script.logoUrl}" class="w-12 h-12 rounded-2xl object-contain ${isLightTheme ? 'bg-white border-slate-200' : 'bg-white/10 border-white/20'} p-1 border shadow-lg" />`
                  : `<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
                      ${script.brand.slice(0, 2).toUpperCase()}
                    </div>`
              }
              <div>
                <div class="font-extrabold text-xl ${currentTheme.text} tracking-tight">${script.brand}</div>
                <div class="text-xs font-medium ${currentTheme.subtext}">${script.handle || '@insights'}</div>
              </div>
            </div>
            <div class="px-3.5 py-1 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-full'} text-xs font-mono font-bold uppercase tracking-wider ${currentTheme.tagBg} ${currentTheme.tagText} ${currentTheme.tagBorder || ''}">
              0${slideNum} / 0${total}
            </div>
          </div>

          <!-- Main Reel Slide Body (Specific to Slide Role) -->
          ${bodyMarkup}

          <!-- Footer / CTA -->
          <div class="z-10 flex items-center justify-between ${script.cleanExport === false ? `border-t ${borderHairline} pt-6` : ''}">
            <div class="flex items-center space-x-3 text-base font-bold px-4 py-2 ${themeKey === 'brutalist' ? 'rounded-none' : 'rounded-2xl'} ${footerPillClass}">
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,600&family=Plus+Jakarta+Sans:wght@500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
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
   * Renders a full H.264 .MP4 video server-side with live screenrecording,
   * Kinetic Karaoke, and 4 layout templates.
   */
  public async renderReelVideoMp4(script: ReelScript): Promise<{
    videoStored: { hostedUrl: string; downloadUrl: string; fileId: string };
    durationSec: number;
  }> {
    const jobId = randomUUID().replace(/-/g, '').slice(0, 12);
    const tmpFiles: string[] = [];
    const slides = Array.isArray(script.slides) && script.slides.length > 0
      ? script.slides
      : [{ tag: '01', headline: script.title || 'Highlights', body: script.cta || '' }];

    const baseSlideDur = Math.max(2, Math.min(10, Number(script.duration) || 3.2));
    const slideDurations: number[] = slides.map(() => baseSlideDur);

    const videoOutPath = `/tmp/reel_${jobId}_out.mp4`;
    tmpFiles.push(videoOutPath);

    try {
      // 1. Resolve screenrecordUrl to an intra-frame (-g 1) MP4 data URI for instant, frame-accurate seeking
      let resolvedScreenrecordUrl = script.screenrecordUrl || '';
      if (resolvedScreenrecordUrl) {
        const match = resolvedScreenrecordUrl.match(/\/d\/(f_[a-zA-Z0-9_.-]+)/);
        if (match && match[1]) {
          const storedVideo = await storageService.getFile(match[1]);
          if (storedVideo) {
            const rawInPath = `/tmp/reel_${jobId}_src_in.webm`;
            const normOutPath = `/tmp/reel_${jobId}_src_norm.mp4`;
            tmpFiles.push(rawInPath, normOutPath);
            await writeFile(rawInPath, storedVideo.buffer);

            await new Promise<void>((resolve) => {
              execFile(
                'ffmpeg',
                [
                  '-y',
                  '-i',
                  rawInPath,
                  '-c:v',
                  'libx264',
                  '-preset',
                  'ultrafast',
                  '-crf',
                  '20',
                  '-g',
                  '1',
                  '-pix_fmt',
                  'yuv420p',
                  '-movflags',
                  '+faststart',
                  '-an',
                  normOutPath,
                ],
                { timeout: 10000 },
                () => resolve()
              );
            });

            const normBuf = await readFile(normOutPath).catch(() => null);
            if (normBuf && normBuf.length > 1000) {
              resolvedScreenrecordUrl = `data:video/mp4;base64,${normBuf.toString('base64')}`;
            } else {
              resolvedScreenrecordUrl = `data:${storedVideo.metadata.mimeType || 'video/webm'};base64,${storedVideo.buffer.toString('base64')}`;
            }
          }
        }
      }

      // 2. Match exact CSS viewport of Studio Preview (#preview-mockup-frame) at 2x Retina scale
      const aspect = script.aspectRatio || '9:16';
      const virtualDims: Record<string, { cssW: number; cssH: number; outW: number; outH: number }> = {
        '9:16': { cssW: 320, cssH: 568, outW: 720, outH: 1280 },
        '1:1': { cssW: 380, cssH: 380, outW: 720, outH: 720 },
        '16:9': { cssW: 480, cssH: 270, outW: 1280, outH: 720 },
        '4:5': { cssW: 340, cssH: 425, outW: 720, outH: 900 },
      };
      const dim = virtualDims[aspect] || virtualDims['9:16'];
      const totalDurationSec = slideDurations.reduce((a, b) => a + b, 0);

      // 3. Spawn FFmpeg H.264 encoder receiving piped Retina DOM screenshots at 12fps (interpolated to 30fps)
      const renderFps = 12;
      const ffmpegArgs: string[] = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-framerate', String(renderFps),
        '-i', '-',
        '-vf', `fps=30,scale=${dim.outW}:${dim.outH}:flags=lanczos,format=yuv420p`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        videoOutPath,
      ];

      const taskTimeoutMs = Math.max(45000, Math.round((totalDurationSec + 25) * 1000));
      await browserService.executeTask(
        async (_context, page) => {
          const initialPayload = {
            ...script,
            slides,
            aspectRatio: aspect,
            layout: script.layout || 'classic',
            cleanExport: Boolean(script.cleanExport),
            screenrecordUrl: resolvedScreenrecordUrl,
            screenrecordMode: script.screenrecordMode || (resolvedScreenrecordUrl ? 'inset' : 'none'),
            brandColors: script.brandColors || deriveBrandPalette(),
          };
          const serializedState = JSON.stringify(initialPayload).replace(/</g, '\\u003c');

          await page.setContent(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <script src="${env.TAILWIND_CDN_URL}"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,600&family=Plus+Jakarta+Sans:wght@500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${dim.cssW}px;
      height: ${dim.cssH}px;
      overflow: hidden;
      background: #030712;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body>
  <div id="reel-screen" class="w-full h-full p-6 flex flex-col justify-between relative overflow-hidden text-white">
    <video id="preview-backdrop-video" src="" muted playsinline preload="auto" class="absolute inset-0 w-full h-full object-cover opacity-45 pointer-events-none hidden"></video>
    <div id="preview-archetype-decor" class="absolute inset-0 pointer-events-none z-10"></div>
    <div id="preview-editorial-watermark" class="hidden absolute top-1/3 left-3 text-7xl font-black text-white/10 pointer-events-none select-none tracking-tighter z-10">380ms</div>
    <div id="screen-glow" class="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/30 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-rose-500/25 blur-3xl pointer-events-none"></div>

    <div class="z-20 pt-2">
      <div id="progress-bars-row" class="flex items-center space-x-1.5 w-full mb-3.5"></div>
      <div id="preview-header-bar" class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center space-x-2.5">
          <img id="preview-logo-img" src="" crossOrigin="anonymous" class="w-8 h-8 rounded-xl object-contain bg-white/10 p-0.5 border border-white/20 hidden shadow-md" />
          <div id="preview-avatar" class="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md">TP</div>
          <div>
            <div id="preview-brand" class="font-extrabold text-xs text-white leading-none">Tailprint</div>
            <div id="preview-handle" class="text-[10px] text-slate-400 font-mono mt-0.5">@tailprint</div>
          </div>
        </div>
        <span id="preview-tag" class="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 border border-white/20 text-rose-300">HOOK</span>
      </div>
    </div>

    <div id="preview-content-container" class="my-auto z-20 space-y-2.5 py-2">
      <div id="preview-kicker-bar" class="hidden"></div>
      <div id="preview-stage-card" class="space-y-2.5">
        <h2 id="preview-headline" class="text-xl font-black tracking-tight leading-tight text-white drop-shadow-sm"></h2>
        <div id="preview-stat-card" class="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-between space-x-3 shadow-lg">
          <span id="preview-stat" class="text-2xl font-black text-cyan-400"></span>
          <span id="preview-stat-label" class="text-[9px] font-bold uppercase text-white/90 tracking-wider text-right"></span>
        </div>
        <div id="preview-screenrecord-card" class="hidden rounded-xl border border-white/20 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md">
          <div id="preview-browser-bar" class="px-2.5 py-1 bg-slate-900 border-b border-white/10 flex items-center justify-between text-[8px]">
            <div class="flex items-center space-x-1">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <span id="preview-browser-url" class="font-mono text-slate-400 truncate max-w-[140px]">tailprint.com</span>
          </div>
          <video id="preview-screenrecord-video" src="" muted playsinline preload="auto" class="w-full h-28 object-cover object-top"></video>
        </div>
        <p id="preview-body" class="text-xs leading-relaxed text-slate-200/90 font-medium"></p>
        <div id="preview-cta-card" class="hidden pt-1.5">
          <div id="preview-cta-button" class="w-full px-3.5 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-[11px] shadow-xl flex items-center justify-between">
            <span id="preview-cta-button-text" class="truncate pr-2">Follow for more</span>
            <span class="text-sm font-black">→</span>
          </div>
        </div>
      </div>
    </div>

    <div id="preview-footer-bar" class="z-20 border-t border-white/10 pt-3 flex items-center justify-between text-[10px]">
      <div class="flex items-center space-x-1.5 font-bold" id="preview-footer-cta-wrap">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span id="preview-cta">Follow for more</span>
      </div>
      <span id="preview-slide-indicator" class="font-mono text-slate-400 font-bold">1 / 4</span>
    </div>
  </div>

  <script id="reel-export-state" type="application/json">${serializedState}</script>
  <script>
    const reelState = JSON.parse(document.getElementById('reel-export-state').textContent);
    let currentSlideIdx = -1;

    const themeMaps = {
      nordic: {
        id: 'nordic',
        bg: "radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.14), transparent 55%), radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.08), transparent 55%), linear-gradient(165deg, #101726 0%, #0c111c 100%)",
        cardBg: "rgba(16, 23, 38, 0.78)",
        cardBorder: "1px solid rgba(217, 119, 6, 0.25)",
        text: "#fef3c7",
        subtext: "rgba(226, 232, 240, 0.88)",
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(245, 158, 11, 0.12)",
        tagBorder: "rgba(245, 158, 11, 0.35)",
        tagText: "#fcd34d",
        statBg: "rgba(245, 158, 11, 0.08)",
        statBorder: "rgba(245, 158, 11, 0.25)",
        statColor: "#fbbf24",
        badgeIcon: "✦",
        highlightClass: "bg-amber-400/20 text-amber-200 border-b-2 border-amber-400/60 px-1.5 py-0.5 rounded"
      },
      bento: {
        id: 'bento',
        bg: "radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.2), transparent 55%), linear-gradient(180deg, #070b14 0%, #030509 100%)",
        cardBg: "rgba(255, 255, 255, 0.04)",
        cardBorder: "1px solid rgba(255, 255, 255, 0.12)",
        text: "#ffffff",
        subtext: "rgba(203, 213, 225, 0.85)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
        tagBg: "rgba(56, 189, 248, 0.15)",
        tagBorder: "rgba(56, 189, 248, 0.35)",
        tagText: "#38bdf8",
        statBg: "rgba(56, 189, 248, 0.08)",
        statBorder: "rgba(56, 189, 248, 0.2)",
        statColor: "#38bdf8",
        badgeIcon: "●",
        highlightClass: "bg-sky-500/20 text-sky-200 border border-sky-400/30 px-1.5 py-0.5 rounded-lg"
      },
      brutalist: {
        id: 'brutalist',
        bg: "#000000",
        cardBg: "#09090b",
        cardBorder: "2px solid #ffffff",
        cardShadow: "4px 4px 0px #facc15",
        text: "#ffffff",
        subtext: "#e4e4e7",
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'Space Grotesk', monospace, sans-serif",
        tagBg: "#facc15",
        tagBorder: "#ffffff",
        tagText: "#000000",
        statBg: "#18181b",
        statBorder: "#ffffff",
        statColor: "#facc15",
        badgeIcon: "⚡",
        highlightClass: "bg-yellow-400 text-black font-black px-1.5 py-0.5 -rotate-1 inline-block"
      },
      creator: {
        id: 'creator',
        bg: "radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.25), transparent 45%), radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.25), transparent 45%), linear-gradient(135deg, #180828 0%, #080310 100%)",
        cardBg: "rgba(30, 15, 45, 0.7)",
        cardBorder: "1px solid rgba(244, 63, 94, 0.35)",
        text: "#ffffff",
        subtext: "rgba(254, 205, 211, 0.9)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "linear-gradient(90deg, #f43f5e 0%, #f59e0b 100%)",
        tagBorder: "transparent",
        tagText: "#ffffff",
        statBg: "rgba(244, 63, 94, 0.12)",
        statBorder: "rgba(244, 63, 94, 0.3)",
        statColor: "#fbbf24",
        badgeIcon: "🔥",
        highlightClass: "bg-gradient-to-r from-rose-500/30 to-amber-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 rounded-lg"
      },
      terminal: {
        id: 'terminal',
        bg: "#080c14",
        cardBg: "rgba(10, 15, 26, 0.9)",
        cardBorder: "1px solid rgba(52, 211, 153, 0.35)",
        text: "#34d399",
        subtext: "#94a3b8",
        fontHead: "'JetBrains Mono', monospace",
        fontBody: "'JetBrains Mono', monospace",
        tagBg: "rgba(6, 78, 59, 0.8)",
        tagBorder: "rgba(52, 211, 153, 0.4)",
        tagText: "#34d399",
        statBg: "rgba(6, 78, 59, 0.3)",
        statBorder: "rgba(52, 211, 153, 0.3)",
        statColor: "#34d399",
        badgeIcon: ">_",
        highlightClass: "bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30"
      },
      brand: {
        id: 'brand',
        bg: "linear-gradient(135deg, #4f46e5 0%, #090d16 100%)",
        cardBg: "rgba(255, 255, 255, 0.06)",
        cardBorder: "1px solid rgba(255, 255, 255, 0.15)",
        text: "#ffffff",
        subtext: "rgba(226, 232, 240, 0.85)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(255, 255, 255, 0.12)",
        tagBorder: "rgba(255, 255, 255, 0.25)",
        tagText: "#ffffff",
        statBg: "rgba(255, 255, 255, 0.08)",
        statBorder: "rgba(255, 255, 255, 0.18)",
        statColor: "#38bdf8",
        badgeIcon: "✨",
        highlightClass: "bg-white/15 text-white border-b-2 border-white/50 px-1.5 py-0.5 rounded"
      },
      gradient: {
        id: 'gradient',
        bg: "linear-gradient(145deg, #1e1b4b 0%, #31104b 50%, #030712 100%)",
        cardBg: "rgba(255, 255, 255, 0.06)",
        cardBorder: "1px solid rgba(255, 255, 255, 0.12)",
        text: "#ffffff",
        subtext: "rgba(233, 213, 255, 0.85)",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(99, 102, 241, 0.2)",
        tagBorder: "rgba(99, 102, 241, 0.4)",
        tagText: "#a5b4fc",
        statBg: "rgba(255, 255, 255, 0.08)",
        statBorder: "rgba(255, 255, 255, 0.15)",
        statColor: "#38bdf8",
        badgeIcon: "✦",
        highlightClass: "bg-indigo-500/25 text-cyan-300 border-b-2 border-cyan-400/60 px-1.5 py-0.5 rounded"
      },
      cyberpunk: {
        id: 'cyberpunk',
        bg: "#09090b",
        cardBg: "rgba(24, 24, 27, 0.85)",
        cardBorder: "1px solid rgba(250, 204, 21, 0.35)",
        text: "#facc15",
        subtext: "#d4d4d8",
        fontHead: "'Space Grotesk', monospace, sans-serif",
        fontBody: "'JetBrains Mono', monospace",
        tagBg: "rgba(250, 204, 21, 0.15)",
        tagBorder: "rgba(250, 204, 21, 0.4)",
        tagText: "#fef08a",
        statBg: "rgba(250, 204, 21, 0.08)",
        statBorder: "rgba(250, 204, 21, 0.3)",
        statColor: "#ec4899",
        badgeIcon: "⚡",
        highlightClass: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-1.5 py-0.5 rounded"
      },
      midnight: {
        id: 'midnight',
        bg: "radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15), transparent 60%), #040707",
        cardBg: "rgba(8, 16, 14, 0.85)",
        cardBorder: "1px solid rgba(16, 185, 129, 0.25)",
        text: "#fafafa",
        subtext: "#a1a1aa",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(16, 185, 129, 0.15)",
        tagBorder: "rgba(16, 185, 129, 0.3)",
        tagText: "#34d399",
        statBg: "rgba(16, 185, 129, 0.08)",
        statBorder: "rgba(16, 185, 129, 0.2)",
        statColor: "#10b981",
        badgeIcon: "●",
        highlightClass: "bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400/60 px-1.5 py-0.5 rounded"
      },
      sunset: {
        id: 'sunset',
        bg: "radial-gradient(circle at 80% 10%, rgba(244, 63, 94, 0.3), transparent 50%), linear-gradient(180deg, #2a0b18 0%, #0f0714 50%, #201006 100%)",
        cardBg: "rgba(30, 15, 25, 0.75)",
        cardBorder: "1px solid rgba(251, 146, 60, 0.25)",
        text: "#ffffff",
        subtext: "rgba(254, 205, 211, 0.85)",
        fontHead: "'Playfair Display', Georgia, serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "rgba(244, 63, 94, 0.2)",
        tagBorder: "rgba(244, 63, 94, 0.4)",
        tagText: "#fda4af",
        statBg: "rgba(244, 63, 94, 0.1)",
        statBorder: "rgba(244, 63, 94, 0.25)",
        statColor: "#f59e0b",
        badgeIcon: "🌅",
        highlightClass: "bg-rose-500/20 text-rose-200 border-b-2 border-rose-400/60 px-1.5 py-0.5 rounded"
      },
      clean: {
        id: 'clean',
        bg: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
        cardBg: "#ffffff",
        cardBorder: "1px solid #cbd5e1",
        text: "#0f172a",
        subtext: "#475569",
        fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontBody: "'Inter', sans-serif",
        tagBg: "#dbeafe",
        tagBorder: "#bfdbfe",
        tagText: "#1d4ed8",
        statBg: "#ffffff",
        statBorder: "#cbd5e1",
        statColor: "#2563eb",
        badgeIcon: "✦",
        highlightClass: "bg-blue-100 text-blue-900 border-b-2 border-blue-400 px-1.5 py-0.5 rounded"
      }
    };

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function formatHighlightedHtml(text, highlightWords, markClass) {
      if (!text) return '';
      let formatted = escapeHtml(text);
      const cls = markClass || 'bg-amber-400/20 text-amber-200 px-1 rounded';
      const escReg = new RegExp('[.*+?^' + '\\$' + '{}()|[\\]\\\\]', 'g');
      const list = Array.isArray(highlightWords) ? highlightWords.slice() : [];
      let matched = false;
      for (const word of list) {
        if (!word || String(word).trim().length < 2) continue;
        const cleanWord = escapeHtml(String(word).trim()).replace(escReg, '\\\\$&');
        const regex = new RegExp('(' + cleanWord + ')', 'gi');
        if (regex.test(formatted)) {
          formatted = formatted.replace(regex, '<mark class="' + cls + '">$1</mark>');
          matched = true;
          break;
        }
      }
      if (!matched) {
        const words = escapeHtml(text).split(/\\s+/).map(w => w.replace(/[,.!?«»"']/g, '')).filter(w => w.length >= 6);
        if (words.length > 0) {
          const fallbackWord = words[words.length - 1].replace(escReg, '\\\\$&');
          const regex = new RegExp('(' + fallbackWord + ')', 'i');
          formatted = formatted.replace(regex, '<mark class="' + cls + '">$1</mark>');
        }
      }
      return formatted;
    }

    function renderProgressBars(activeProgress) {
      const row = document.getElementById('progress-bars-row');
      if (!row) return;
      row.innerHTML = reelState.slides.map((_, i) => {
        let fillWidth = '0%';
        if (i < currentSlideIdx) fillWidth = '100%';
        else if (i === currentSlideIdx) fillWidth = Math.min(100, Math.round((activeProgress || 0) * 100)) + '%';
        return '<div class="h-1 flex-1 rounded-full overflow-hidden bg-white/20 relative">' +
          '<div id="progress-fill-' + i + '" class="h-full bg-white" style="width: ' + fillWidth + '"></div>' +
        '</div>';
      }).join('');
    }

    function updatePreviewDisplay() {
      const slide = reelState.slides[currentSlideIdx] || reelState.slides[0];
      if (reelState.brandColors) {
        themeMaps.brand.bg = "linear-gradient(135deg, " + reelState.brandColors.primary + " 0%, " + reelState.brandColors.secondary + " 100%)";
        themeMaps.brand.statColor = reelState.brandColors.accent;
      }
      const themeKey = reelState.theme || 'brand';
      const isLight = themeKey === 'clean';
      const theme = themeMaps[themeKey] || themeMaps.brand || themeMaps.gradient;
      const slideType = slide.slideType || (currentSlideIdx === 0 ? 'hook' : currentSlideIdx === 1 ? 'problem' : currentSlideIdx === 2 ? 'stat' : 'cta');
      const screen = document.getElementById('reel-screen');

      screen.style.background = theme.bg;
      screen.style.color = theme.text;

      const decorEl = document.getElementById('preview-archetype-decor');
      if (decorEl) {
        if (themeKey === 'nordic') {
          decorEl.innerHTML = '<div class="absolute inset-2.5 border border-amber-500/20 rounded-[24px]"></div>';
        } else if (themeKey === 'brutalist') {
          decorEl.innerHTML =
            '<span class="absolute top-3 left-3 font-mono text-[10px] font-black text-white/60">+</span>' +
            '<span class="absolute top-3 right-3 font-mono text-[10px] font-black text-white/60">+</span>' +
            '<span class="absolute bottom-3 left-3 font-mono text-[10px] font-black text-white/60">+</span>' +
            '<span class="absolute bottom-3 right-3 font-mono text-[10px] font-black text-white/60">+</span>';
        } else {
          decorEl.innerHTML = '';
        }
      }

      const brandEl = document.getElementById('preview-brand');
      const handleEl = document.getElementById('preview-handle');
      const headerBar = document.getElementById('preview-header-bar');
      const footerBar = document.getElementById('preview-footer-bar');
      const footerCtaWrap = document.getElementById('preview-footer-cta-wrap');
      if (brandEl) {
        brandEl.textContent = reelState.brand || 'Brand';
        brandEl.style.color = theme.text;
        brandEl.style.fontFamily = theme.fontHead || 'system-ui, sans-serif';
      }
      if (handleEl) {
        handleEl.textContent = reelState.handle || '@brand';
        handleEl.style.color = theme.subtext;
      }
      if (headerBar) {
        headerBar.style.borderColor = isLight ? 'rgba(15, 23, 42, 0.12)' : (themeKey === 'brutalist' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)');
      }
      if (footerBar) {
        footerBar.style.borderColor = isLight ? 'rgba(15, 23, 42, 0.12)' : (themeKey === 'brutalist' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)');
      }
      if (footerCtaWrap) {
        footerCtaWrap.style.color = theme.text;
      }

      const logoImg = document.getElementById('preview-logo-img');
      const avatarDiv = document.getElementById('preview-avatar');
      if (reelState.logoUrl) {
        if (logoImg) {
          if (logoImg.getAttribute('src') !== reelState.logoUrl) logoImg.src = reelState.logoUrl;
          logoImg.classList.remove('hidden');
        }
        if (avatarDiv) avatarDiv.classList.add('hidden');
      } else {
        if (logoImg) logoImg.classList.add('hidden');
        if (avatarDiv) {
          avatarDiv.classList.remove('hidden');
          avatarDiv.textContent = (reelState.brand || 'TP').slice(0, 2).toUpperCase();
        }
      }

      const tagEl = document.getElementById('preview-tag');
      const badgeIcon = theme.badgeIcon ? '<span class="mr-1">' + theme.badgeIcon + '</span>' : '';
      tagEl.innerHTML = badgeIcon + escapeHtml(slide.tag || ('0' + (currentSlideIdx + 1)));
      tagEl.style.backgroundColor = theme.tagBg;
      tagEl.style.borderColor = theme.tagBorder;
      tagEl.style.color = theme.tagText;
      tagEl.style.borderRadius = themeKey === 'brutalist' ? '0px' : '9999px';

      const kickerBar = document.getElementById('preview-kicker-bar');
      if (kickerBar) {
        if (themeKey === 'terminal') {
          const slugBrand = (reelState.brand || 'app').toLowerCase().replace(/[^a-z0-9_-]/g, '');
          kickerBar.className = 'flex items-center justify-between px-2.5 py-1.5 rounded-t-xl bg-slate-900/95 border border-b-0 border-emerald-500/40 font-mono text-[9px] text-emerald-400 -mb-2.5';
          kickerBar.innerHTML =
            '<div class="flex items-center space-x-1">' +
              '<span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>' +
              '<span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>' +
              '<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>' +
              '<span class="ml-1.5 text-slate-400">~/' + escapeHtml(slugBrand) + '/0' + (currentSlideIdx + 1) + '.sh</span>' +
            '</div>' +
            '<span>[0' + (currentSlideIdx + 1) + '/0' + reelState.slides.length + ']</span>';
        } else if (themeKey === 'nordic') {
          kickerBar.className = 'flex items-center space-x-2 text-[10px] tracking-widest uppercase text-amber-300/90 mb-1';
          kickerBar.innerHTML =
            '<span class="italic font-serif lowercase text-xs text-amber-200">kap. 0' + (currentSlideIdx + 1) + '</span>' +
            '<span class="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent"></span>';
        } else if (themeKey === 'brutalist') {
          kickerBar.className = 'flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-yellow-400 mb-1';
          kickerBar.innerHTML =
            '<span>+ ' + escapeHtml(slide.tag || 'RAW') + ' +</span>' +
            '<span class="px-1.5 py-0.5 bg-white text-black">0' + (currentSlideIdx + 1) + '</span>';
        } else {
          kickerBar.className = 'hidden';
          kickerBar.innerHTML = '';
        }
      }

      const headlineEl = document.getElementById('preview-headline');
      const bodyEl = document.getElementById('preview-body');
      const stageCard = document.getElementById('preview-stage-card');
      headlineEl.innerHTML = formatHighlightedHtml(slide.headline, slide.highlightWords, theme.highlightClass);
      headlineEl.style.color = theme.text;
      headlineEl.style.fontFamily = theme.fontHead || 'system-ui, -apple-system, sans-serif';
      headlineEl.style.textAlign = slideType === 'cta' ? 'center' : 'left';

      bodyEl.textContent = (themeKey === 'terminal' ? '> ' : '') + (slide.body || '');
      bodyEl.style.color = theme.subtext;
      bodyEl.style.fontFamily = theme.fontBody || 'system-ui, -apple-system, sans-serif';
      bodyEl.style.textAlign = slideType === 'cta' ? 'center' : 'left';

      if (stageCard) {
        const shouldFrameStage = themeKey === 'terminal' || themeKey === 'brutalist' || slideType === 'problem' || (themeKey === 'bento' && slideType !== 'hook');
        if (shouldFrameStage) {
          stageCard.style.background = theme.cardBg || 'rgba(255,255,255,0.06)';
          stageCard.style.border = theme.cardBorder || '1px solid rgba(255,255,255,0.14)';
          stageCard.style.boxShadow = theme.cardShadow || 'none';
          stageCard.style.padding = '12px';
          stageCard.style.borderRadius = themeKey === 'brutalist' ? '0px' : (themeKey === 'terminal' ? '0 0 14px 14px' : '18px');
        } else {
          stageCard.style.background = 'transparent';
          stageCard.style.border = 'none';
          stageCard.style.boxShadow = 'none';
          stageCard.style.padding = '0px';
          stageCard.style.borderRadius = '0px';
        }
      }

      const statCard = document.getElementById('preview-stat-card');
      const statVal = document.getElementById('preview-stat');
      const statLabel = document.getElementById('preview-stat-label');
      if (slide.stat) {
        statCard.classList.remove('hidden');
        statCard.style.backgroundColor = theme.statBg;
        statCard.style.borderColor = theme.statBorder;
        statCard.style.borderRadius = themeKey === 'brutalist' ? '0px' : '16px';
        statVal.textContent = slide.stat;
        statVal.style.color = theme.statColor;
        statVal.style.fontFamily = theme.fontHead || 'system-ui, -apple-system, sans-serif';
        statLabel.textContent = slide.statLabel || 'METRIC';
        statLabel.style.color = theme.text;
      } else {
        statCard.classList.add('hidden');
      }

      const ctaCard = document.getElementById('preview-cta-card');
      const ctaBtn = document.getElementById('preview-cta-button');
      const ctaBtnText = document.getElementById('preview-cta-button-text');
      if (ctaCard && ctaBtn && ctaBtnText) {
        if (slideType === 'cta') {
          ctaCard.classList.remove('hidden');
          ctaBtnText.textContent = reelState.cta || 'Learn more';
          ctaBtn.style.borderRadius = themeKey === 'brutalist' ? '0px' : '16px';
          ctaBtn.style.background = theme.statColor || '#38bdf8';
          ctaBtn.style.color = (themeKey === 'brutalist' || themeKey === 'nordic' || themeKey === 'terminal' || themeKey === 'creator') ? '#090d16' : '#ffffff';
          ctaBtn.style.border = themeKey === 'brutalist' ? '2px solid #ffffff' : 'none';
        } else {
          ctaCard.classList.add('hidden');
        }
      }

      const layout = reelState.layout || 'classic';
      const contentBox = document.getElementById('preview-content-container');
      const watermark = document.getElementById('preview-editorial-watermark');
      const srCard = document.getElementById('preview-screenrecord-card');
      const browserBar = document.getElementById('preview-browser-bar');

      if (watermark) {
        if (layout === 'editorial') {
          watermark.textContent = slide.stat || ('0' + (currentSlideIdx + 1));
          watermark.style.fontFamily = theme.fontHead || 'serif';
          watermark.style.color = isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.08)';
          watermark.classList.remove('hidden');
        } else {
          watermark.classList.add('hidden');
        }
      }

      if (contentBox) {
        if (reelState.aspectRatio === '16:9') {
          contentBox.className = 'my-auto z-20 grid grid-cols-2 gap-4 items-center space-y-0 py-1';
        } else if (reelState.aspectRatio === '1:1') {
          contentBox.className = 'my-auto z-20 space-y-2 py-1';
        } else if (reelState.aspectRatio === '4:5') {
          contentBox.className = 'my-auto z-20 space-y-2.5 py-1';
        } else {
          contentBox.className = 'my-auto z-20 space-y-3.5 py-3';
        }

        if (layout === 'editorial') {
          contentBox.style.borderLeft = (themeKey === 'brutalist' ? '5px solid ' : '3px solid ') + (theme.statColor || '#38bdf8');
          contentBox.style.paddingLeft = '12px';
          contentBox.style.background = 'transparent';
          contentBox.style.borderTop = 'none';
          contentBox.style.borderRadius = '0px';
        } else if (layout === 'split') {
          contentBox.style.borderLeft = 'none';
          contentBox.style.paddingLeft = '0px';
          contentBox.style.background = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(9, 13, 22, 0.72)';
          contentBox.style.padding = '12px';
          contentBox.style.borderRadius = themeKey === 'brutalist' ? '0px' : '16px';
          contentBox.style.borderTop = '3px solid ' + (theme.statColor || '#38bdf8');
        } else {
          contentBox.style.borderLeft = 'none';
          contentBox.style.borderTop = 'none';
          contentBox.style.paddingLeft = '0px';
          contentBox.style.padding = '8px 0';
          contentBox.style.background = 'transparent';
        }
      }

      if (srCard && browserBar) {
        if (layout === 'iphone') {
          srCard.className = 'mx-auto w-40 rounded-[26px] border-4 border-slate-600 bg-slate-950 shadow-2xl overflow-hidden';
          browserBar.innerHTML = '<div class="mx-auto w-12 h-2.5 bg-black rounded-full my-0.5"></div>';
        } else {
          srCard.className = (themeKey === 'brutalist' ? 'rounded-none border-2 border-white' : 'rounded-xl border border-white/20') + ' bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md';
          browserBar.innerHTML = '<div class="flex items-center space-x-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span></div><span id="preview-browser-url" class="font-mono text-slate-400 truncate max-w-[140px]">tailprint.com</span>';
        }
      }

      document.getElementById('preview-cta').textContent = reelState.cta || 'Learn more';
      const slideInd = document.getElementById('preview-slide-indicator');
      const progRow = document.getElementById('progress-bars-row');
      if (slideInd) {
        slideInd.textContent = (currentSlideIdx + 1) + ' / ' + reelState.slides.length;
        if (reelState.cleanExport) slideInd.classList.add('hidden');
        else slideInd.classList.remove('hidden');
      }
      if (progRow) {
        if (reelState.cleanExport) progRow.classList.add('hidden');
        else progRow.classList.remove('hidden');
      }

      const card = document.getElementById('preview-screenrecord-card');
      const backdrop = document.getElementById('preview-backdrop-video');
      const urlLabel = document.getElementById('preview-browser-url');

      if (!reelState.screenrecordUrl || reelState.screenrecordMode === 'none') {
        if (card) card.classList.add('hidden');
        if (backdrop) backdrop.classList.add('hidden');
      } else {
        if (urlLabel && reelState.sourceUrl) {
          try {
            urlLabel.textContent = new URL(reelState.sourceUrl).hostname.replace(/^www\\./, '');
          } catch {
            urlLabel.textContent = (reelState.brand || 'site').toLowerCase() + '.com';
          }
        }
        if (reelState.screenrecordMode === 'inset') {
          if (card) card.classList.remove('hidden');
          if (backdrop) backdrop.classList.add('hidden');
        } else if (reelState.screenrecordMode === 'backdrop') {
          if (card) card.classList.add('hidden');
          if (backdrop) backdrop.classList.remove('hidden');
        }
      }
    }

    window.__initAssets = async () => {
      const promises = [];
      if (reelState.logoUrl) {
        const logoEl = document.getElementById('preview-logo-img');
        if (logoEl) {
          promises.push(new Promise((res) => {
            logoEl.onload = () => res();
            logoEl.onerror = () => res();
            logoEl.src = reelState.logoUrl;
            setTimeout(res, 2000);
          }));
        }
      }
      if (reelState.screenrecordUrl && reelState.screenrecordMode !== 'none') {
        const activeVid = reelState.screenrecordMode === 'backdrop'
          ? document.getElementById('preview-backdrop-video')
          : document.getElementById('preview-screenrecord-video');
        if (activeVid) {
          promises.push(new Promise((res) => {
            activeVid.onloadeddata = () => res();
            activeVid.onerror = () => res();
            activeVid.src = reelState.screenrecordUrl;
            setTimeout(res, 3500);
          }));
        }
      }
      if (document.fonts && document.fonts.ready) {
        promises.push(Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]));
      }
      await Promise.all(promises);
      currentSlideIdx = 0;
      updatePreviewDisplay();
      renderProgressBars(0);
    };

    window.__syncReelFrame = async (idx, prog) => {
      if (idx !== currentSlideIdx) {
        currentSlideIdx = idx;
        updatePreviewDisplay();
      }
      renderProgressBars(prog);

      if (reelState.screenrecordUrl && reelState.screenrecordMode !== 'none') {
        const activeVid = reelState.screenrecordMode === 'backdrop'
          ? document.getElementById('preview-backdrop-video')
          : document.getElementById('preview-screenrecord-video');
        if (activeVid && activeVid.readyState >= 1 && Number.isFinite(activeVid.duration) && activeVid.duration > 0) {
          activeVid.pause();
          const total = Math.max(1, reelState.slides.length);
          const baseStart = activeVid.duration > 6.5 ? 0.28 : 0.02;
          const baseSpan = activeVid.duration > 6.5 ? 0.70 : 0.96;
          const targetFrac = baseStart + ((idx + prog * 0.9) / total) * baseSpan;
          const targetTime = Math.min(activeVid.duration - 0.04, Math.max(0, activeVid.duration * targetFrac));
          if (Math.abs(activeVid.currentTime - targetTime) > 0.03) {
            await new Promise((res) => {
              const onSeek = () => {
                activeVid.removeEventListener('seeked', onSeek);
                res();
              };
              activeVid.addEventListener('seeked', onSeek);
              activeVid.currentTime = targetTime;
              setTimeout(() => {
                activeVid.removeEventListener('seeked', onSeek);
                res();
              }, 220);
            });
          }
        }
      }
    };
  </script>
</body>
</html>`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

          await page.evaluate(() => (window as any).__initAssets());
          await page.waitForTimeout(150);

          // Start FFmpeg process and stream Retina DOM screenshots
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
            const frameCount = Math.max(8, Math.round(sDur * renderFps));
            for (let f = 0; f < frameCount; f++) {
              const progress = f / frameCount;
              await page.evaluate(
                ({ idx, prog }) => (window as any).__syncReelFrame(idx, prog),
                { idx: sIdx, prog: progress }
              );
              const frameBuf = await page.screenshot({ type: 'jpeg', quality: 90 });
              const canContinue = ffmpegProc.stdin.write(frameBuf);
              if (!canContinue) {
                await new Promise<void>((r) => ffmpegProc.stdin.once('drain', r));
              }
            }
          }

          ffmpegProc.stdin.end();
          await ffmpegExitPromise;
        },
        { width: dim.cssW, height: dim.cssH },
        false,
        taskTimeoutMs
      );

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
      };
    } finally {
      for (const f of tmpFiles) {
        await unlink(f).catch(() => {});
      }
    }
  }
}

export const reelService = ReelService.getInstance();
