import { browserService } from './browser.js';

export interface ExtractedTable {
  index: number;
  caption?: string;
  headers: string[];
  rows: string[][];
  markdownTable: string;
}

export interface WebAuditResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  isHttps: boolean;
  score: number; // 0-100
  seo: {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
    h1Count: number;
    h1Texts: string[];
    h2Count: number;
    openGraph: Record<string, string>;
    twitter: Record<string, string>;
  };
  accessibility: {
    totalImages: number;
    imagesMissingAlt: number;
    hasHtmlLang: boolean;
    lang?: string;
    buttonsWithoutLabels: number;
  };
  performance: {
    totalDomNodes: number;
    scriptsCount: number;
    stylesheetsCount: number;
    imagesCount: number;
    domContentLoadedMs?: number;
    loadMs?: number;
  };
  recommendations: string[];
}

export class WebAuditService {
  private static instance: WebAuditService | null = null;

  public static getInstance(): WebAuditService {
    if (!WebAuditService.instance) {
      WebAuditService.instance = new WebAuditService();
    }
    return WebAuditService.instance;
  }

  /**
   * Extracts HTML tables from any public URL into structured JSON and clean Markdown tables.
   */
  public async extractTablesFromUrl(options: { url: string; selector?: string }): Promise<ExtractedTable[]> {
    const { url, selector = 'table' } = options;

    return browserService.executeTask(async (_context, page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

      const rawTables = await page.$$eval(selector, (tables) => {
        return tables.map((tbl, index) => {
          const caption = tbl.querySelector('caption')?.textContent?.trim() || undefined;

          // Headers
          let headers: string[] = [];
          const thElements = Array.from(tbl.querySelectorAll('thead th, tr:first-child th'));
          if (thElements.length > 0) {
            headers = thElements.map((th) => th.textContent?.trim().replace(/\s+/g, ' ') || '');
          }

          // Rows
          const rowElements = Array.from(tbl.querySelectorAll('tbody tr, tr'));
          const rows: string[][] = [];

          for (const tr of rowElements) {
            // Skip the row if it's the header row we already parsed
            if (tr.parentElement?.tagName.toLowerCase() === 'thead') continue;
            const cells = Array.from(tr.querySelectorAll('td, th'));
            if (cells.length === 0) continue;

            const rowData = cells.map((cell) => cell.textContent?.trim().replace(/\s+/g, ' ') || '');

            // If we didn't have headers yet, and this first row is all th, use it
            if (headers.length === 0 && cells.every((c) => c.tagName.toLowerCase() === 'th')) {
              headers = rowData;
            } else {
              rows.push(rowData);
            }
          }

          // Fallback headers if table has none
          if (headers.length === 0 && rows.length > 0) {
            headers = rows[0].map((_, i) => `Column ${i + 1}`);
          }

          return {
            index,
            caption,
            headers,
            rows,
          };
        });
      });

      // Format as Markdown tables
      return rawTables.map((t) => {
        const headerRow = `| ${t.headers.join(' | ')} |`;
        const dividerRow = `| ${t.headers.map(() => '---').join(' | ')} |`;
        const bodyRows = t.rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
        const markdownTable = [headerRow, dividerRow, bodyRows].filter(Boolean).join('\n');

        return {
          ...t,
          markdownTable,
        };
      });
    });
  }

  /**
   * Conducts an automated SEO, Accessibility, and Performance audit on any public web page.
   */
  public async auditWebpage(options: { url: string }): Promise<WebAuditResult> {
    const { url } = options;

    return browserService.executeTask(async (_context, page) => {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

      const statusCode = response?.status() || 200;
      const finalUrl = page.url();
      const isHttps = finalUrl.startsWith('https://');

      const evaluation = await page.evaluate(() => {
        // SEO
        const title = document.title?.trim() || undefined;
        const description = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content?.trim() || undefined;
        const canonical = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement)?.href || undefined;
        const robots = (document.querySelector('meta[name="robots"]') as HTMLMetaElement)?.content?.trim() || undefined;

        const h1Elements = Array.from(document.querySelectorAll('h1'));
        const h1Count = h1Elements.length;
        const h1Texts = h1Elements.map((el) => el.textContent?.trim() || '').filter(Boolean);
        const h2Count = document.querySelectorAll('h2').length;

        // OpenGraph
        const openGraph: Record<string, string> = {};
        for (const meta of Array.from(document.querySelectorAll('meta[property^="og:"]'))) {
          const prop = (meta as HTMLMetaElement).getAttribute('property') || '';
          const content = (meta as HTMLMetaElement).content || '';
          if (prop && content) openGraph[prop] = content;
        }

        // Twitter
        const twitter: Record<string, string> = {};
        for (const meta of Array.from(document.querySelectorAll('meta[name^="twitter:"]'))) {
          const name = (meta as HTMLMetaElement).getAttribute('name') || '';
          const content = (meta as HTMLMetaElement).content || '';
          if (name && content) twitter[name] = content;
        }

        // Accessibility
        const images = Array.from(document.querySelectorAll('img'));
        const totalImages = images.length;
        const imagesMissingAlt = images.filter((img) => !img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '').length;

        const htmlLang = document.documentElement.getAttribute('lang') || undefined;
        const hasHtmlLang = Boolean(htmlLang && htmlLang.trim().length > 0);

        const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
        const buttonsWithoutLabels = buttons.filter((btn) => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute('aria-label');
          const ariaLabelledby = btn.getAttribute('aria-labelledby');
          return !text && !ariaLabel && !ariaLabelledby;
        }).length;

        // Performance & Assets
        const totalDomNodes = document.querySelectorAll('*').length;
        const scriptsCount = document.querySelectorAll('script').length;
        const stylesheetsCount = document.querySelectorAll('link[rel="stylesheet"]').length;

        // Navigation timings
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        let domContentLoadedMs: number | undefined;
        let loadMs: number | undefined;

        if (navEntries.length > 0) {
          domContentLoadedMs = Math.round(navEntries[0].domContentLoadedEventEnd);
          loadMs = Math.round(navEntries[0].loadEventEnd);
        }

        return {
          seo: {
            title,
            description,
            canonical,
            robots,
            h1Count,
            h1Texts,
            h2Count,
            openGraph,
            twitter,
          },
          accessibility: {
            totalImages,
            imagesMissingAlt,
            hasHtmlLang,
            lang: htmlLang,
            buttonsWithoutLabels,
          },
          performance: {
            totalDomNodes,
            scriptsCount,
            stylesheetsCount,
            imagesCount: totalImages,
            domContentLoadedMs,
            loadMs,
          },
        };
      });

      // Calculate health score & recommendations
      let score = 100;
      const recommendations: string[] = [];

      if (!isHttps) {
        score -= 20;
        recommendations.push('Enforce HTTPS for encryption, privacy, and SEO ranking.');
      }

      if (!evaluation.seo.title) {
        score -= 15;
        recommendations.push('Missing `<title>` tag on the page.');
      } else if (evaluation.seo.title.length < 20 || evaluation.seo.title.length > 65) {
        score -= 5;
        recommendations.push(`Page title length is ${evaluation.seo.title.length} characters (ideal: 30-60 characters).`);
      }

      if (!evaluation.seo.description) {
        score -= 10;
        recommendations.push('Missing meta description tag (`<meta name="description">`).');
      }

      if (evaluation.seo.h1Count === 0) {
        score -= 10;
        recommendations.push('No `<h1>` heading tag found on the page.');
      } else if (evaluation.seo.h1Count > 1) {
        score -= 5;
        recommendations.push(`Multiple (${evaluation.seo.h1Count}) \`<h1>\` tags found. Prefer a single primary \`<h1>\`.`);
      }

      if (!evaluation.accessibility.hasHtmlLang) {
        score -= 5;
        recommendations.push('Missing `lang` attribute on `<html>` element for screen readers.');
      }

      if (evaluation.accessibility.imagesMissingAlt > 0) {
        score -= Math.min(15, evaluation.accessibility.imagesMissingAlt * 3);
        recommendations.push(`${evaluation.accessibility.imagesMissingAlt} image(s) missing descriptive \`alt\` text.`);
      }

      if (evaluation.accessibility.buttonsWithoutLabels > 0) {
        score -= 5;
        recommendations.push(`${evaluation.accessibility.buttonsWithoutLabels} button(s) lack accessible labels or text.`);
      }

      if (!evaluation.seo.openGraph['og:image']) {
        score -= 5;
        recommendations.push('Missing `og:image` tag for rich social media sharing previews.');
      }

      if (evaluation.performance.totalDomNodes > 1500) {
        score -= 5;
        recommendations.push(`High DOM complexity: ${evaluation.performance.totalDomNodes} nodes (recommended: < 1,500).`);
      }

      return {
        url,
        finalUrl,
        statusCode,
        isHttps,
        score: Math.max(0, score),
        seo: evaluation.seo,
        accessibility: evaluation.accessibility,
        performance: evaluation.performance,
        recommendations: recommendations.length > 0 ? recommendations : ['Great job! All core technical SEO, accessibility, and markup criteria passed.'],
      };
    });
  }
}

export const webAuditService = WebAuditService.getInstance();
