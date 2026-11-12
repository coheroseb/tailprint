import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
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
    if (this.browser?.isConnected()) return;
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

  private isConsentOrTrackerUrl(url: string): boolean {
    const lower = url.toLowerCase();
    const blockedPatterns = [
      'cookiebot.com',
      'onetrust.com',
      'optanon.com',
      'cookieyes.com',
      'termly.io',
      'usercentrics.eu',
      'trustarc.com',
      'complianz.io',
      'iubenda.com',
      'quantcast.mgr.consensu.org',
      'consentmanager.net',
      'osano.com',
      'klaro.org',
      'axeptio.eu',
      'didomi.io',
      'intercom.io',
      'client.crisp.chat',
      'drift.com',
      'js.hs-scripts.com',
      'widget.intercom.io',
      'freshchat.com',
      'embed.tawk.to',
    ];
    return blockedPatterns.some((pattern) => lower.includes(pattern));
  }

  private setupSsrfProtection(page: Page, blockPopups = false): void {
    page.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();

      if (this.isPrivateOrBlockedUrl(url)) {
        await route.abort('blockedbyclient');
        return;
      }

      if (blockPopups && this.isConsentOrTrackerUrl(url)) {
        await route.abort('blockedbyclient');
        return;
      }

      await route.continue();
    });
  }

  public async suppressPopupsAndBanners(page: Page): Promise<void> {
    // 1. Hide known cookie & popup selectors via aggressive CSS
    await page
      .addStyleTag({
        content: `
        #CybotCookiebotDialog,
        #CybotCookiebotDialogBodyUnderlay,
        #onetrust-consent-sdk,
        .onetrust-pc-dark-filter,
        #onetrust-banner-sdk,
        #sp-message-container,
        .qc-cmp2-container,
        .cky-consent-container,
        .cky-overlay,
        #usercentrics-root,
        #iubenda-cs-banner,
        .osano-cm-window,
        .osano-cm-dialog,
        .termly-cookie-dialog,
        .klaro,
        #complianz,
        .cookie-banner,
        .cookie-notice,
        .cookie-alert,
        .cookie-consent,
        .cookie-popup,
        .cookies-eu,
        .gdpr-banner,
        .gdpr-modal,
        [id*="cookie" i],
        [class*="cookie" i]:not(body):not(html):not(main):not(#root):not(#app),
        [id*="consent" i],
        [class*="consent" i]:not(body):not(html):not(main):not(#root):not(#app),
        [aria-label*="cookie" i],
        [aria-label*="consent" i],
        [aria-label*="samtykke" i],
        [aria-label*="privatliv" i],
        iframe[title*="chat" i],
        iframe[id*="crisp" i],
        #crisp-chatbox,
        #hubspot-messages-iframe-container,
        #intercom-container {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          clip: rect(0, 0, 0, 0) !important;
        }

        html, body {
          overflow: auto !important;
          position: static !important;
        }
      `,
      })
      .catch(() => {});

    // 2. Intelligent DOM traversal & removal of fixed/sticky overlays with consent text
    await page
      .evaluate(() => {
        try {
          const keywords = [
            'cookie',
            'cookies',
            'samtykke',
            'sporing',
            'privatliv',
            'gdpr',
            'consent',
            'privacy',
            'akzeptieren',
            'accepter',
            'forstået',
            'nødvendige',
            'we use cookies',
            'denne side bruger cookies',
            'tilpas cookies',
            'kun det nødvendige',
          ];

          const all = Array.from(document.querySelectorAll('body *'));
          for (const el of all) {
            if (!el || !el.isConnected) continue;

            const role = el.getAttribute('role');
            const isDialog = role === 'dialog' || el.getAttribute('aria-modal') === 'true';

            const style = window.getComputedStyle(el);
            const isFixed = style.position === 'fixed' || style.position === 'sticky';
            const zIndex = parseInt(style.zIndex, 10);
            const hasHighZ = !isNaN(zIndex) && zIndex >= 10;

            if (isFixed || isDialog || hasHighZ) {
              const text = (el.textContent || '').toLowerCase();
              const hasKeyword = keywords.some((k) => text.includes(k));
              const rect = el.getBoundingClientRect();

              // Element has consent keywords and takes up space
              if (hasKeyword && rect.height > 20 && rect.width > 80) {
                el.remove();
                continue;
              }

              // Modal backdrop overlay (covers viewport with semi-transparent background)
              if (
                isFixed &&
                rect.width >= window.innerWidth * 0.8 &&
                rect.height >= window.innerHeight * 0.8 &&
                (style.backgroundColor.includes('rgba') || parseFloat(style.opacity) < 1)
              ) {
                el.remove();
              }
            }
          }

          // Restore scrollability on body & documentElement
          document.body.style.overflow = 'auto';
          document.documentElement.style.overflow = 'auto';
        } catch {}
      })
      .catch(() => {});
  }

  public async applySmartPagination(page: Page): Promise<void> {
    // 1. Inject Smart Pagination CSS Shield
    await page
      .addStyleTag({
        content: `
        @media print, screen {
          /* Breathing room on subsequent pages when content flows over */
          @page {
            margin-top: 20mm;
            margin-bottom: 15mm;
          }
          @page :first {
            margin-top: 0mm;
          }
          /* Repeat table header on every printed page */
          thead {
            display: table-header-group !important;
          }
          /* Repeat table footer on bottom of pages */
          tfoot {
            display: table-footer-group !important;
          }
          /* Prevent table rows and cells from splitting in half across page breaks */
          table {
            border-collapse: collapse !important;
          }
          tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Prevent orphan headings at page bottoms */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }
          /* Keep visual blocks, signatures, cards intact */
          img, svg, figure, blockquote,
          .signature, .signature-block, [data-signature],
          .avoid-break, .keep-together, .no-break, [data-page-break="avoid"],
          .card, .panel, .badge, .metric, .pricing-card, .timeline-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Intentional manual page breaks */
          .page-break, .break-page, .break-before, [data-page-break="before"] {
            page-break-before: always !important;
            break-before: page !important;
          }
          .break-after, [data-page-break="after"] {
            page-break-after: always !important;
            break-after: page !important;
          }
          /* Avoid widows and orphans in paragraphs */
          p, li {
            orphans: 3 !important;
            widows: 3 !important;
          }
        }
      `,
      })
      .catch(() => {});

    // 2. Intelligent DOM table analysis: auto-wrap first row in <thead> if table has no <thead>
    await page
      .evaluate(() => {
        try {
          const tables = Array.from(document.querySelectorAll('table'));
          for (const table of tables) {
            if (!table.querySelector('thead')) {
              const firstRow = table.querySelector('tr');
              if (firstRow) {
                const hasTh = firstRow.querySelectorAll('th').length > 0;
                const totalRows = table.querySelectorAll('tr').length;
                if (hasTh || totalRows > 2) {
                  const thead = document.createElement('thead');
                  firstRow.parentNode?.insertBefore(thead, firstRow);
                  thead.appendChild(firstRow);
                }
              }
            }
          }
        } catch {}
      })
      .catch(() => {});
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

  public async executeTask<T>(
    task: (context: BrowserContext, page: Page) => Promise<T>,
    viewport = { width: 1200, height: 630 },
    blockPopups = false,
    timeoutMs: number = env.RENDER_TIMEOUT_MS
  ): Promise<T> {
    return this.executeWithTimeout(task, viewport, blockPopups, timeoutMs);
  }

  private async executeWithTimeout<T>(
    task: (context: BrowserContext, page: Page) => Promise<T>,
    viewport = { width: 1200, height: 630 },
    blockPopups = false,
    timeoutMs: number = env.RENDER_TIMEOUT_MS
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
          reject(new RenderTimeoutError(`Operation exceeded limit of ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const workPromise = (async () => {
        try {
          context = await this.browser!.newContext({
            viewport,
            deviceScaleFactor: 2,
          });
          page = await context.newPage();

          page.setDefaultTimeout(timeoutMs);
          page.setDefaultNavigationTimeout(timeoutMs);

          this.setupSsrfProtection(page, blockPopups);

          if (blockPopups) {
            await page
              .addInitScript(() => {
                try {
                  const acceptedKeys = [
                    'cookieconsent_status',
                    'cookie-consent',
                    'CookieConsent',
                    'cookies_accepted',
                    'consent',
                    'gdpr_consent',
                    'cookies-accepted',
                    'cookie_consent_level',
                    'has_consented',
                  ];
                  for (const k of acceptedKeys) {
                    localStorage.setItem(k, 'dismiss');
                    localStorage.setItem(k, 'true');
                    localStorage.setItem(k, 'accepted');
                    sessionStorage.setItem(k, 'dismiss');
                    sessionStorage.setItem(k, 'true');
                    sessionStorage.setItem(k, 'accepted');
                  }
                } catch {}
              })
              .catch(() => {});
          }

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

  public async recordWebpageScroll(
    url: string,
    options: {
      width?: number;
      height?: number;
      durationMs?: number;
      scrollDistance?: number;
    } = {}
  ): Promise<Buffer> {
    await this.init();
    if (!this.browser) {
      throw new Error('Browser is not initialized');
    }

    const width = options.width ?? 720;
    const height = options.height ?? 1280;
    const durationMs = options.durationMs ?? 5400;

    const tmpDir = path.join(os.tmpdir(), `screenrecord-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });

    return this.limit(async () => {
      let context: BrowserContext | null = null;
      let page: Page | null = null;

      try {
        const contextStartedAt = Date.now();
        context = await this.browser!.newContext({
          viewport: { width, height },
          deviceScaleFactor: 1.5,
          recordVideo: {
            dir: tmpDir,
            size: { width, height },
          },
        });

        page = await context.newPage();

        // Suppress cookie popups
        await this.suppressPopupsAndBanners(page);

        // Navigate and wait for SPA bundles / networkidle (with fallback to domcontentloaded)
        await page
          .goto(url, { waitUntil: 'networkidle', timeout: 8500 })
          .catch(() => page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }));

        // Wait until any SPA loading screen ("Indlæser...", "Loading...") disappears
        await page
          .waitForFunction(
            () => {
              const text = (document.body?.innerText || '').trim();
              if (text.length < 160 && /indlæser|loading|please wait/i.test(text)) {
                return false;
              }
              return text.length > 80 || document.querySelectorAll('section, main, h1, h2').length >= 2;
            },
            { timeout: 3000 }
          )
          .catch(() => {});

        await page.waitForTimeout(250);
        await this.suppressPopupsAndBanners(page);

        // 1. Pre-warm lazy images & scroll-reveal IntersectionObservers BEFORE the recorded shots begin
        await page.evaluate(async () => {
          try {
            document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
              img.setAttribute('loading', 'eager');
            });
          } catch {}

          const getMaxScroll = () =>
            Math.max(
              0,
              Math.max(
                document.body?.scrollHeight || 0,
                document.documentElement?.scrollHeight || 0
              ) - window.innerHeight
            );

          const initialMax = getMaxScroll();
          if (initialMax > 400) {
            for (const frac of [0.3, 0.6, 0.88, 0]) {
              window.scrollTo(0, Math.round(initialMax * frac));
              await new Promise((r) => setTimeout(r, 40));
            }
          }
          window.scrollTo(0, 0);
        });

        await page.waitForTimeout(180);

        // Exact timestamp when Shot 1 begins so we can trim off page-load & pre-warm via FFmpeg
        const shotsStartedAt = Date.now();
        const trimStartSec = Math.max(0.1, (shotsStartedAt - contextStartedAt) / 1000);

        // 2. Record 4 distinct, spread-out camera shots down the webpage (one per Reel slide)
        await page.evaluate(
          async ({ totalDuration }: { totalDuration: number }) => {
            const getMaxScroll = () =>
              Math.max(
                0,
                Math.max(
                  document.body?.scrollHeight || 0,
                  document.documentElement?.scrollHeight || 0
                ) - window.innerHeight
              );

            const maxScroll = getMaxScroll();

            const candidates: number[] = [];
            const els = Array.from(
              document.querySelectorAll('section, main > div, article, [class*="feature" i], [class*="bento" i], [class*="pricing" i], h2')
            );
            for (const el of els) {
              const rect = el.getBoundingClientRect();
              const absTop = rect.top + window.scrollY;
              if (rect.height >= 160 && absTop > 180 && absTop < maxScroll - 100) {
                candidates.push(Math.max(0, absTop - 90));
              }
            }
            candidates.sort((a, b) => a - b);

            const pickLandmarkNear = (targetFrac: number): number => {
              const ideal = maxScroll * targetFrac;
              let best = ideal;
              let bestDist = Infinity;
              for (const c of candidates) {
                const dist = Math.abs(c - ideal);
                if (dist < bestDist && dist < maxScroll * 0.16) {
                  best = c;
                  bestDist = dist;
                }
              }
              return Math.max(0, Math.min(maxScroll, Math.round(best)));
            };

            const shotStarts = maxScroll > 600
              ? [
                  0,
                  pickLandmarkNear(0.30),
                  pickLandmarkNear(0.60),
                  pickLandmarkNear(0.84),
                ]
              : [0, Math.round(maxScroll * 0.25), Math.round(maxScroll * 0.5), Math.round(maxScroll * 0.75)];

            const shotCount = 4;
            const shotDuration = Math.max(950, Math.floor(totalDuration / shotCount));
            const panDistance = Math.min(340, Math.max(140, Math.round(maxScroll * 0.12)));

            for (let s = 0; s < shotCount; s++) {
              const startY = shotStarts[s];
              const endY = Math.min(maxScroll, startY + panDistance);
              window.scrollTo(0, startY);

              const shotStartTs = performance.now();
              await new Promise<void>((resolve) => {
                function step(now: number) {
                  const elapsed = now - shotStartTs;
                  const progress = Math.min(1, elapsed / shotDuration);
                  const ease =
                    progress < 0.5
                      ? 4 * progress * progress * progress
                      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                  window.scrollTo(0, startY + ease * (endY - startY));
                  if (progress < 1) {
                    requestAnimationFrame(step);
                  } else {
                    resolve();
                  }
                }
                requestAnimationFrame(step);
              });
            }
          },
          { totalDuration: durationMs }
        );

        // Small pause at final shot
        await page.waitForTimeout(200);

        // Close page and context so Playwright finalizes the video file
        const video = page.video();
        await page.close();
        page = null;
        await context.close();
        context = null;

        if (!video) {
          throw new Error('Video recording failed to initialize');
        }

        const videoPath = await video.path();
        const trimmedPath = path.join(tmpDir, 'trimmed-shots.webm');

        // Trim page-load/pre-warm phase and inject frequent keyframes (-g 4) so per-slide seeking is instant
        await new Promise<void>((resolve) => {
          execFile(
            'ffmpeg',
            [
              '-y',
              '-ss',
              trimStartSec.toFixed(2),
              '-i',
              videoPath,
              '-c:v',
              'libvpx',
              '-b:v',
              '2.5M',
              '-crf',
              '18',
              '-g',
              '4',
              '-keyint_min',
              '4',
              '-deadline',
              'realtime',
              '-cpu-used',
              '6',
              '-an',
              trimmedPath,
            ],
            { timeout: 12000 },
            (err) => {
              if (err) {
                console.warn('[BrowserService] FFmpeg trim skipped, falling back to raw WebM:', err.message);
              }
              resolve();
            }
          );
        });

        const finalPath = await fs
          .stat(trimmedPath)
          .then((st) => (st.size > 1000 ? trimmedPath : videoPath))
          .catch(() => videoPath);

        const buffer = await fs.readFile(finalPath);
        return buffer;
      } finally {
        if (page) await (page as Page).close().catch(() => {});
        if (context) await (context as BrowserContext).close().catch(() => {});
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  }

  public async renderPdf(params: RenderPdfRequest): Promise<Buffer> {
    const shouldBlockPopups = Boolean(params.block_popups && params.url);
    return this.executeWithTimeout(
      async (_context, page) => {
        if (params.url) {
          await page.goto(params.url, {
            waitUntil: 'load',
            timeout: env.RENDER_TIMEOUT_MS,
          });
          if (shouldBlockPopups) {
            await this.suppressPopupsAndBanners(page);
          }
        } else if (params.html) {
          const fullHtml = this.prepareHtmlWithTailwind(params.html);
          await page.setContent(fullHtml, {
            waitUntil: 'load',
            timeout: env.RENDER_TIMEOUT_MS,
          });
        } else {
          throw new Error('Either "html" or "url" must be provided');
        }

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

        if (shouldBlockPopups) {
          await this.suppressPopupsAndBanners(page);
        }

        if (params.smart_pagination !== false) {
          await this.applySmartPagination(page);
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
      { width: 1200, height: 800 },
      shouldBlockPopups
    );
  }

  public async renderImage(params: RenderImageRequest): Promise<Buffer> {
    const shouldBlockPopups = Boolean(params.block_popups !== false && params.url);
    return this.executeWithTimeout(
      async (_context, page) => {
        if (params.url) {
          await page.goto(params.url, {
            waitUntil: 'load',
            timeout: env.RENDER_TIMEOUT_MS,
          });
          if (shouldBlockPopups) {
            await this.suppressPopupsAndBanners(page);
          }
        } else if (params.html) {
          const fullHtml = this.prepareHtmlWithTailwind(params.html);
          await page.setContent(fullHtml, {
            waitUntil: 'load',
            timeout: env.RENDER_TIMEOUT_MS,
          });
        } else {
          throw new Error('Either "html" or "url" must be provided');
        }

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

        if (shouldBlockPopups) {
          await this.suppressPopupsAndBanners(page);
        }

        const imageBuffer = await page.screenshot({
          type: params.type,
          fullPage: false,
        });

        return imageBuffer;
      },
      { width: params.width || 1200, height: params.height || 630 },
      shouldBlockPopups
    );
  }
}

export const browserService = BrowserService.getInstance();
