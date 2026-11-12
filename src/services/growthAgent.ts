import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { scraperService } from './scraper.js';
import { emailService } from './email.js';
import { carouselService } from './carousel.js';
import { TEMPLATES } from '../config/templates.js';

export interface GrowthLead {
  id: string;
  domain: string;
  companyName: string;
  category: 'saas' | 'agency' | 'ecommerce' | 'erp' | 'legal' | 'fintech';
  description?: string;
  websiteUrl: string;
  contactEmail?: string;
  contactName?: string;
  logoUrl?: string;
  primaryColor?: string;
  customDemoPdfUrl?: string;
  customDemoFileId?: string;
  emailSubject?: string;
  emailBodyHtml?: string;
  pitchAngle?: string;
  status: 'discovered' | 'demo_generated' | 'queued' | 'sent' | 'viewed' | 'failed';
  discoveredAt: string;
  demoGeneratedAt?: string;
  sentAt?: string;
  viewCount: number;
  lastError?: string;
}

export interface GrowthContentItem {
  id: string;
  title: string;
  topic: string;
  format: 'linkedin_carousel' | 'twitter_thread' | 'show_hn';
  contentMarkdown: string;
  pdfUrl?: string;
  previewImageUrl?: string;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface GrowthSocialOpportunity {
  id: string;
  platform: 'reddit' | 'hackernews' | 'stackoverflow' | 'devto';
  title: string;
  url: string;
  author: string;
  queryMatched: string;
  snippet: string;
  detectedAt: string;
  suggestedReplyMarkdown: string;
  status: 'pending' | 'posted' | 'dismissed';
  postedAt?: string;
}

export interface GrowthSettings {
  autoDispatchEnabled: boolean;
  maxDailyEmails: number;
  lastRunAt?: string;
  lastCarouselAt?: string;
}

export class GrowthAgentService {
  private static instance: GrowthAgentService | null = null;
  private leadsFile: string;
  private contentFile: string;
  private settingsFile: string;
  private socialFile: string;
  private isCycleRunning = false;

  private constructor() {
    const storageDir = path.isAbsolute(env.STORAGE_PATH)
      ? env.STORAGE_PATH
      : path.join(process.cwd(), env.STORAGE_PATH);

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    this.leadsFile = path.join(storageDir, 'growth_leads.json');
    this.contentFile = path.join(storageDir, 'growth_content.json');
    this.settingsFile = path.join(storageDir, 'growth_settings.json');
    this.socialFile = path.join(storageDir, 'growth_social.json');

    this.initDefaultSeedLeads();
    this.initDefaultSeedSocial();
  }

  public static getInstance(): GrowthAgentService {
    if (!GrowthAgentService.instance) {
      GrowthAgentService.instance = new GrowthAgentService();
    }
    return GrowthAgentService.instance;
  }

  private loadLeads(): GrowthLead[] {
    try {
      if (fs.existsSync(this.leadsFile)) {
        const raw: GrowthLead[] = JSON.parse(fs.readFileSync(this.leadsFile, 'utf-8'));
        return raw.map((l) => ({
          ...l,
          customDemoPdfUrl: l.customDemoPdfUrl?.replace(/^https?:\/\/localhost:\d+/i, 'https://tailprint.com'),
        }));
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading leads file:', err);
    }
    return [];
  }

  private saveLeads(leads: GrowthLead[]): void {
    try {
      fs.writeFileSync(this.leadsFile, JSON.stringify(leads, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving leads:', err);
    }
  }

  private loadContent(): GrowthContentItem[] {
    try {
      if (fs.existsSync(this.contentFile)) {
        const raw: GrowthContentItem[] = JSON.parse(fs.readFileSync(this.contentFile, 'utf-8'));
        return raw.map((c) => ({
          ...c,
          pdfUrl: c.pdfUrl?.replace(/^https?:\/\/localhost:\d+/i, 'https://tailprint.com'),
          previewImageUrl: c.previewImageUrl?.replace(/^https?:\/\/localhost:\d+/i, 'https://tailprint.com'),
        }));
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading content file:', err);
    }
    return [];
  }

  private saveContent(items: GrowthContentItem[]): void {
    try {
      fs.writeFileSync(this.contentFile, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving content:', err);
    }
  }

  private loadSettings(): GrowthSettings {
    const defaults: GrowthSettings = {
      autoDispatchEnabled: false,
      maxDailyEmails: 5,
    };
    try {
      if (fs.existsSync(this.settingsFile)) {
        return { ...defaults, ...JSON.parse(fs.readFileSync(this.settingsFile, 'utf-8')) };
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading settings:', err);
    }
    return defaults;
  }

  private saveSettings(settings: GrowthSettings): void {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving settings:', err);
    }
  }

  private loadSocial(): GrowthSocialOpportunity[] {
    try {
      if (fs.existsSync(this.socialFile)) {
        return JSON.parse(fs.readFileSync(this.socialFile, 'utf-8'));
      }
    } catch (err) {
      console.warn('[GrowthAgent] Error reading social file:', err);
    }
    return [];
  }

  private saveSocial(items: GrowthSocialOpportunity[]): void {
    try {
      fs.writeFileSync(this.socialFile, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GrowthAgent] Error saving social:', err);
    }
  }

  private initDefaultSeedSocial(): void {
    const existing = this.loadSocial();
    // Clean out any legacy seed or dummy URLs
    const filtered = existing.filter((s) => !s.url.includes('1i3b81x') && !s.url.includes('deleted_by_user'));
    if (filtered.length !== existing.length) {
      this.saveSocial(filtered);
    }
    if (filtered.length > 0) return;

    const seedOpportunities: GrowthSocialOpportunity[] = [
      {
        id: `soc_${crypto.randomBytes(6).toString('hex')}`,
        platform: 'reddit',
        title: 'What is the approach that you may take to generate PDFs?',
        url: 'https://www.reddit.com/r/webdev/comments/1l7ug9b/what_is_the_approach_that_you_may_take_to/',
        author: 'u/webdev_builder',
        queryMatched: 'pdf generation',
        snippet: 'When generating complex documents, invoices or dynamic dashboards, what architecture works best? Headless Chrome vs serverless microservices vs dedicated rendering APIs?',
        detectedAt: new Date().toISOString(),
        suggestedReplyMarkdown: `Honestly, been down this rabbit hole and it usually comes down to document complexity.

If you just need a quick download button on a client app and don't care if margins look a little off, \`window.print()\` or html2pdf gets you by. But the second you need actual branded invoices or multi-page reports, client-side solutions fall apart fast.

If you run raw Puppeteer yourself in serverless (Lambda/Vercel), watch out for memory: Lambda only gives you 64MB of shared memory by default, so Chromium will randomly crash with OOM under load unless you pass \`--disable-dev-shm-usage\`. You also have to handle zombie browser processes when functions timeout.

For tables splitting across pages, make sure you set \`break-inside: avoid\` on rows and ensure parent containers aren't \`display: flex\`, otherwise Chromium ignores page break rules completely.

I actually ended up building [Tailprint](https://tailprint.com) after getting burned by these exact headless Chrome crashes in production. You can test your HTML directly in our free studio (tailprint.com/studio) if you want to inspect how Chromium splits your layout without maintaining your own browser pool.`,
        status: 'pending',
      },
      {
        id: `soc_${crypto.randomBytes(6).toString('hex')}`,
        platform: 'reddit',
        title: 'Generate PDF of fully rendered page',
        url: 'https://www.reddit.com/r/webdev/comments/1ma5hs7/generate_pdf_of_fully_rendered_page/',
        author: 'u/frontend_lead',
        queryMatched: 'html to pdf',
        snippet: 'Need to capture full client-rendered web pages with modern Tailwind CSS styles and charts into high-resolution vector PDF.',
        detectedAt: new Date().toISOString(),
        suggestedReplyMarkdown: `Ran into this exact issue when trying to render Tailwind pages into clean vector PDFs.

Two things will save you a ton of headache:

First, Tailwind styles are written for screen by default, but Puppeteer defaults to print media stylesheets (which often strips background colors, gradients, and collapses flex layouts). You have to explicitly force screen emulation by calling \`page.emulateMediaType('screen')\`.

Second, web fonts are the biggest source of flaky PDF renders. If you call \`page.pdf()\` immediately after \`load\`, Chromium will often rasterize fallback system fonts before Google Fonts finish downloading. Waiting for \`document.fonts.ready\` right before rendering solves that completely.

I built [Tailprint](https://tailprint.com) to automate all this headless Chrome plumbing (font caching, smart pagination, fast rendering). Feel free to paste your raw Tailwind HTML into tailprint.com/studio to see how the vector output looks.`,
        status: 'pending',
      },
      {
        id: `soc_${crypto.randomBytes(6).toString('hex')}`,
        platform: 'hackernews',
        title: 'Show HN: Pixel-exact HTML-to-PDF in the browser, no Puppeteer or server',
        url: 'https://news.ycombinator.com/item?id=49982189',
        author: 'silly-tae',
        queryMatched: 'puppeteer pdf',
        snippet: 'Interesting discussion on the trade-offs of in-browser WASM rendering versus server-side headless Chrome clusters for PDF generation.',
        detectedAt: new Date().toISOString(),
        suggestedReplyMarkdown: `This is really slick! Client-side in-browser WASM rendering is awesome for offline apps and zero-server setups.

The wall I ran into when relying solely on browser rendering in production was background batch jobs — things like generating 10,000 monthly invoices at 2 AM or sending PDF receipt attachments via webhooks where no client browser is open.

Also, EU e-invoicing mandates (like Factur-X / EN 16931) require embedding machine-readable XML directly into the PDF/A-3 metadata stream, which requires low-level PDF dictionary manipulation that canvas/WASM engines don't easily do yet.

That's actually what led me to build [Tailprint](https://tailprint.com) on a headless Chromium backend. Really cool to see how fast in-browser rendering is getting though!`,
        status: 'pending',
      },
      {
        id: `soc_${crypto.randomBytes(6).toString('hex')}`,
        platform: 'stackoverflow',
        title: 'What is the default CSS stylesheet PhantomJS uses when rendering PDF/HTML, and how to replicate it in Puppeteer?',
        url: 'https://stackoverflow.com/questions/79958790/what-is-the-default-css-stylesheet-phantomjs-uses-when-rendering-pdf-html-and-h',
        author: 'WebKitMigrator',
        queryMatched: 'puppeteer pdf',
        snippet: 'Migrating legacy PhantomJS scripts to modern Puppeteer. Noticed font kerning and default margins differ significantly between WebKit and modern Blink rendering.',
        detectedAt: new Date().toISOString(),
        suggestedReplyMarkdown: `Migrating from PhantomJS to Chromium caught us off guard with this exact quirk a while back. PhantomJS was built on an ancient QtWebKit fork that had completely different default user-agent margins and font antialiasing compared to modern Chromium.

The two main gotchas that usually cause visual divergence when moving to Puppeteer:

1. **Media emulation:** Puppeteer defaults to print stylesheet emulation, which strips CSS backgrounds and collapses flexbox containers if your styles are written for screen. Calling \`page.emulateMediaType('screen')\` before rendering is usually the biggest fix.
2. **Font smoothing & box reset:** WebKit forced antialiased fonts by default. In Chromium you need explicit \`-webkit-font-smoothing: antialiased\` and a zeroed \`@page\` margin, otherwise Chromium injects its own 0.4-inch default printable margins.

*(Full disclosure: I'm the founder of [Tailprint](https://tailprint.com). We hit these exact WebKit vs Blink styling quirks when building our rendering engine — you're welcome to paste your HTML into our free studio at tailprint.com/studio to see how modern Chromium rasterizes your layout).* `,
        status: 'pending',
      },
    ];

    this.saveSocial(seedOpportunities);
  }

  private initDefaultSeedLeads(): void {
    const existing = this.loadLeads();
    if (existing.length > 0) return;

    // High-value seed B2B targets across SaaS, ERP, agencies & billing
    const seedTargets: Array<Omit<GrowthLead, 'id' | 'discoveredAt' | 'viewCount'>> = [
      {
        domain: 'twenty.com',
        companyName: 'Twenty CRM',
        category: 'saas',
        websiteUrl: 'https://twenty.com',
        description: 'Modern open-source CRM platform needing automated customer proposal & contract generation.',
        status: 'discovered',
      },
      {
        domain: 'cal.com',
        companyName: 'Cal.com',
        category: 'saas',
        websiteUrl: 'https://cal.com',
        description: 'Open scheduling infrastructure generating booking receipts, invoices, and enterprise agreements.',
        status: 'discovered',
      },
      {
        domain: 'formbricks.com',
        companyName: 'Formbricks',
        category: 'saas',
        websiteUrl: 'https://formbricks.com',
        description: 'Experience management and survey platform needing automated executive survey reports & summaries.',
        status: 'discovered',
      },
      {
        domain: 'pebl.io',
        companyName: 'Pebl',
        category: 'fintech',
        websiteUrl: 'https://pebl.io',
        description: 'B2B payment and invoicing platform subject to 2026 EU e-invoicing & Factur-X requirements.',
        status: 'discovered',
      },
      {
        domain: 'nordicdigital.dk',
        companyName: 'Nordic Digital Agency',
        category: 'agency',
        websiteUrl: 'https://nordicdigital.dk',
        description: 'Full-service enterprise web agency issuing proposals, NDAs, and monthly retainer statements.',
        status: 'discovered',
      },
    ];

    const leads: GrowthLead[] = seedTargets.map((s) => ({
      ...s,
      id: `lead_${crypto.randomBytes(6).toString('hex')}`,
      discoveredAt: new Date().toISOString(),
      viewCount: 0,
    }));

    this.saveLeads(leads);
  }

  public getDashboardSnapshot() {
    const leads = this.loadLeads();
    const content = this.loadContent();
    const settings = this.loadSettings();
    const social = this.loadSocial();

    const stats = {
      totalLeads: leads.length,
      demosGenerated: leads.filter((l) => l.status === 'demo_generated' || l.status === 'sent' || l.status === 'viewed').length,
      queuedEmails: leads.filter((l) => l.status === 'queued' || l.status === 'demo_generated').length,
      sentEmails: leads.filter((l) => l.status === 'sent' || l.status === 'viewed').length,
      totalDemoViews: leads.reduce((acc, l) => acc + (l.viewCount || 0), 0),
      publishedPosts: content.length,
      pendingSocial: social.filter((s) => s.status === 'pending').length,
      postedSocial: social.filter((s) => s.status === 'posted').length,
    };

    return {
      stats,
      leads,
      content,
      social,
      settings,
    };
  }

  public updateSocialStatus(id: string, status: 'pending' | 'posted' | 'dismissed'): GrowthSocialOpportunity {
    const social = this.loadSocial();
    const item = social.find((s) => s.id === id);
    if (!item) throw new Error(`Social opportunity ${id} not found`);

    item.status = status;
    if (status === 'posted') {
      item.postedAt = new Date().toISOString();
    } else if (status === 'pending') {
      delete item.postedAt;
    }
    this.saveSocial(social);
    return item;
  }

  public async evaluateAndSynthesizeReply(
    title: string,
    content: string,
    platform: string
  ): Promise<{ isRelevant: boolean; userProblem: string; replyMarkdown: string; reason?: string }> {
    const geminiKey = env.GEMINI_API_KEY;

    // Hard exclusion of known recurring general threads
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.includes('what are you working on') ||
      lowerTitle.includes('who is hiring') ||
      lowerTitle.includes('who wants to be hired') ||
      lowerTitle.includes('freelancer? seeking freelancer') ||
      lowerTitle.includes('[deleted]') ||
      lowerTitle.includes('[dead]')
    ) {
      return {
        isRelevant: false,
        userProblem: '',
        replyMarkdown: '',
        reason: 'General recurring thread or deleted',
      };
    }

    if (!geminiKey) {
      return {
        isRelevant: true,
        userProblem: title,
        replyMarkdown: 'Relevant technical discussion on document and PDF generation.',
      };
    }

    const evaluationPrompt = `You are a strict technical evaluator for Tailprint (tailprint.com), a modern developer API for PDF generation, HTML rendering, and EU e-invoicing.
A post was detected on ${platform}:
Title: "${title}"
Post Content / Discussion Snippet:
"""
${content.slice(0, 3000)}
"""

TASK:
1. Determine if this post is a GENUINE developer question, problem, or technical discussion specifically about:
   - PDF generation, rendering, or printing from HTML/CSS
   - Headless browser infrastructure (Puppeteer, Playwright, Chromium memory/OOM)
   - Dynamic document export (invoices, receipts, quotes, reports)
   - CSS Paged Media, page breaks, or layout issues in multi-page documents
   - EU E-Invoicing mandates (Factur-X / ZUGFeRD)

REJECT (isRelevant: false):
- Generic Ask HN threads (e.g. "What are you working on?", "Who wants to be hired?")
- General business stories, job search platforms, cleaning services, personal life stories, or non-technical posts
- Posts where "pdf" or "print" is only mentioned in passing or in a footnote link
- Threads where someone asks something completely unrelated (e.g. Google Ads, SEO, UI design)

2. If isRelevant is true:
Write an authentic, relaxed, and deeply practical developer reply from Sebastian Viste (an indie developer and founder who built Tailprint).

CRITICAL STYLE GUIDELINES (MUST SOUND 100% HUMAN, NOT AN AI/CHATGPT BOT):
- Talk like a real developer on Reddit, Hacker News, or StackOverflow: casual, direct, humble, and speaking from real production battle scars.
- BANNED CLICHÉS: NEVER use robotic phrases like "In modern Chromium...", "From architecting high-scale...", "There are essentially two steps:", "Fascinating approach!", "I ran into this exact headache when architecting...".
- NO HEAVY CODE DUMPS: Do NOT dump blocks of raw code or full multi-line CSS/JS stylesheets. It looks bot-generated and triggers code-formatting warnings on forums. Instead, explain the fix conversationally in natural prose, referencing specific flags or CSS properties with short inline backticks (e.g. \`break-inside: avoid\`, \`page.emulateMediaType('screen')\`, \`--disable-dev-shm-usage\`).
- Start immediately with the practical reality (e.g., "Ran into this exact migration headache a while back...", "The gotcha that usually catches people here is...", "Been down this rabbit hole — it usually comes down to...").
- Use natural conversational phrasing, short punchy paragraphs, and contractions ("don't", "you'll", "it's", "honestly").
- MANDATORY REQUIREMENT: Always include a natural, transparent mention of Tailprint (https://tailprint.com) at the end:
  * For StackOverflow: End with transparent founder disclosure:
    "*(Full disclosure: I'm the founder of [Tailprint](https://tailprint.com), a headless rendering API. We went through these exact quirks when building our Chromium pipeline, and you can test your HTML/CSS directly in our free studio at tailprint.com/studio).* "
  * For Reddit / Hacker News: Keep it humble and conversational:
    "I actually ended up building [Tailprint](https://tailprint.com) after dealing with these headless Chrome crashes and pagination bugs for months. Feel free to throw your HTML into our free studio (tailprint.com/studio) to inspect the page break splits, or ping me if you get stuck on the Puppeteer pool config."

Respond ONLY in valid JSON:
{
  "isRelevant": boolean,
  "userProblem": "Summary of their specific technical issue",
  "reason": "Why this was accepted or rejected",
  "replyMarkdown": "The full formatted reply ready to post"
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: evaluationPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          let replyMarkdown = parsed.replyMarkdown || '';
          // Programmatic Guarantee: Always include Tailprint reference & link
          if (replyMarkdown && !replyMarkdown.toLowerCase().includes('tailprint')) {
            if (platform.toLowerCase().includes('stackoverflow')) {
              replyMarkdown += `\n\n*(Full disclosure: I'm the founder of [Tailprint](https://tailprint.com), a headless rendering API. We went through this exact migration headache when building our Chromium pipeline, and you can test your HTML/CSS directly in our free playground at tailprint.com/studio).*`;
            } else {
              replyMarkdown += `\n\nI actually ended up building [Tailprint](https://tailprint.com) after dealing with these headless Chrome crashes and pagination bugs for months. Feel free to throw your HTML into our free studio (tailprint.com/studio) to inspect the page break splits visually.`;
            }
          }
          return {
            isRelevant: Boolean(parsed.isRelevant),
            userProblem: parsed.userProblem || '',
            replyMarkdown,
            reason: parsed.reason,
          };
        }
      }
    } catch (err) {
      console.warn('[GrowthAgent] Relevance evaluation warning:', err);
    }

    return {
      isRelevant: false,
      userProblem: '',
      replyMarkdown: '',
      reason: 'Evaluation failed or timed out',
    };
  }

  public async scanCommunityRadar(): Promise<{ newOpportunities: number; totalScanned: number }> {
    const existing = this.loadSocial();
    const existingUrls = new Set(existing.map((s) => s.url));
    let newCount = 0;
    let scannedCount = 0;

    // 1. Hacker News via Algolia
    const sixtyDaysAgo = Math.floor(Date.now() / 1000) - (60 * 24 * 3600);
    const hnQueries = ['puppeteer pdf', 'html to pdf', 'factur-x'];
    for (const q of hnQueries) {
      try {
        const res = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=(story,comment)&query=${encodeURIComponent(q)}&numericFilters=created_at_i>${sixtyDaysAgo}&hitsPerPage=8`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data: any = await res.json();
          for (const hit of (data.hits || [])) {
            scannedCount++;
            const hitTitle = hit.story_title || hit.title || hit.comment_text?.slice(0, 80) || 'Hacker News Discussion';
            const lowerTitle = hitTitle.toLowerCase();
            if (
              lowerTitle.includes('what are you working on') ||
              lowerTitle.includes('who is hiring') ||
              lowerTitle.includes('who wants to be hired') ||
              lowerTitle.includes('freelancer')
            ) {
              continue;
            }

            const rawContent = (hit.comment_text || hit.story_text || hitTitle).replace(/<[^>]+>/g, '');
            if (rawContent.includes('[deleted]') || rawContent.length < 25) continue;

            // Run Semantic AI Relevance Gate
            const evalResult = await this.evaluateAndSynthesizeReply(hitTitle, rawContent, 'Hacker News');
            if (!evalResult.isRelevant || !evalResult.replyMarkdown) {
              console.log(`[GrowthAgent] Skipping off-topic HN thread: "${hitTitle}"`);
              continue;
            }

            // Always link to the specific comment or story item
            const hnId = hit.type === 'comment' ? hit.objectID : (hit.story_id || hit.objectID);
            const hitUrl = `https://news.ycombinator.com/item?id=${hnId}`;
            if (existingUrls.has(hitUrl)) continue;

            const opp: GrowthSocialOpportunity = {
              id: `soc_${crypto.randomBytes(6).toString('hex')}`,
              platform: 'hackernews',
              title: hitTitle,
              url: hitUrl,
              author: hit.author || 'HN User',
              queryMatched: q,
              snippet: evalResult.userProblem || rawContent.slice(0, 250),
              detectedAt: new Date().toISOString(),
              suggestedReplyMarkdown: evalResult.replyMarkdown,
              status: 'pending',
            };

            existing.unshift(opp);
            existingUrls.add(hitUrl);
            newCount++;
            if (newCount >= 3) break;
          }
        }
      } catch (err) {
        console.warn(`[GrowthAgent] HN scan error for ${q}:`, err);
      }
      if (newCount >= 3) break;
    }

    // 2. StackOverflow via StackExchange API (Active, open questions with full body)
    if (newCount < 3) {
      try {
        const res = await fetch(
          'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity&closed=False&q=puppeteer%20pdf&filter=withbody&site=stackoverflow',
          { signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data: any = await res.json();
          for (const item of (data.items || []).slice(0, 5)) {
            scannedCount++;
            if (!item.link || item.closed_date || existingUrls.has(item.link)) continue;

            const rawBody = (item.body || item.title || '').replace(/<[^>]+>/g, '');
            const evalResult = await this.evaluateAndSynthesizeReply(item.title, rawBody, 'StackOverflow');
            if (!evalResult.isRelevant || !evalResult.replyMarkdown) {
              console.log(`[GrowthAgent] Skipping off-topic SO question: "${item.title}"`);
              continue;
            }

            const opp: GrowthSocialOpportunity = {
              id: `soc_${crypto.randomBytes(6).toString('hex')}`,
              platform: 'stackoverflow',
              title: item.title,
              url: item.link,
              author: item.owner?.display_name || 'Developer',
              queryMatched: 'puppeteer pdf',
              snippet: evalResult.userProblem || `Tags: ${(item.tags || []).join(', ')}`,
              detectedAt: new Date().toISOString(),
              suggestedReplyMarkdown: evalResult.replyMarkdown,
              status: 'pending',
            };

            existing.unshift(opp);
            existingUrls.add(item.link);
            newCount++;
            if (newCount >= 3) break;
          }
        }
      } catch (err) {
        console.warn('[GrowthAgent] StackOverflow scan error:', err);
      }
    }

    this.saveSocial(existing);
    return { newOpportunities: newCount, totalScanned: scannedCount };
  }

  public async addManualSocialThread(url: string, title?: string, snippet?: string): Promise<GrowthSocialOpportunity> {
    const existing = this.loadSocial();
    const cleanUrl = url.trim();

    let platform: GrowthSocialOpportunity['platform'] = 'reddit';
    if (cleanUrl.includes('ycombinator.com')) platform = 'hackernews';
    else if (cleanUrl.includes('stackoverflow.com')) platform = 'stackoverflow';
    else if (cleanUrl.includes('dev.to')) platform = 'devto';

    let inferredTitle = title;
    if (!inferredTitle && cleanUrl.includes('/comments/')) {
      const parts = cleanUrl.split('/comments/')[1]?.split('/') || [];
      if (parts[1]) {
        inferredTitle = decodeURIComponent(parts[1]).replace(/_/g, ' ');
        inferredTitle = inferredTitle.charAt(0).toUpperCase() + inferredTitle.slice(1);
      }
    }
    inferredTitle = inferredTitle || 'Community Discussion Thread';

    const evalResult = await this.evaluateAndSynthesizeReply(inferredTitle, snippet || inferredTitle, platform);
    const reply = evalResult.replyMarkdown || 'Discussion regarding document generation and headless Chrome rendering.';

    const opp: GrowthSocialOpportunity = {
      id: `soc_${crypto.randomBytes(6).toString('hex')}`,
      platform,
      title: inferredTitle,
      url: cleanUrl,
      author: 'Community Poster',
      queryMatched: 'manual',
      snippet: evalResult.userProblem || snippet || inferredTitle,
      detectedAt: new Date().toISOString(),
      suggestedReplyMarkdown: reply,
      status: 'pending',
    };

    existing.unshift(opp);
    this.saveSocial(existing);
    return opp;
  }

  public toggleAutoDispatch(enabled: boolean): GrowthSettings {
    const settings = this.loadSettings();
    settings.autoDispatchEnabled = enabled;
    this.saveSettings(settings);
    return settings;
  }

  public addLead(domain: string, category: GrowthLead['category'] = 'saas', contactEmail?: string): GrowthLead {
    const leads = this.loadLeads();
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase().trim();

    const existing = leads.find((l) => l.domain === cleanDomain);
    if (existing) {
      if (contactEmail && !existing.contactEmail) {
        existing.contactEmail = contactEmail;
        this.saveLeads(leads);
      }
      return existing;
    }

    const newLead: GrowthLead = {
      id: `lead_${crypto.randomBytes(6).toString('hex')}`,
      domain: cleanDomain,
      companyName: cleanDomain.split('.')[0]?.toUpperCase() || cleanDomain,
      category,
      websiteUrl: `https://${cleanDomain}`,
      contactEmail: contactEmail || `founders@${cleanDomain}`,
      status: 'discovered',
      discoveredAt: new Date().toISOString(),
      viewCount: 0,
    };

    leads.unshift(newLead);
    this.saveLeads(leads);
    return newLead;
  }

  /**
   * Generates a tailored, branded PDF demo and a high-converting cold pitch for a target lead.
   */
  public async generateDemoForLead(leadId: string): Promise<GrowthLead> {
    const leads = this.loadLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    try {
      // 1. Scrape target brand metadata
      let brandName = lead.companyName;
      let brandDesc = lead.description || '';
      let logoUrl: string | undefined = undefined;
      let brandColor = '#4f46e5';

      try {
        const scraped = await scraperService.scrapeUrl({
          url: lead.websiteUrl,
          timeout_ms: 12000,
          strip_images: false,
          include_raw_html: false,
        });

        if (scraped.title) {
          brandName = scraped.title.split(/[-|•:]/)[0]?.trim() || brandName;
        }
        if (scraped.description) {
          brandDesc = scraped.description;
        }

        // Try extracting favicon or apple-touch-icon
        logoUrl = `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128`;
      } catch (err) {
        console.warn(`[GrowthAgent] Scrape fallback for ${lead.domain}:`, err);
        logoUrl = `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128`;
      }

      lead.companyName = brandName;
      lead.description = brandDesc;
      lead.logoUrl = logoUrl;
      lead.primaryColor = brandColor;

      // 2. Select matching template & customize HTML
      let templateHtml = '';
      if (lead.category === 'fintech' || lead.category === 'erp' || lead.category === 'saas') {
        const einvoiceTpl = TEMPLATES.find((t) => t.id === 'einvoice') || TEMPLATES[0]!;
        templateHtml = einvoiceTpl.html
          .replace(/Nordic Cloud Systems ApS/g, brandName)
          .replace(/STR-2026-9042/g, `INV-${lead.domain.slice(0, 3).toUpperCase()}-2026-001`)
          .replace(/Enterprise Cloud Infrastructure Cluster/g, `${brandName} Platform Pro License & Cloud API Tier`);
      } else {
        const quoteTpl = TEMPLATES.find((t) => t.id === 'quote') || TEMPLATES[0]!;
        templateHtml = quoteTpl.html
          .replace(/Nordic Digital Agency ApS/g, brandName)
          .replace(/QUO-2026-0842/g, `EST-${lead.domain.slice(0, 3).toUpperCase()}-9401`)
          .replace(/Apex Health/g, 'Global Enterprise Client Inc.');
      }

      // 3. Render Vector PDF with Smart Pagination Shield
      const pdfBuffer = await browserService.renderPdf({
        html: templateHtml,
        format: 'A4',
        smart_pagination: true,
        print_background: true,
      });

      // 4. Save to permanent hosted CDN storage
      const stored = await storageService.saveFile(pdfBuffer, {
        mimeType: 'application/pdf',
        extension: 'pdf',
        filename: `${lead.domain}-tailprint-demo.pdf`,
        isPermanent: true,
      });

      lead.customDemoPdfUrl = stored.hostedUrl;
      lead.customDemoFileId = stored.fileId;
      lead.demoGeneratedAt = new Date().toISOString();

      // 5. Generate high-converting personalized pitch using Gemini
      const pitch = await this.synthesizePersonalizedPitch(lead, brandDesc);
      lead.emailSubject = pitch.subject;
      lead.emailBodyHtml = pitch.bodyHtml;
      lead.pitchAngle = pitch.angle;
      lead.status = 'demo_generated';

      this.saveLeads(leads);
      return lead;
    } catch (err: any) {
      console.error(`[GrowthAgent] Failed generating demo for ${lead.domain}:`, err);
      lead.status = 'failed';
      lead.lastError = err.message || 'Render failure';
      this.saveLeads(leads);
      throw err;
    }
  }

  /**
   * Synthesizes an ultra-relevant, non-spammy B2B cold email using Gemini 2.5 Flash.
   */
  private async synthesizePersonalizedPitch(
    lead: GrowthLead,
    brandDesc: string
  ): Promise<{ subject: string; bodyHtml: string; angle: string }> {
    const geminiKey = env.GEMINI_API_KEY;

    const fallback = {
      subject: `⚡ Quick question regarding ${lead.companyName}'s document & PDF rendering`,
      bodyHtml: `<p>Hi ${lead.companyName} team,</p>
<p>I came across <strong>${lead.companyName}</strong> and love what you're building.</p>
<p>Most SaaS engineering teams struggle with slow headless Chrome timeouts, cut-off multi-page table rows, or the upcoming <strong>2026 EU E-Invoicing mandate (Factur-X / EN 16931)</strong>.</p>
<p>I ran your brand through our headless engine and generated this live vector PDF demo for you in 600ms:</p>
<p>It includes zero-split page protection, repeated headers, and clean vector rendering. You can integrate this with 5 lines of code or through our Claude/Cursor MCP tool.</p>
<p>Would you be open to a 5-minute chat, or should I send over the cURL snippet?</p>
<p>Best regards,<br>Sebastian Viste<br>Founder, <a href="https://tailprint.com">Tailprint.com</a></p>`,
      angle: 'EU E-Invoicing & Multi-Page Pagination Shield',
    };

    if (!geminiKey) return fallback;

    const prompt = `You are the founder of Tailprint (tailprint.com), an elite B2B document & PDF rendering infrastructure with Smart Pagination and EU E-Invoicing (Factur-X) compliance.
TARGET PROSPECT:
- Company Name: ${lead.companyName}
- Domain: ${lead.domain}
- Category: ${lead.category}
- Description: ${brandDesc}
- Live Demo Link: ${lead.customDemoPdfUrl}

TASK:
Write a punchy, ultra-concise, high-converting B2B cold outreach email to their Head of Engineering or Founder.
Rules:
1. Subject line must be short, intriguing, and feel like an internal engineering note (max 7 words).
2. First sentence must acknowledge something specific about their platform.
3. Mention that you generated a custom live vector PDF specifically for their brand (without asking for credentials).
4. Emphasize that it renders sub-second, prevents awkward multi-page table splits, and is Factur-X / EN 16931 compliant.
5. Soft, frictionless Call To Action (e.g. "Would you like me to send the cURL snippet, or test it in our live studio?").
6. Tone: humble, engineering-savvy, zero buzzwords.

Respond ONLY with valid JSON in this exact structure:
{
  "subject": "Subject line",
  "angle": "Brief 3-word hook",
  "bodyHtml": "<p>Paragraph 1...</p><p>Paragraph 2...</p>"
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.subject && parsed.bodyHtml) {
            return {
              subject: parsed.subject,
              bodyHtml: parsed.bodyHtml,
              angle: parsed.angle || fallback.angle,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[GrowthAgent] Gemini pitch synthesis warning:', err);
    }

    return fallback;
  }

  /**
   * Dispatches the personalized pitch email to the lead.
   */
  public async dispatchLeadEmail(leadId: string): Promise<GrowthLead> {
    const leads = this.loadLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    if (!lead.customDemoPdfUrl) {
      await this.generateDemoForLead(leadId);
    }

    const targetEmail = lead.contactEmail || `hello@${lead.domain}`;

    const res = await emailService.sendOutboundPitchEmail({
      to: targetEmail,
      companyName: lead.companyName,
      subject: lead.emailSubject || `⚡ Tailprint vector rendering for ${lead.companyName}`,
      bodyHtml: lead.emailBodyHtml || `<p>Hi ${lead.companyName} team, check out your custom demo below.</p>`,
      demoPdfUrl: lead.customDemoPdfUrl || 'https://tailprint.com',
    });

    if (!res.success) {
      lead.lastError = res.error;
      this.saveLeads(leads);
      throw new Error(`Email dispatch failed: ${res.error}`);
    }

    lead.status = 'sent';
    lead.sentAt = new Date().toISOString();
    lead.contactEmail = targetEmail;
    this.saveLeads(leads);

    return lead;
  }

  /**
   * Generates a viral 5-7 slide LinkedIn / Social carousel PDF ready to publish.
   */
  public async generateLinkedInCarousel(topicTitle?: string): Promise<GrowthContentItem> {
    const topics = [
      {
        title: '5 reasons Puppeteer crashes in Serverless (and how to fix PDF generation)',
        slides: [
          { headline: 'Why Headless Chrome Fails in Production', content: 'Serverless PDF rendering is broken for 90% of SaaS startups. Here is why.' },
          { headline: '1. Memory Spikes & Chromium Zombie Processes', content: 'Each page load leaks memory unless you isolate browser contexts with a dedicated worker pool.' },
          { headline: '2. The Multi-Page Table Split Trap', content: 'Chromium chops table rows right down the middle unless you force break-inside: avoid and repeating theads.' },
          { headline: '3. Webfont Flash of Unstyled Text', content: 'Generating PDFs before fonts finish loading outputs fallback Times New Roman vectors.' },
          { headline: '4. The 2026 EU E-Invoicing Wave', content: 'From 2026, raw PDFs are not enough. B2B invoices must embed Factur-X EN 16931 XML.' },
          { headline: 'The Fix: Modern Document Infrastructure', content: 'Use an optimized headless engine like Tailprint with Smart Pagination Shield built-in.' },
        ],
      },
      {
        title: 'The 2026 EU E-Invoicing Mandate: What developers need to know',
        slides: [
          { headline: 'EU Invoicing is Changing in 2026', content: 'Standard visual PDFs are no longer compliant for EU B2B transactions.' },
          { headline: 'What is Factur-X / ZUGFeRD?', content: 'A hybrid PDF/A-3 document containing human-readable visual layout AND machine-readable XML.' },
          { headline: 'The Technical Hurdle', content: 'Embedding valid CrossIndustryInvoice XML inside vector PDF streams requires compliant metadata dictionaries.' },
          { headline: 'How Tailprint Automates It', content: 'Post your invoice data or Tailwind HTML to /v1/render/einvoice and receive instant verified hybrid PDFs.' },
          { headline: 'Ready in 5 minutes', content: 'Test your templates directly in tailprint.com/studio.' },
        ],
      },
    ];

    const selectedTopic = topicTitle
      ? { title: topicTitle, slides: topics[0]!.slides }
      : topics[Math.floor(Math.random() * topics.length)]!;

    const rendered = await carouselService.renderCarousel({
      title: selectedTopic.title,
      subtitle: 'Document Infrastructure for Modern Apps & AI Agents',
      author: {
        name: 'Sebastian Viste',
        handle: 'tailprint.com',
        role: 'Founder & Architect',
      },
      theme: 'dark',
      slides: selectedTopic.slides.map((s, idx) => ({
        headline: s.headline,
        content: s.content,
        tag: `LESSON 0${idx + 1}`,
      })),
    });

    const item: GrowthContentItem = {
      id: `content_${crypto.randomBytes(6).toString('hex')}`,
      title: selectedTopic.title,
      topic: 'Engineering & SaaS Architecture',
      format: 'linkedin_carousel',
      contentMarkdown: selectedTopic.slides.map((s) => `### ${s.headline}\n${s.content}`).join('\n\n---\n\n'),
      pdfUrl: rendered.pdfStored?.hostedUrl,
      previewImageUrl: rendered.previewStored?.hostedUrl,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    const contentList = this.loadContent();
    contentList.unshift(item);
    this.saveContent(contentList);

    return item;
  }

  /**
   * Autonomous background worker step.
   * Can be triggered periodically by cron or fastify timer.
   */
  public async runAutopilotCycle(): Promise<{ actionsTaken: string[] }> {
    if (this.isCycleRunning) return { actionsTaken: ['Cycle already running'] };
    this.isCycleRunning = true;

    const actionsTaken: string[] = [];

    try {
      const leads = this.loadLeads();
      const settings = this.loadSettings();

      // 1. Check if any discovered leads need automated custom demo generation
      const leadNeedingDemo = leads.find((l) => l.status === 'discovered');
      if (leadNeedingDemo) {
        console.log(`[GrowthAgent] Generating autonomous demo for ${leadNeedingDemo.domain}...`);
        await this.generateDemoForLead(leadNeedingDemo.id);
        actionsTaken.push(`Generated custom demo PDF for ${leadNeedingDemo.domain}`);
      }

      // 2. If auto-dispatch enabled, send 1 queued email
      if (settings.autoDispatchEnabled) {
        const leadReadyToSend = leads.find((l) => l.status === 'demo_generated');
        if (leadReadyToSend) {
          console.log(`[GrowthAgent] Auto-dispatching email to ${leadReadyToSend.domain}...`);
          await this.dispatchLeadEmail(leadReadyToSend.id);
          actionsTaken.push(`Dispatched pitch email to ${leadReadyToSend.contactEmail}`);
        }
      }

      // 3. Ensure we have at least 1 LinkedIn carousel ready in queue
      const content = this.loadContent();
      if (content.length === 0) {
        console.log('[GrowthAgent] Generating seed LinkedIn carousel...');
        const item = await this.generateLinkedInCarousel();
        actionsTaken.push(`Created LinkedIn carousel: "${item.title}"`);
      }

      // 4. Scan developer community radar if pending opportunities are low
      const pendingOpportunities = this.loadSocial().filter((s) => s.status === 'pending');
      if (pendingOpportunities.length < 3) {
        console.log('[GrowthAgent] Scanning community radar for developer discussions...');
        const scanRes = await this.scanCommunityRadar();
        if (scanRes.newOpportunities > 0) {
          actionsTaken.push(`Found ${scanRes.newOpportunities} community discussions with pre-written answers`);
        }
      }

      settings.lastRunAt = new Date().toISOString();
      this.saveSettings(settings);
    } catch (err: any) {
      console.error('[GrowthAgent] Autopilot cycle error:', err);
      actionsTaken.push(`Error: ${err.message}`);
    } finally {
      this.isCycleRunning = false;
    }

    return { actionsTaken };
  }
}

export const growthAgentService = GrowthAgentService.getInstance();
