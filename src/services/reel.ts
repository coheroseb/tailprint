import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
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
    if (archetype === 'bento' || archetype === 'creator' || archetype === 'brand') return 'iphone';
    if (archetype === 'terminal' || archetype === 'brutalist' || archetype === 'cyberpunk') return 'split';
    if (archetype === 'nordic' || archetype === 'sunset' || archetype === 'clean') return 'split';
    return 'iphone';
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
      // 1. Resolve screenrecordUrl to in-memory data URI if hosted locally in storageService
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

      // 2. Determine virtual & physical canvas dimensions (2/3 scale for fast HD 720p H.264 encoding)
      const aspect = script.aspectRatio || '9:16';
      const virtualDims: Record<string, { w: number; h: number; outW: number; outH: number }> = {
        '9:16': { w: 1080, h: 1920, outW: 720, outH: 1280 },
        '1:1': { w: 1080, h: 1080, outW: 720, outH: 720 },
        '16:9': { w: 1920, h: 1080, outW: 1280, outH: 720 },
        '4:5': { w: 1080, h: 1350, outW: 720, outH: 900 },
      };
      const dim = virtualDims[aspect] || virtualDims['9:16'];
      const totalDurationSec = slideDurations.reduce((a, b) => a + b, 0);

      // 3. Spawn FFmpeg H.264 encoder receiving piped JPEG frames at 15fps (interpolated to 30fps)
      const renderFps = 15;
      const ffmpegArgs: string[] = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-framerate', String(renderFps),
        '-i', '-',
        '-vf', 'fps=30,format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '21',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        videoOutPath,
      ];

      const taskTimeoutMs = Math.max(45000, Math.round((totalDurationSec + 25) * 1000));
      await browserService.executeTask(
        async (context) => {
        const page = await context.newPage();
        await page.setViewportSize({ width: dim.outW, height: dim.outH });
        await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,600&family=Plus+Jakarta+Sans:wght@500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
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

          // Ensure Google Fonts (Playfair Display, Space Grotesk, JetBrains Mono, Plus Jakarta Sans, Inter) finish loading before Frame 0
          if ((document as any).fonts) {
            await Promise.race([
              Promise.all([
                (document as any).fonts.load('900 72px "Playfair Display"').catch(() => {}),
                (document as any).fonts.load('italic 600 32px "Playfair Display"').catch(() => {}),
                (document as any).fonts.load('800 72px "Space Grotesk"').catch(() => {}),
                (document as any).fonts.load('700 44px "JetBrains Mono"').catch(() => {}),
                (document as any).fonts.load('800 72px "Plus Jakarta Sans"').catch(() => {}),
                (document as any).fonts.load('600 44px "Inter"').catch(() => {}),
                (document as any).fonts.ready,
              ]),
              new Promise<void>((r) => setTimeout(r, 2500)),
            ]);
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
            const themeKey = st.theme || 'brand';
            const isLight = themeKey === 'clean';
            const slideType = slide.slideType || (slideIdx === 0 ? 'hook' : slideIdx === 1 ? 'problem' : slideIdx === 2 ? 'stat' : 'cta');

            const themes: Record<string, any> = {
              nordic: {
                bg1: '#101726',
                bg2: '#0c111c',
                text: '#fef3c7',
                sub: '#cbd5e1',
                accent: '#fbbf24',
                fontHead: "'Playfair Display', Georgia, serif",
                fontBody: "'Inter', sans-serif",
                tagBg: 'rgba(245, 158, 11, 0.15)',
                tagText: '#fcd34d',
                badgeIcon: '✦',
              },
              bento: {
                bg1: '#070b14',
                bg2: '#030509',
                text: '#ffffff',
                sub: '#cbd5e1',
                accent: '#38bdf8',
                fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
                tagBg: 'rgba(56, 189, 248, 0.15)',
                tagText: '#38bdf8',
                badgeIcon: '●',
              },
              brutalist: {
                bg1: '#000000',
                bg2: '#000000',
                text: '#ffffff',
                sub: '#d4d4d8',
                accent: '#facc15',
                fontHead: "'Space Grotesk', monospace, sans-serif",
                fontBody: "'Space Grotesk', monospace, sans-serif",
                tagBg: '#facc15',
                tagText: '#000000',
                badgeIcon: '⚡',
              },
              creator: {
                bg1: '#1e082e',
                bg2: '#080310',
                text: '#ffffff',
                sub: '#fecdd3',
                accent: '#fbbf24',
                fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontBody: "'Inter', sans-serif",
                tagBg: 'rgba(244, 63, 94, 0.3)',
                tagText: '#fda4af',
                badgeIcon: '🔥',
              },
              terminal: {
                bg1: '#080c14',
                bg2: '#05070c',
                text: '#34d399',
                sub: '#94a3b8',
                accent: '#34d399',
                fontHead: "'JetBrains Mono', monospace",
                fontBody: "'JetBrains Mono', monospace",
                tagBg: 'rgba(6, 78, 59, 0.8)',
                tagText: '#34d399',
                badgeIcon: '>_',
              },
              brand: {
                bg1: st.brandColors?.primary || '#4f46e5',
                bg2: st.brandColors?.secondary || '#090d16',
                text: '#ffffff',
                sub: '#cbd5e1',
                accent: st.brandColors?.accent || '#38bdf8',
                fontHead: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontBody: "'Inter', sans-serif",
                tagBg: 'rgba(255, 255, 255, 0.14)',
                tagText: '#ffffff',
                badgeIcon: '✨',
              },
              gradient: { bg1: '#1e1b4b', bg2: '#3b0764', text: '#ffffff', sub: '#c4b5fd', accent: '#22d3ee', fontHead: "'Plus Jakarta Sans', system-ui, sans-serif", fontBody: "'Inter', sans-serif", tagBg: 'rgba(99, 102, 241, 0.25)', tagText: '#a5b4fc', badgeIcon: '✦' },
              cyberpunk: { bg1: '#09090b', bg2: '#18181b', text: '#facc15', sub: '#d4d4d8', accent: '#ec4899', fontHead: "'Space Grotesk', monospace, sans-serif", fontBody: "'JetBrains Mono', monospace", tagBg: 'rgba(250, 204, 21, 0.15)', tagText: '#fde047', badgeIcon: '⚡' },
              midnight: { bg1: '#000000', bg2: '#090d16', text: '#f8fafc', sub: '#94a3b8', accent: '#34d399', fontHead: "'Plus Jakarta Sans', system-ui, sans-serif", fontBody: "'Inter', sans-serif", tagBg: 'rgba(16, 185, 129, 0.2)', tagText: '#34d399', badgeIcon: '●' },
              sunset: { bg1: '#4c0519', bg2: '#451a03', text: '#ffffff', sub: '#fecdd3', accent: '#fbbf24', fontHead: "'Playfair Display', Georgia, serif", fontBody: "'Inter', sans-serif", tagBg: 'rgba(244, 63, 94, 0.25)', tagText: '#fda4af', badgeIcon: '🌅' },
              clean: { bg1: '#f8fafc', bg2: '#e2e8f0', text: '#0f172a', sub: '#475569', accent: '#2563eb', fontHead: "'Plus Jakarta Sans', system-ui, sans-serif", fontBody: "'Inter', sans-serif", tagBg: 'rgba(37, 99, 235, 0.12)', tagText: '#1d4ed8', badgeIcon: '✦' },
            };
            const t = themes[themeKey] || themes.brand || themes.nordic;
            const cardRadius = themeKey === 'brutalist' ? 0 : 28;

            function roundRect(x: number, y: number, w: number, h: number, r: number) {
              if (r <= 0) {
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.closePath();
                return;
              }
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.arcTo(x + w, y, x + w, y + h, r);
              ctx.arcTo(x + w, y + h, x, y + h, r);
              ctx.arcTo(x, y + h, x, y, r);
              ctx.arcTo(x, y, x + w, y, r);
              ctx.closePath();
            }

            function drawArchetypeCard(x: number, y: number, w: number, h: number, withTerminalBar = true) {
              ctx.save();
              if (themeKey === 'brutalist') {
                ctx.fillStyle = '#facc15';
                ctx.fillRect(x + 10, y + 10, w, h);
                ctx.fillStyle = '#050505';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, w, h);
              } else if (themeKey === 'terminal') {
                ctx.fillStyle = 'rgba(10, 15, 26, 0.94)';
                roundRect(x, y, w, h, 20);
                ctx.fill();
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.40)';
                ctx.lineWidth = 2;
                roundRect(x, y, w, h, 20);
                ctx.stroke();
                if (withTerminalBar) {
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
                  roundRect(x + 1, y + 1, w - 2, 42, 18);
                  ctx.fill();
                  ctx.fillRect(x + 1, y + 22, w - 2, 21);
                  ctx.fillStyle = '#f43f5e';
                  ctx.beginPath(); ctx.arc(x + 24, y + 22, 6, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath(); ctx.arc(x + 44, y + 22, 6, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#34d399';
                  ctx.beginPath(); ctx.arc(x + 64, y + 22, 6, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#64748b';
                  ctx.font = `600 18px ${t.fontBody}`;
                  ctx.fillText(`~/${(st.brand || 'app').toLowerCase().replace(/[^a-z0-9_-]/g, '')}/slide-0${slideIdx + 1}.sh`, x + 86, y + 28);
                }
              } else if (themeKey === 'nordic') {
                ctx.fillStyle = 'rgba(16, 23, 38, 0.80)';
                roundRect(x, y, w, h, cardRadius);
                ctx.fill();
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
                ctx.lineWidth = 1.5;
                roundRect(x, y, w, h, cardRadius);
                ctx.stroke();
              } else if (isLight) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.shadowColor = 'rgba(15, 23, 42, 0.09)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 10;
                roundRect(x, y, w, h, cardRadius);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
                ctx.lineWidth = 1.5;
                roundRect(x, y, w, h, cardRadius);
                ctx.stroke();
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                roundRect(x, y, w, h, cardRadius);
                ctx.fill();
                ctx.strokeStyle = t.accent + '44';
                ctx.lineWidth = 1.5;
                roundRect(x, y, w, h, cardRadius);
                ctx.stroke();
              }
              ctx.restore();
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

            function buildHighlightTokens(): Set<string> {
              const tokens = new Set<string>();
              const list = Array.isArray(slide.highlightWords) ? slide.highlightWords : [];
              for (const phrase of list) {
                String(phrase || '')
                  .toLowerCase()
                  .split(/\s+/)
                  .map((w) => w.replace(/[^a-zæøåäöü0-9-]/gi, ''))
                  .filter((w) => w.length >= 3)
                  .forEach((w) => tokens.add(w));
              }
              return tokens;
            }

            function drawHighlightedHeadline(
              text: string,
              x: number,
              startY: number,
              maxWidth: number,
              lineHeight: number,
              fontSize: number,
              centered = false
            ): number {
              ctx.font = `900 ${fontSize}px ${t.fontHead}`;
              const hLines = wrapLines(text || '', maxWidth);
              const tokens = buildHighlightTokens();
              let curY = startY;

              hLines.forEach((line) => {
                const words = line.trim().split(/\s+/).filter(Boolean);
                const lineW = ctx.measureText(line).width;
                let curX = centered ? x + (maxWidth - lineW) / 2 : x;

                words.forEach((word) => {
                  const wordW = ctx.measureText(word).width;
                  const spaceW = ctx.measureText(' ').width;
                  const cleanToken = word.toLowerCase().replace(/[^a-zæøåäöü0-9-]/gi, '');
                  const isHi = cleanToken.length >= 3 && tokens.has(cleanToken);

                  ctx.save();
                  if (isHi) {
                    if (themeKey === 'brutalist') {
                      ctx.fillStyle = '#facc15';
                      ctx.fillRect(curX - 6, curY - fontSize * 0.84, wordW + 12, fontSize * 1.04);
                      ctx.fillStyle = '#000000';
                    } else if (themeKey === 'terminal') {
                      ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
                      roundRect(curX - 6, curY - fontSize * 0.82, wordW + 12, fontSize * 1.02, 8);
                      ctx.fill();
                      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
                      ctx.lineWidth = 1.5;
                      roundRect(curX - 6, curY - fontSize * 0.82, wordW + 12, fontSize * 1.02, 8);
                      ctx.stroke();
                      ctx.fillStyle = '#a7f3d0';
                    } else if (themeKey === 'nordic') {
                      ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
                      roundRect(curX - 5, curY - fontSize * 0.8, wordW + 10, fontSize * 0.98, 6);
                      ctx.fill();
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillRect(curX - 3, curY + 8, wordW + 6, 4);
                      ctx.fillStyle = '#fde68a';
                    } else {
                      ctx.fillStyle = t.accent + '2e';
                      roundRect(curX - 6, curY - fontSize * 0.82, wordW + 12, fontSize * 1.02, 10);
                      ctx.fill();
                      ctx.fillStyle = isLight ? t.accent : '#ffffff';
                    }
                  } else {
                    ctx.fillStyle = t.text;
                  }
                  ctx.fillText(word, curX, curY);
                  ctx.restore();

                  curX += wordW + spaceW;
                });

                curY += lineHeight;
              });

              return curY;
            }

            function drawKaraokeText(text: string, x: number, startY: number, maxWidth: number, lineHeight: number, progress = 1.0, fontSize = 40) {
              ctx.font = `600 ${fontSize}px ${t.fontBody}`;
              const allWords = (text || '').trim().split(/\s+/).filter(Boolean);
              const totalWords = allWords.length;
              // Active word index progresses across slide duration
              const activeWordIdx = Math.min(totalWords - 1, Math.floor(progress * totalWords * 1.15));

              const lines = wrapLines(text || '', maxWidth);
              let globalWordIdx = 0;
              let curY = startY;

              lines.forEach((line) => {
                const words = line.trim().split(/\s+/).filter(Boolean);
                let curX = x;
                words.forEach((word) => {
                  const wordW = ctx.measureText(word).width;
                  const spaceW = ctx.measureText(' ').width;

                  const isCurrent = globalWordIdx === activeWordIdx;
                  const isPast = globalWordIdx < activeWordIdx;

                  ctx.save();
                  if (isCurrent) {
                    // Kinetic Glowing Highlight Pill behind current word
                    ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : t.accent + '2d';
                    roundRect(curX - 6, curY - lineHeight * 0.72, wordW + 12, lineHeight * 0.9, themeKey === 'brutalist' ? 0 : 8);
                    ctx.fill();

                    ctx.fillStyle = themeKey === 'brutalist' ? '#000000' : t.accent;
                    if (themeKey !== 'brutalist' && !isLight) {
                      ctx.shadowColor = t.accent;
                      ctx.shadowBlur = 14;
                    }
                    ctx.fillText(word, curX, curY);
                  } else if (isPast) {
                    ctx.fillStyle = t.text;
                    ctx.fillText(word, curX, curY);
                  } else {
                    ctx.fillStyle = t.sub;
                    ctx.fillText(word, curX, curY);
                  }
                  ctx.restore();

                  curX += wordW + spaceW;
                  globalWordIdx++;
                });
                curY += lineHeight;
              });
              return curY;
            }

            // 1. Base Gradient Background with Breathing Ambient Glow + Archetype Texture
            const grad = ctx.createLinearGradient(0, 0, W, H);
            grad.addColorStop(0, t.bg1);
            grad.addColorStop(1, t.bg2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Archetype backdrop surface texture
            if (themeKey === 'terminal') {
              ctx.save();
              ctx.strokeStyle = 'rgba(52, 211, 153, 0.05)';
              ctx.lineWidth = 1;
              for (let gx = 0; gx < W; gx += 40) {
                ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
              }
              for (let gy = 0; gy < H; gy += 40) {
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
              }
              ctx.restore();
            } else if (themeKey === 'brutalist') {
              ctx.save();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
              for (let gx = 24; gx < W; gx += 32) {
                for (let gy = 24; gy < H; gy += 32) {
                  ctx.fillRect(gx, gy, 2, 2);
                }
              }
              ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
              ctx.font = `900 30px ${t.fontHead}`;
              ctx.fillText('+', 34, 52);
              ctx.fillText('+', W - 56, 52);
              ctx.fillText('+', 34, H - 30);
              ctx.fillText('+', W - 56, H - 30);
              ctx.restore();
            } else if (themeKey === 'nordic') {
              ctx.save();
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
              ctx.lineWidth = 1.5;
              roundRect(38, 38, W - 76, H - 76, 22);
              ctx.stroke();
              ctx.restore();
            }

            // Breathing ambient light aura
            const breath = Math.sin(slideProgress * Math.PI);
            const auraGrad = ctx.createRadialGradient(
              W * 0.75 + breath * 25, H * 0.25 - breath * 15, 40,
              W * 0.75, H * 0.25, 650
            );
            auraGrad.addColorStop(0, t.accent + (isLight ? '18' : '24'));
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(0, 0, W, H);

            const bgVid = (window as any).__bgVideo as HTMLVideoElement | undefined;
            const videoReady = !!(bgVid && bgVid.readyState >= 2);

            if (videoReady && st.screenrecordMode === 'backdrop' && layout === 'classic') {
              ctx.save();
              ctx.globalAlpha = 0.34;
              ctx.drawImage(bgVid!, 0, 0, W, H);
              ctx.fillStyle = isLight ? 'rgba(248, 250, 252, 0.72)' : 'rgba(9, 13, 22, 0.58)';
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
                stageGrad.addColorStop(1, isLight ? 'rgba(226, 232, 240, 0.85)' : 'rgba(9,13,22,0.65)');
                ctx.fillStyle = stageGrad;
                ctx.fillRect(0, 0, W, splitY);

                // Big visual metric or slide badge in center of top stage
                const heroText = slide.stat || `0${slideIdx + 1}`;
                ctx.fillStyle = t.accent;
                ctx.font = `900 130px ${t.fontHead}`;
                const hw = ctx.measureText(heroText).width;
                ctx.fillText(heroText, (W - hw) / 2, splitY * 0.62);
                if (slide.statLabel) {
                  ctx.fillStyle = t.text;
                  ctx.font = `bold 28px ${t.fontBody}`;
                  const lw = ctx.measureText(slide.statLabel.toUpperCase()).width;
                  ctx.fillText(slide.statLabel.toUpperCase(), (W - lw) / 2, splitY * 0.62 + 52);
                }
              }
              ctx.restore();

              // Bottom cinema panel
              const botGrad = ctx.createLinearGradient(0, splitY, 0, H);
              botGrad.addColorStop(0, t.bg1);
              botGrad.addColorStop(1, t.bg2);
              ctx.fillStyle = botGrad;
              ctx.fillRect(0, splitY, W, H - splitY);

              // Glowing accent divider line
              ctx.fillStyle = t.accent;
              ctx.fillRect(0, splitY - 3, W, themeKey === 'brutalist' ? 8 : 5);
            }

            // 2. Sleek Top Instagram Story Progress Bars
            if (!cleanExport) {
              const barGap = 12;
              const barH = 8;
              const barW = (W - padX * 2 - barGap * (total - 1)) / total;
              for (let i = 0; i < total; i++) {
                const bx = padX + i * (barW + barGap);
                ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.22)';
                roundRect(bx, 64, barW, barH, themeKey === 'brutalist' ? 0 : barH / 2);
                ctx.fill();
                if (i < slideIdx) {
                  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
                  roundRect(bx, 64, barW, barH, themeKey === 'brutalist' ? 0 : barH / 2);
                  ctx.fill();
                } else if (i === slideIdx) {
                  ctx.save();
                  ctx.fillStyle = t.accent;
                  if (!isLight) {
                    ctx.shadowColor = t.accent;
                    ctx.shadowBlur = 8;
                  }
                  roundRect(bx, 64, Math.max(barH, barW * slideProgress), barH, themeKey === 'brutalist' ? 0 : barH / 2);
                  ctx.fill();
                  ctx.restore();
                }
              }
            }

            // 3. Brand Header with Safe Zone for Social Media (Instagram / TikTok)
            const isPortrait = !isLandscape && !isSquare;
            const headerY = isPortrait ? (cleanExport ? 150 : 160) : (cleanExport ? 76 : 130);
            const logoImg = (window as any).__logoImg as HTMLImageElement | undefined;
            if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
              ctx.save();
              ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.12)';
              roundRect(padX, headerY, 92, 92, themeKey === 'brutalist' ? 0 : 24);
              ctx.fill();
              roundRect(padX, headerY, 92, 92, themeKey === 'brutalist' ? 0 : 24);
              ctx.clip();
              ctx.drawImage(logoImg, padX + 10, headerY + 10, 72, 72);
              ctx.restore();
            } else {
              const brandLower = (st.brand || '').toLowerCase();
              const handleLower = (st.handle || '').toLowerCase();
              const isTailprint = brandLower.includes('tailprint') || handleLower.includes('tailprint');

              ctx.save();
              ctx.fillStyle = isLight ? '#0f172a' : 'rgba(15, 23, 42, 0.92)';
              roundRect(padX, headerY, 92, 92, themeKey === 'brutalist' ? 0 : 24);
              ctx.fill();
              ctx.strokeStyle = t.accent + '88';
              ctx.lineWidth = themeKey === 'brutalist' ? 3 : 2.5;
              roundRect(padX, headerY, 92, 92, themeKey === 'brutalist' ? 0 : 24);
              ctx.stroke();

              if (isTailprint) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = t.accent;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(padX + 32, headerY + 34);
                ctx.lineTo(padX + 22, headerY + 46);
                ctx.lineTo(padX + 32, headerY + 58);
                ctx.stroke();
                ctx.strokeStyle = '#f472b6';
                ctx.lineWidth = 4.5;
                ctx.beginPath();
                ctx.moveTo(padX + 53, headerY + 28);
                ctx.lineTo(padX + 39, headerY + 64);
                ctx.stroke();
                ctx.strokeStyle = t.accent;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(padX + 60, headerY + 34);
                ctx.lineTo(padX + 70, headerY + 46);
                ctx.lineTo(padX + 60, headerY + 58);
                ctx.stroke();
              } else {
                const mono = (st.brand || 'TP').slice(0, 2).toUpperCase();
                ctx.fillStyle = t.accent;
                ctx.font = `900 38px ${t.fontHead}`;
                const mw = ctx.measureText(mono).width;
                ctx.fillText(mono, padX + (92 - mw) / 2, headerY + 58);
              }
              ctx.restore();
            }

            ctx.fillStyle = t.text;
            ctx.font = `bold 36px ${t.fontHead}`;
            ctx.fillText(st.brand || 'Brand', padX + 116, headerY + 42);

            ctx.fillStyle = t.sub;
            ctx.font = `500 25px ${t.fontBody}`;
            ctx.fillText(st.handle || '@insights', padX + 116, headerY + 78);

            const tagText = `${t.badgeIcon ? `${t.badgeIcon} ` : ''}${(slide.tag || `0${slideIdx + 1}`).toUpperCase()}`;
            ctx.font = `bold 23px ${t.fontBody}`;
            const tagW = ctx.measureText(tagText).width + 48;
            ctx.fillStyle = t.tagBg;
            roundRect(W - padX - tagW, headerY + 18, tagW, 54, themeKey === 'brutalist' ? 0 : 27);
            ctx.fill();
            if (themeKey === 'brutalist') {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              roundRect(W - padX - tagW, headerY + 18, tagW, 54, 0);
              ctx.stroke();
            }
            ctx.fillStyle = t.tagText;
            ctx.fillText(tagText, W - padX - tagW + 24, headerY + 53);

            // 4. Main Slide Body by Layout + Archetype + Slide Role
            const popScale = slideProgress < 0.12 ? 0.96 + (slideProgress / 0.12) * 0.04 : 1.0;
            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.scale(popScale, popScale);
            ctx.translate(-W / 2, -H / 2);

            if (layout === 'split') {
              // Bottom 57% panel content
              let curY = splitY + 95;
              const headFont = isSquare ? 50 : 62;
              const headLineH = isSquare ? 62 : 76;
              curY = drawHighlightedHeadline(slide.headline || '', padX, curY, W - padX * 2, headLineH, headFont);

              if (slide.stat && videoReady) {
                curY += 15;
                drawArchetypeCard(padX, curY, W - padX * 2, 134, false);
                ctx.fillStyle = t.accent;
                ctx.font = `900 68px ${t.fontHead}`;
                const sw = ctx.measureText(slide.stat).width;
                ctx.fillText(slide.stat, padX + 36, curY + 90);
                ctx.fillStyle = t.text;
                ctx.font = `bold 28px ${t.fontBody}`;
                ctx.fillText((slide.statLabel || '').toUpperCase(), padX + 36 + sw + 28, curY + 78);
                curY += 180;
              } else {
                curY += 32;
              }

              const bodyFont = isSquare ? 34 : 40;
              const bodyLineH = isSquare ? 50 : 60;
              drawKaraokeText(slide.body || '', padX, curY, W - padX * 2, bodyLineH, slideProgress, bodyFont);

            } else if (layout === 'iphone') {
              // Headline above 3D iPhone 16 Pro frame + Karaoke below
              let curY = headerY + 150;
              const headFont = isSquare ? 42 : 52;
              const headLineH = isSquare ? 52 : 64;
              curY = drawHighlightedHeadline(slide.headline || '', padX, curY, W - padX * 2, headLineH, headFont, true);

              const phoneW = isSquare ? 340 : 450;
              const phoneH = isSquare ? 430 : 750;
              const phoneX = (W - phoneW) / 2;
              const phoneY = curY + 14;

              // Outer titanium bezel
              ctx.save();
              ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : '#334155';
              roundRect(phoneX - 10, phoneY - 10, phoneW + 20, phoneH + 20, themeKey === 'brutalist' ? 18 : 66);
              ctx.fill();
              ctx.fillStyle = '#090d16';
              roundRect(phoneX, phoneY, phoneW, phoneH, themeKey === 'brutalist' ? 12 : 56);
              ctx.fill();

              // Clip inside iPhone screen
              roundRect(phoneX + 8, phoneY + 8, phoneW - 16, phoneH - 16, themeKey === 'brutalist' ? 8 : 48);
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
                ctx.font = `900 86px ${t.fontHead}`;
                const psw = ctx.measureText(pStat).width;
                ctx.fillText(pStat, phoneX + (phoneW - psw) / 2, phoneY + phoneH * 0.48);

                const pLbl = (slide.statLabel || st.brand || 'LIVE').toUpperCase();
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold 24px ${t.fontBody}`;
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
              const capSize = isSquare ? 30 : 38;
              drawKaraokeText(slide.body || '', padX, capY, W - padX * 2, isSquare ? 44 : 54, slideProgress, capSize);

            } else if (layout === 'editorial') {
              // Giant background watermark stat/number + editorial framing + vertical accent bar
              const watermark = slide.stat || `0${slideIdx + 1}`;
              ctx.save();
              ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.055)' : 'rgba(255, 255, 255, 0.055)';
              ctx.font = `900 280px ${t.fontHead}`;
              ctx.fillText(watermark, padX - 20, H * 0.44);
              ctx.restore();

              const editX = padX + 44;
              const editW = W - editX - padX;
              let curY = isSquare ? 280 : (isLandscape ? 280 : 440);

              if (themeKey === 'nordic') {
                ctx.save();
                ctx.fillStyle = t.accent;
                ctx.font = `italic 600 26px ${t.fontHead}`;
                const chap = `kap. 0${slideIdx + 1}`;
                const cw = ctx.measureText(chap).width;
                ctx.fillText(chap, editX, curY - 72);
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(editX + cw + 20, curY - 80);
                ctx.lineTo(W - padX, curY - 80);
                ctx.stroke();
                ctx.restore();
              } else {
                ctx.fillStyle = t.accent;
                ctx.font = `900 110px ${t.fontHead}`;
                ctx.fillText('“', editX - 8, curY - 28);
              }

              const headFont = isSquare ? 52 : (isLandscape ? 58 : 70);
              const headLineH = isSquare ? 64 : (isLandscape ? 70 : 84);
              const barStartY = curY - headFont;
              curY = drawHighlightedHeadline(slide.headline || '', editX, curY, editW, headLineH, headFont);

              if (slide.stat) {
                curY += 20;
                drawArchetypeCard(editX, curY, editW, 134, false);
                ctx.fillStyle = t.accent;
                ctx.font = `900 78px ${t.fontHead}`;
                const sw = ctx.measureText(slide.stat).width;
                ctx.fillText(slide.stat, editX + 28, curY + 90);
                ctx.fillStyle = t.text;
                ctx.font = `bold 28px ${t.fontBody}`;
                ctx.fillText((slide.statLabel || '').toUpperCase(), editX + 28 + sw + 24, curY + 78);
                curY += 170;
              } else {
                curY += 32;
              }

              const bodyFont = isSquare ? 34 : 42;
              const bodyLineH = isSquare ? 50 : 62;
              const endY = drawKaraokeText(slide.body || '', editX, curY, editW, bodyLineH, slideProgress, bodyFont);

              if (slideType === 'cta') {
                const btnY = Math.min(H - 360, endY + 26);
                const btnW = Math.min(editW, 560);
                ctx.save();
                ctx.fillStyle = t.accent;
                roundRect(editX, btnY, btnW, 88, themeKey === 'brutalist' ? 0 : 24);
                ctx.fill();
                ctx.fillStyle = themeKey === 'brutalist' || themeKey === 'nordic' || themeKey === 'terminal' ? '#090d16' : '#ffffff';
                ctx.font = `900 30px ${t.fontHead}`;
                ctx.fillText(`${st.cta || 'Start'}  →`, editX + 34, btnY + 55);
                ctx.restore();
              }

              // Left vertical accent bar
              ctx.fillStyle = t.accent;
              roundRect(padX, barStartY, themeKey === 'brutalist' ? 16 : 10, Math.max(180, endY - barStartY - 10), themeKey === 'brutalist' ? 0 : 6);
              ctx.fill();

            } else {
              // 'classic' layout with archetype card framing + per-slideType choreography
              const hasInsetVideo = videoReady && st.screenrecordMode === 'inset' && !isLandscape;
              let curY = hasInsetVideo ? headerY + 150 : (isSquare ? 280 : (isLandscape ? 260 : (cleanExport ? 370 : 410)));
              const headFont = hasInsetVideo ? 52 : (isSquare ? 52 : 68);
              const headLineH = hasInsetVideo ? 64 : (isSquare ? 64 : 82);
              const innerPad = (themeKey === 'terminal' || themeKey === 'brutalist' || slideType === 'problem') && !hasInsetVideo ? 38 : 0;

              if ((themeKey === 'terminal' || themeKey === 'brutalist' || slideType === 'problem') && !hasInsetVideo) {
                const topOffset = themeKey === 'terminal' ? 76 : 36;
                const boxY = curY - headFont - topOffset;
                const boxH = isSquare ? 480 : isLandscape ? 430 : (slideType === 'stat' ? 740 : 620);
                drawArchetypeCard(padX, boxY, W - padX * 2, boxH, themeKey === 'terminal');
                curY = boxY + topOffset + headFont;
              }

              const contentX = padX + innerPad;
              const contentW = W - (padX + innerPad) * 2;
              curY = drawHighlightedHeadline(slide.headline || '', contentX, curY, contentW, headLineH, headFont, slideType === 'cta' && !hasInsetVideo);

              if (hasInsetVideo) {
                curY += 12;
                const winW = W - padX * 2;
                const winH = isSquare ? 250 : 400;
                const winX = padX;
                const winY = curY;

                ctx.save();
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                roundRect(winX, winY, winW, winH, themeKey === 'brutalist' ? 0 : 26);
                ctx.fill();
                ctx.strokeStyle = t.accent + '66';
                ctx.lineWidth = themeKey === 'brutalist' ? 4 : 2;
                roundRect(winX, winY, winW, winH, themeKey === 'brutalist' ? 0 : 26);
                ctx.stroke();

                roundRect(winX, winY, winW, winH, themeKey === 'brutalist' ? 0 : 26);
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

                const vW = (bgVid as any).videoWidth || 720;
                const vH = (bgVid as any).videoHeight || 1280;
                const contentH = winH - 44;
                const vScale = Math.max(winW / vW, contentH / vH);
                const sW = winW / vScale;
                const sH = contentH / vScale;
                const sx = (vW - sW) / 2;
                const sy = Math.max(0, Math.min(vH - sH, (vH - sH) * 0.15));

                ctx.drawImage(bgVid!, sx, sy, sW, sH, winX, winY + 44, winW, contentH);
                ctx.restore();

                curY += winH + 42;
              }

              if (slide.stat) {
                curY += 16;
                const statBoxH = hasInsetVideo ? 124 : 160;
                drawArchetypeCard(contentX, curY, contentW, statBoxH, false);

                ctx.fillStyle = t.accent;
                ctx.font = `900 ${hasInsetVideo ? 64 : 80}px ${t.fontHead}`;
                const statW = ctx.measureText(slide.stat).width;
                ctx.fillText(slide.stat, contentX + 36, curY + (hasInsetVideo ? 86 : 108));

                ctx.fillStyle = t.text;
                ctx.font = `bold 28px ${t.fontBody}`;
                ctx.fillText((slide.statLabel || 'METRIC').toUpperCase(), contentX + 36 + statW + 28, curY + (hasInsetVideo ? 76 : 96));

                curY += statBoxH + 42;
              } else {
                curY += 28;
              }

              const bodyFont = hasInsetVideo ? 36 : (isSquare ? 34 : 44);
              const bodyLineH = hasInsetVideo ? 52 : (isSquare ? 50 : 64);
              const bodyText = themeKey === 'terminal' ? `> ${slide.body || ''}` : (slide.body || '');
              const endY = drawKaraokeText(bodyText, contentX, curY, contentW, bodyLineH, slideProgress, bodyFont);

              if (slideType === 'cta' && !hasInsetVideo) {
                const btnY = Math.min(H - 360, endY + 34);
                const btnW = Math.min(contentW, 600);
                const btnX = padX + (W - padX * 2 - btnW) / 2;
                ctx.save();
                ctx.fillStyle = t.accent;
                roundRect(btnX, btnY, btnW, 92, themeKey === 'brutalist' ? 0 : 28);
                ctx.fill();
                ctx.fillStyle = themeKey === 'brutalist' || themeKey === 'nordic' || themeKey === 'terminal' ? '#090d16' : '#ffffff';
                ctx.font = `900 32px ${t.fontHead}`;
                const ctaLabel = `${st.cta || 'Learn more'}  →`;
                const cw = ctx.measureText(ctaLabel).width;
                ctx.fillText(ctaLabel, btnX + (btnW - cw) / 2, btnY + 58);
                ctx.restore();
              }
            }

            ctx.restore();

            // 5. Footer CTA with Instagram & TikTok Safe Zone Protection (Min 240px from bottom)
            const footerY = isPortrait ? (H - 240) : (isLandscape ? H - 85 : H - 115);
            const pulse = 0.85 + 0.15 * Math.sin(slideProgress * Math.PI * 6);

            if (!cleanExport) {
              ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.12)';
              ctx.fillRect(padX, footerY - 52, W - padX * 2, 2);

              ctx.save();
              ctx.fillStyle = '#10b981';
              if (!isLight) {
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 12 * pulse;
              }
              ctx.beginPath();
              ctx.arc(padX + 14, footerY - 12, 10 * pulse, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              ctx.fillStyle = t.text;
              ctx.font = `bold 30px ${t.fontBody}`;
              ctx.fillText(st.cta || 'Learn more', padX + 42, footerY);

              ctx.fillStyle = t.sub;
              ctx.font = `bold 28px ${t.fontBody}`;
              const slideCountText = `${slideIdx + 1} / ${total}`;
              const scW = ctx.measureText(slideCountText).width;
              ctx.fillText(slideCountText, W - padX - scW, footerY);
            } else {
              ctx.save();
              ctx.font = `bold 28px ${t.fontBody}`;
              const ctaText = st.cta || 'Follow for more • Link in bio';
              const pillW = Math.min(W - padX * 2, ctx.measureText(ctaText).width + 84);
              const pillR = themeKey === 'brutalist' ? 0 : 30;
              ctx.fillStyle = themeKey === 'brutalist' ? '#facc15' : isLight ? '#0f172a' : 'rgba(255, 255, 255, 0.09)';
              roundRect(padX, footerY - 42, pillW, 60, pillR);
              ctx.fill();
              ctx.strokeStyle = themeKey === 'brutalist' ? '#ffffff' : isLight ? '#0f172a' : 'rgba(255, 255, 255, 0.18)';
              ctx.lineWidth = themeKey === 'brutalist' ? 3 : 1.5;
              roundRect(padX, footerY - 42, pillW, 60, pillR);
              ctx.stroke();

              ctx.fillStyle = themeKey === 'brutalist' ? '#000000' : '#10b981';
              if (!isLight && themeKey !== 'brutalist') {
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 12 * pulse;
              }
              ctx.beginPath();
              ctx.arc(padX + 28, footerY - 12, 9 * pulse, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = themeKey === 'brutalist' ? '#000000' : '#ffffff';
              ctx.fillText(ctaText, padX + 52, footerY - 1);
              ctx.restore();
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
              async ({ idx, prog, total }) => {
                const bgVid = (window as any).__bgVideo as HTMLVideoElement | undefined;
                if (bgVid && bgVid.readyState >= 1 && Number.isFinite(bgVid.duration) && bgVid.duration > 0) {
                  bgVid.pause();
                  const targetFrac = 0.12 + ((idx + prog * 0.9) / Math.max(1, total)) * 0.86;
                  const targetTime = Math.min(bgVid.duration - 0.05, Math.max(0, bgVid.duration * targetFrac));
                  if (Math.abs(bgVid.currentTime - targetTime) > 0.04) {
                    await new Promise<void>((res) => {
                      const onSeek = () => {
                        bgVid.removeEventListener('seeked', onSeek);
                        res();
                      };
                      bgVid.addEventListener('seeked', onSeek);
                      bgVid.currentTime = targetTime;
                      setTimeout(() => {
                        bgVid.removeEventListener('seeked', onSeek);
                        res();
                      }, 35);
                    });
                  }
                }
                return (window as any).__renderFrame(idx, prog);
              },
              { idx: sIdx, prog: progress, total: slides.length }
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
      }, { width: dim.outW, height: dim.outH }, false, taskTimeoutMs);

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
