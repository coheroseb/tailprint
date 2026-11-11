import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { BrowserContext, Page } from 'playwright';
import { browserService } from './browser.js';
import { env } from '../config/env.js';
import type { ScrapeMarkdownRequest, ScrapeMarkdownResponse } from '../schemas/scrape.js';

export class ScraperService {
  private static instance: ScraperService | null = null;
  private turndownWithImages: TurndownService;
  private turndownWithoutImages: TurndownService;

  private constructor() {
    this.turndownWithImages = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
    });
    this.turndownWithImages.use(gfm);

    this.turndownWithoutImages = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
    });
    this.turndownWithoutImages.use(gfm);
    // Strip images rule
    this.turndownWithoutImages.addRule('stripImages', {
      filter: ['img', 'picture', 'figure'],
      replacement: (_content, node) => {
        const alt = (node as HTMLElement).getAttribute?.('alt') || '';
        return alt ? `[Image: ${alt.trim()}]` : '';
      },
    });
  }

  public static getInstance(): ScraperService {
    if (!ScraperService.instance) {
      ScraperService.instance = new ScraperService();
    }
    return ScraperService.instance;
  }

  public async scrapeUrl(params: ScrapeMarkdownRequest): Promise<Omit<ScrapeMarkdownResponse, 'cached'>> {
    const timeout = params.timeout_ms || env.RENDER_TIMEOUT_MS;

    // Use browserService concurrency pool and singleton browser
    const rawData = await (browserService as any).executeWithTimeout(
      async (_context: BrowserContext, page: Page) => {
        // Set realistic Desktop User-Agent
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
        });

        // Navigate to target URL
        const response = await page.goto(params.url, {
          waitUntil: 'domcontentloaded',
          timeout,
        });

        // Optional custom wait selector (e.g. "article" or ".content")
        if (params.wait_for) {
          await page.waitForSelector(params.wait_for, { timeout: 3000 }).catch(() => {});
        }

        // Graceful network idle wait to allow dynamic JS to settle
        await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

        const finalUrl = page.url() || params.url;
        const html = await page.content();
        const statusCode = response?.status() || 200;

        return { finalUrl, html, statusCode };
      },
      { width: 1280, height: 800 }
    );

    return this.cleanHtmlToMarkdown({
      url: rawData.finalUrl,
      rawHtml: rawData.html,
      stripImages: params.strip_images,
      includeRawHtml: params.include_raw_html,
    });
  }

  public cleanHtmlToMarkdown(opts: {
    url: string;
    rawHtml: string;
    stripImages: boolean;
    includeRawHtml?: boolean;
  }): Omit<ScrapeMarkdownResponse, 'cached'> {
    const dom = new JSDOM(opts.rawHtml, { url: opts.url });
    const doc = dom.window.document;

    // Extract meta description or date
    const metaDescription =
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      null;

    const metaDate =
      doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
      doc.querySelector('time')?.getAttribute('datetime') ||
      null;

    // Run Mozilla Readability parser
    const reader = new Readability(doc);
    const parsedArticle = reader.parse();

    let title = parsedArticle?.title || doc.title || 'Untitled Web Page';
    let byline = parsedArticle?.byline || null;
    let description = metaDescription || parsedArticle?.excerpt || null;
    let contentHtml = parsedArticle?.content || '';

    // Fallback if Readability fails to isolate an article container
    if (!contentHtml) {
      // Strip noisy elements manually
      const noisyTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 'header', 'aside'];
      noisyTags.forEach((tag) => {
        doc.querySelectorAll(tag).forEach((el) => el.remove());
      });
      contentHtml = doc.body?.innerHTML || opts.rawHtml;
    }

    // Convert cleaned HTML to Markdown using Turndown
    const turndown = opts.stripImages ? this.turndownWithoutImages : this.turndownWithImages;
    let markdown = turndown.turndown(contentHtml).trim();

    // Clean up excessive blank lines
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // Add top-level title header if missing
    if (title && !markdown.startsWith('# ')) {
      markdown = `# ${title}\n\n${markdown}`;
    }

    // Compute metrics and token savings
    const words = markdown.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const estimatedTokens = Math.ceil(wordCount * 1.33);

    const rawBytes = Buffer.byteLength(opts.rawHtml, 'utf8');
    const mdBytes = Buffer.byteLength(markdown, 'utf8');

    const savingsPercent = rawBytes > 0
      ? Math.max(0, ((1 - mdBytes / rawBytes) * 100)).toFixed(1) + '%'
      : '0.0%';

    return {
      url: opts.url,
      title,
      byline,
      published_at: metaDate,
      description,
      markdown,
      word_count: wordCount,
      estimated_tokens: estimatedTokens,
      raw_content_bytes: rawBytes,
      markdown_bytes: mdBytes,
      token_savings_percent: savingsPercent,
      raw_html: opts.includeRawHtml ? opts.rawHtml : undefined,
    };
  }
}

export const scraperService = ScraperService.getInstance();
