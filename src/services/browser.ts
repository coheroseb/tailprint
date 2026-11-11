import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import pLimit from 'p-limit';
import { encryptPDF } from 'cryptpdf';
import { env } from '../config/env.js';
import type { RenderPdfRequest, RenderImageRequest } from '../schemas/render.js';

export class RenderTimeoutError extends Error {
  constructor(message = `Rendering exceeded timeout of ${env.RENDER_TIMEOUT_MS}ms`) {
    super(message);
    this.name = 'RenderTimeoutError';
  }
}

export class BrowserService {
  private static instance: BrowserService | null = null;
  private browser: Browser | null = null;
  private limit = pLimit(env.CONCURRENCY_LIMIT);
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  public async init(): Promise<void> {
    if (this.browser) return;
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return;
    }

    this.isInitializing = true;
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
        ],
      });
    } finally {
      this.isInitializing = false;
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private isPrivateOrBlockedUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);

      // Only allow http, https, data, and blob schemes
      if (!['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol)) {
        return true;
      }

      if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Check localhost and local hostnames
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
      ) {
        return true;
      }

      // Check IPv4 private and link-local ranges
      // 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 0.0.0.0/8
      const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (ipv4Match) {
        const [, aStr, bStr] = ipv4Match;
        const a = parseInt(aStr, 10);
        const b = parseInt(bStr, 10);

        if (a === 127) return true; // Loopback
        if (a === 10) return true; // Class A private
        if (a === 172 && b >= 16 && b <= 31) return true; // Class B private
        if (a === 192 && b === 168) return true; // Class C private
        if (a === 169 && b === 254) return true; // Link-local / Cloud metadata (169.254.169.254)
        if (a === 0) return true; // 0.0.0.0/8
      }

      // Check IPv6 loopback / unique local
      if (
        hostname === '::1' ||
        hostname.startsWith('fe80:') ||
        hostname.startsWith('fc00:') ||
        hostname.startsWith('fd00:')
      ) {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  private setupSsrfProtection(page: Page): void {
    page.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();

      if (this.isPrivateOrBlockedUrl(url)) {
        await route.abort('blockedbyclient');
        return;
      }

      await route.continue();
    });
  }

  private prepareHtmlWithTailwind(rawHtml: string): string {
    const hasTailwind =
      rawHtml.includes('cdn.tailwindcss.com') ||
      rawHtml.includes('@tailwindcss');

    const tailwindScriptTag = `<script src="${env.TAILWIND_CDN_URL}"></script>`;

    // If it's a complete HTML document
    if (/<html[\s>]/i.test(rawHtml)) {
      if (hasTailwind) {
        return rawHtml;
      }

      if (/<head[\s>]/i.test(rawHtml)) {
        return rawHtml.replace(/<head[\s>]/i, (match) => `${match}\n  ${tailwindScriptTag}`);
      }

      return rawHtml.replace(/<html[\s>]/i, (match) => `${match}\n<head>${tailwindScriptTag}</head>`);
    }

    // Fragment: wrap with standard HTML5 boilerplate and Tailwind
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${tailwindScriptTag}
</head>
<body class="bg-white text-gray-900 antialiased">
  ${rawHtml}
</body>
</html>`;
  }

  private async executeWithTimeout<T>(
    task: (context: BrowserContext, page: Page) => Promise<T>,
    viewport = { width: 1200, height: 630 }
  ): Promise<T> {
    await this.init();
    if (!this.browser) {
      throw new Error('Browser is not initialized');
    }

    return this.limit(async () => {
      let context: BrowserContext | null = null;
      let page: Page | null = null;

      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new RenderTimeoutError(`Operation exceeded limit of ${env.RENDER_TIMEOUT_MS}ms`));
        }, env.RENDER_TIMEOUT_MS);
      });

      const workPromise = (async () => {
        try {
          context = await this.browser!.newContext({
            viewport,
            deviceScaleFactor: 2,
          });
          page = await context.newPage();

          page.setDefaultTimeout(env.RENDER_TIMEOUT_MS);
          page.setDefaultNavigationTimeout(env.RENDER_TIMEOUT_MS);

          this.setupSsrfProtection(page);

          return await task(context, page);
        } finally {
          if (page) {
            await page.close().catch(() => {});
          }
          if (context) {
            await context.close().catch(() => {});
          }
        }
      })();

      try {
        return await Promise.race([workPromise, timeoutPromise]);
      } catch (err: any) {
        if (err.name === 'TimeoutError' || err.message?.includes('Timeout')) {
          throw new RenderTimeoutError();
        }
        throw err;
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    });
  }

  public async renderPdf(params: RenderPdfRequest): Promise<Buffer> {
    const fullHtml = this.prepareHtmlWithTailwind(params.html);

    return this.executeWithTimeout(
      async (_context, page) => {
        await page.setContent(fullHtml, {
          waitUntil: 'load',
          timeout: env.RENDER_TIMEOUT_MS,
        });

        // Wait for Tailwind JIT runtime and fonts
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {}),
          page.evaluate(() => (document as any).fonts?.ready).catch(() => {}),
        ]);

        // Dynamic selector wait if requested
        if (params.wait_for) {
          await page.waitForSelector(params.wait_for, { timeout: 5000 });
        }

        // Delay in ms before rendering (e.g. for animations/charts to settle)
        if (params.delay_ms && params.delay_ms > 0) {
          const cappedDelay = Math.min(params.delay_ms, 5000);
          await new Promise((r) => setTimeout(r, cappedDelay));
        }

        const hasHeaderFooter = Boolean(
          params.display_header_footer || params.header_html || params.footer_html
        );

        // Sensible default margins when headers or footers are present to avoid overlapping content
        const defaultMargins = hasHeaderFooter
          ? { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' }
          : undefined;

        const margin = params.margin
          ? {
              top: params.margin.top,
              bottom: params.margin.bottom,
              left: params.margin.left,
              right: params.margin.right,
            }
          : defaultMargins;

        let pdfBuffer = await page.pdf({
          format: params.format,
          landscape: params.landscape,
          printBackground: params.print_background,
          displayHeaderFooter: hasHeaderFooter,
          headerTemplate: params.header_html || '<span></span>',
          footerTemplate: params.footer_html || '<span></span>',
          margin,
        });

        // Optional AES-256 PDF encryption with user and optional owner password
        if (params.password) {
          const encrypted = await encryptPDF(
            new Uint8Array(pdfBuffer),
            params.password,
            params.owner_password || params.password
          );
          pdfBuffer = Buffer.from(encrypted);
        }

        return pdfBuffer;
      },
      { width: 1200, height: 800 }
    );
  }

  public async renderImage(params: RenderImageRequest): Promise<Buffer> {
    const fullHtml = this.prepareHtmlWithTailwind(params.html);

    return this.executeWithTimeout(
      async (_context, page) => {
        await page.setContent(fullHtml, {
          waitUntil: 'load',
          timeout: env.RENDER_TIMEOUT_MS,
        });

        // Wait for Tailwind JIT runtime and fonts
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {}),
          page.evaluate(() => (document as any).fonts?.ready).catch(() => {}),
        ]);

        // Dynamic selector wait if requested
        if (params.wait_for) {
          await page.waitForSelector(params.wait_for, { timeout: 5000 });
        }

        // Delay in ms before capturing (e.g. for animations/charts to settle)
        if (params.delay_ms && params.delay_ms > 0) {
          const cappedDelay = Math.min(params.delay_ms, 5000);
          await new Promise((r) => setTimeout(r, cappedDelay));
        }

        const imageBuffer = await page.screenshot({
          type: params.type,
          fullPage: false,
        });

        return imageBuffer;
      },
      { width: params.width, height: params.height }
    );
  }
}

export const browserService = BrowserService.getInstance();
