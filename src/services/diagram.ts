import { browserService } from './browser.js';

export interface RenderMermaidOptions {
  code: string;
  theme?: 'dark' | 'forest' | 'neutral' | 'default' | 'base';
  outputFormat?: 'png' | 'pdf' | 'svg';
  title?: string;
  background?: string;
  width?: number;
  height?: number;
}

export interface RenderMermaidResult {
  buffer: Buffer;
  contentType: 'image/png' | 'application/pdf' | 'image/svg+xml';
  svgString?: string;
  width?: number;
  height?: number;
}

export class DiagramService {
  private static instance: DiagramService | null = null;

  public static getInstance(): DiagramService {
    if (!DiagramService.instance) {
      DiagramService.instance = new DiagramService();
    }
    return DiagramService.instance;
  }

  /**
   * Renders Mermaid diagram code into vector SVG, high-resolution PNG, or vector PDF.
   */
  public async renderMermaid(options: RenderMermaidOptions): Promise<RenderMermaidResult> {
    const {
      code,
      theme = 'dark',
      outputFormat = 'png',
      title,
      background,
      width = 1200,
      height = 800,
    } = options;

    const isDark = theme === 'dark' || theme === 'base';
    const bgCss = background
      ? background
      : isDark
        ? '#0b0f19'
        : '#ffffff';

    const titleHtml = title
      ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: ${isDark ? '#e2e8f0' : '#1e293b'}; margin-bottom: 24px; text-align: center;">${title}</div>`
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: ${bgCss};
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #diagram {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    svg {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  ${titleHtml}
  <div id="diagram" class="mermaid">
${code}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${theme}',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
  </script>
</body>
</html>`;

    if (outputFormat === 'svg') {
      return browserService.executeTask(async (_context, page) => {
        await page.setContent(htmlContent, { waitUntil: 'load', timeout: 10000 });
        await page.waitForSelector('#diagram svg', { timeout: 7000 });
        const svgString = await page.$eval('#diagram svg', (el) => el.outerHTML);
        return {
          buffer: Buffer.from(svgString, 'utf-8'),
          contentType: 'image/svg+xml',
          svgString,
        };
      }, { width, height });
    }

    if (outputFormat === 'pdf') {
      const pdfBuffer = await browserService.renderPdf({
        html: htmlContent,
        format: 'A4',
        landscape: true,
        print_background: true,
        wait_for: '#diagram svg',
      });
      return {
        buffer: pdfBuffer,
        contentType: 'application/pdf',
      };
    }

    // Default: PNG
    const pngBuffer = await browserService.renderImage({
      html: htmlContent,
      type: 'png',
      width,
      height,
      wait_for: '#diagram svg',
    });

    return {
      buffer: pngBuffer,
      contentType: 'image/png',
      width,
      height,
    };
  }
}

export const diagramService = DiagramService.getInstance();
