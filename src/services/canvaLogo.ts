import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { env } from '../config/env.js';

export interface LogoVectorLayer {
  id: string;
  name: string;
  color: string;
  pathData: string;
  areaRatio: number;
}

export interface CanvaLogoState {
  brandName: string;
  tagline: string;
  fontFamily: string;
  uppercase: boolean;
  letterSpacingEm: number;
  layout: 'stacked' | 'horizontal' | 'icon-only';
  backgroundColor: string;
  transparentBg: boolean;
  textColor: string;
  taglineColor: string;
  layers: LogoVectorLayer[];
  viewBoxSize: number;
}

export interface CanvaLogoResult {
  state: CanvaLogoState;
  iconSvg: string;
  combinedSvg: string;
  iconSvgUrl: string;
  combinedSvgUrl: string;
  canvaPdfUrl: string;
  canvaPdfDownloadUrl: string;
}

interface GeminiLogoAnalysis {
  brandName: string;
  tagline: string;
  fontFamily: string;
  uppercase: boolean;
  letterSpacingEm: number;
  layout: 'stacked' | 'horizontal' | 'icon-only';
  backgroundColor: string;
  textColor: string;
  taglineColor: string;
  palette: string[];
  hasText: boolean;
  textBox?: { ymin: number; xmin: number; ymax: number; xmax: number };
  iconBox?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

export class CanvaLogoService {
  private static instance: CanvaLogoService;

  private constructor() {}

  public static getInstance(): CanvaLogoService {
    if (!CanvaLogoService.instance) {
      CanvaLogoService.instance = new CanvaLogoService();
    }
    return CanvaLogoService.instance;
  }

  /**
   * Analyzes an uploaded AI logo image using Gemini 3.8 Flash Vision to extract
   * exact brand text, typography style, color palette, and text/icon bounding boxes.
   */
  public async analyzeLogoWithGemini(
    base64Data: string,
    mimeType: string
  ): Promise<GeminiLogoAnalysis> {
    const fallback: GeminiLogoAnalysis = {
      brandName: 'BRAND',
      tagline: 'DESIGN STUDIO',
      fontFamily: 'Montserrat',
      uppercase: true,
      letterSpacingEm: 0.08,
      layout: 'stacked',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      taglineColor: '#94a3b8',
      palette: ['#6366f1', '#38bdf8', '#f43f5e'],
      hasText: false,
    };

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return fallback;
    }

    const prompt = `Analyze this logo image so we can convert it into a 100% editable multi-layer Canva vector file with separated editable text.
Return ONLY a valid JSON object with this exact schema:
{
  "brandName": "Exact main brand name text visible in the logo, or empty string if no text",
  "tagline": "Exact smaller tagline/subtitle text visible in the logo, or empty string if none",
  "fontFamily": "Choose the closest Google Font from: 'Montserrat', 'Space Grotesk', 'Outfit', 'Playfair Display', 'Plus Jakarta Sans', 'Cinzel', 'JetBrains Mono'",
  "uppercase": true,
  "letterSpacingEm": 0.08,
  "layout": "Choose from: 'stacked' (icon above text), 'horizontal' (icon left of text), or 'icon-only'",
  "backgroundColor": "#HEX color of the outer background",
  "textColor": "#HEX color of the main brandName text",
  "taglineColor": "#HEX color of the tagline text",
  "palette": ["#HEX1", "#HEX2", "#HEX3"],
  "hasText": true,
  "textBox": { "ymin": 680, "xmin": 100, "ymax": 920, "xmax": 900 },
  "iconBox": { "ymin": 80, "xmin": 200, "ymax": 650, "xmax": 800 }
}
Rules:
- "palette" must contain 2 to 5 distinct #RRGGBB hex colors used in the graphic logo mark (excluding the background color).
- "textBox" and "iconBox" use normalized 0 to 1000 coordinates (0=top/left, 1000=bottom/right).
- Make sure "textBox" tightly encloses ALL text in the image so we can mask out the raster text and replace it with real editable Canva text.
- Make sure "iconBox" tightly encloses ONLY the graphic symbol/icon (excluding the text below or beside it). If there is no text, set "hasText": false and "iconBox" to cover the whole logo mark.`;

    const modelName = 'gemini-3.8-flash';
    const endpoints = [
      `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/png',
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(18000),
        });

        if (!res.ok) continue;
        const data = (await res.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          brandName: typeof parsed.brandName === 'string' ? parsed.brandName.trim() : '',
          tagline: typeof parsed.tagline === 'string' ? parsed.tagline.trim() : '',
          fontFamily: parsed.fontFamily || 'Montserrat',
          uppercase: parsed.uppercase !== false,
          letterSpacingEm: typeof parsed.letterSpacingEm === 'number' ? parsed.letterSpacingEm : 0.08,
          layout: ['stacked', 'horizontal', 'icon-only'].includes(parsed.layout)
            ? parsed.layout
            : parsed.brandName
              ? 'stacked'
              : 'icon-only',
          backgroundColor: /^#[0-9a-fA-F]{6}$/.test(parsed.backgroundColor) ? parsed.backgroundColor : '#0f172a',
          textColor: /^#[0-9a-fA-F]{6}$/.test(parsed.textColor) ? parsed.textColor : '#ffffff',
          taglineColor: /^#[0-9a-fA-F]{6}$/.test(parsed.taglineColor) ? parsed.taglineColor : '#94a3b8',
          palette: Array.isArray(parsed.palette) && parsed.palette.length > 0
            ? parsed.palette.filter((c: any) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 6)
            : fallback.palette,
          hasText: Boolean(parsed.hasText && parsed.brandName),
          textBox: parsed.textBox,
          iconBox: parsed.iconBox,
        };
      } catch (err) {
        console.warn('[CanvaLogoService] Gemini vision attempt failed:', err);
      }
    }

    return fallback;
  }

  /**
   * Traces a raster image into smooth, multi-color Bezier SVG vector layers (<path fill="#HEX">),
   * automatically removing the background and masking out baked-in raster text when requested.
   */
  public async traceImageToVectorLayers(options: {
    imageDataUrl: string;
    maxColors?: number;
    separateText?: boolean;
    analysis: GeminiLogoAnalysis;
  }): Promise<{ layers: LogoVectorLayer[]; detectedBgHex: string }> {
    const maxColors = Math.max(2, Math.min(6, Number(options.maxColors) || 4));
    const separateText = options.separateText !== false;

    return browserService.executeTask(async (context) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 600, height: 600 });
      await page.setContent(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);

      const result = await page.evaluate(
        async ({ dataUrl, numColors, maskText, meta }) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Could not decode uploaded logo image'));
            img.src = dataUrl;
          });

          const W = 360;
          const H = 360;
          const canvas = document.getElementById('c') as HTMLCanvasElement;
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext('2d')!;

          // Determine crop box: if separateText is active and iconBox is valid, focus on the iconBox
          let sx = 0;
          let sy = 0;
          let sw = img.naturalWidth || img.width;
          let sh = img.naturalHeight || img.height;

          if (maskText && meta.hasText && meta.iconBox) {
            const ib = meta.iconBox;
            const pad = 35; // 3.5% breathing room around icon
            const xmin = Math.max(0, (ib.xmin - pad) / 1000);
            const ymin = Math.max(0, (ib.ymin - pad) / 1000);
            const xmax = Math.min(1, (ib.xmax + pad) / 1000);
            const ymax = Math.min(1, (ib.ymax + pad) / 1000);
            if (xmax - xmin > 0.12 && ymax - ymin > 0.12) {
              sx = Math.round(xmin * sw);
              sy = Math.round(ymin * sh);
              sw = Math.round((xmax - xmin) * sw);
              sh = Math.round((ymax - ymin) * sh);
            }
          }

          // Sample corner pixels from full image first to detect background color accurately
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = 200;
          fullCanvas.height = 200;
          const fctx = fullCanvas.getContext('2d')!;
          fctx.drawImage(img, 0, 0, 200, 200);
          const fullData = fctx.getImageData(0, 0, 200, 200).data;

          const cornerCoords = [
            [2, 2], [197, 2], [2, 197], [197, 197],
            [100, 2], [2, 100], [197, 100], [100, 197],
          ];
          let bgR = 0, bgG = 0, bgB = 0, bgA = 0, cornerSamples = 0;
          for (const [cx, cy] of cornerCoords) {
            const idx = (cy * 200 + cx) * 4;
            bgR += fullData[idx];
            bgG += fullData[idx + 1];
            bgB += fullData[idx + 2];
            bgA += fullData[idx + 3];
            cornerSamples++;
          }
          bgR = Math.round(bgR / cornerSamples);
          bgG = Math.round(bgG / cornerSamples);
          bgB = Math.round(bgB / cornerSamples);
          bgA = Math.round(bgA / cornerSamples);

          const toHex = (r: number, g: number, b: number) =>
            '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

          const detectedBgHex = bgA < 100 ? (meta.backgroundColor || '#0f172a') : toHex(bgR, bgG, bgB);

          // Draw cropped icon into centered 360x360 canvas with 28px padding
          ctx.clearRect(0, 0, W, H);
          const padPx = 28;
          const availW = W - padPx * 2;
          const availH = H - padPx * 2;
          const scale = Math.min(availW / sw, availH / sh);
          const drawW = Math.round(sw * scale);
          const drawH = Math.round(sh * scale);
          const dx = Math.round((W - drawW) / 2);
          const dy = Math.round((H - drawH) / 2);
          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, drawW, drawH);

          // If textBox overlaps our cropped region and maskText is true, clear that overlap
          if (maskText && meta.hasText && meta.textBox) {
            const tb = meta.textBox;
            const fullW = img.naturalWidth || img.width;
            const fullH = img.naturalHeight || img.height;
            const tx1 = (tb.xmin / 1000) * fullW;
            const ty1 = (tb.ymin / 1000) * fullH;
            const tx2 = (tb.xmax / 1000) * fullW;
            const ty2 = (tb.ymax / 1000) * fullH;

            // Map to canvas coordinates
            const cx1 = dx + ((tx1 - sx) / sw) * drawW;
            const cy1 = dy + ((ty1 - sy) / sh) * drawH;
            const cw = ((tx2 - tx1) / sw) * drawW;
            const ch = ((ty2 - ty1) / sh) * drawH;
            if (cw > 0 && ch > 0) {
              ctx.clearRect(cx1 - 4, cy1 - 4, cw + 8, ch + 8);
            }
          }

          const imgData = ctx.getImageData(0, 0, W, H);
          const data = imgData.data;
          const totalPixels = W * H;

          // Step 1: Identify foreground vs background pixels
          const isFg = new Uint8Array(totalPixels);
          const fgPixels: number[] = [];
          const bgDistThreshold = 42; // Euclidean RGB distance threshold from background

          for (let i = 0; i < totalPixels; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const a = data[i * 4 + 3];

            if (a < 95) {
              isFg[i] = 0;
              continue;
            }
            if (bgA >= 100) {
              const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
              if (dist < bgDistThreshold) {
                isFg[i] = 0;
                continue;
              }
            }
            isFg[i] = 1;
            fgPixels.push(i);
          }

          // Fallback if nearly empty (e.g. very low contrast logo): relax threshold
          if (fgPixels.length < totalPixels * 0.01) {
            fgPixels.length = 0;
            for (let i = 0; i < totalPixels; i++) {
              const r = data[i * 4];
              const g = data[i * 4 + 1];
              const b = data[i * 4 + 2];
              const a = data[i * 4 + 3];
              if (a >= 50 && Math.hypot(r - bgR, g - bgG, b - bgB) >= 18) {
                isFg[i] = 1;
                fgPixels.push(i);
              }
            }
          }

          // Step 2: K-Means Color Quantization on Foreground Pixels
          const hexToRgb = (hex: string): [number, number, number] => {
            const clean = hex.replace('#', '');
            return [
              parseInt(clean.slice(0, 2), 16) || 0,
              parseInt(clean.slice(2, 4), 16) || 0,
              parseInt(clean.slice(4, 6), 16) || 0,
            ];
          };

          const centroids: [number, number, number][] = [];
          if (Array.isArray(meta.palette)) {
            for (const hex of meta.palette.slice(0, numColors)) {
              const rgb = hexToRgb(hex);
              if (Math.hypot(rgb[0] - bgR, rgb[1] - bgG, rgb[2] - bgB) > 25) {
                centroids.push(rgb);
              }
            }
          }

          // Fill remaining centroids by farthest-point sampling from foreground pixels
          while (centroids.length < numColors && fgPixels.length > 0) {
            if (centroids.length === 0) {
              const p = fgPixels[Math.floor(fgPixels.length / 2)];
              centroids.push([data[p * 4], data[p * 4 + 1], data[p * 4 + 2]]);
            } else {
              let bestPx = fgPixels[0];
              let bestMinDist = -1;
              const step = Math.max(1, Math.floor(fgPixels.length / 400));
              for (let j = 0; j < fgPixels.length; j += step) {
                const p = fgPixels[j];
                const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
                let minD = Infinity;
                for (const c of centroids) {
                  const d = Math.hypot(r - c[0], g - c[1], b - c[2]);
                  if (d < minD) minD = d;
                }
                if (minD > bestMinDist) {
                  bestMinDist = minD;
                  bestPx = p;
                }
              }
              if (bestMinDist < 22) break; // No more distinct colors needed
              centroids.push([data[bestPx * 4], data[bestPx * 4 + 1], data[bestPx * 4 + 2]]);
            }
          }

          const K = Math.max(1, centroids.length);
          const labels = new Int16Array(totalPixels).fill(-1);

          // Run 8 iterations of K-Means
          for (let iter = 0; iter < 8; iter++) {
            const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
            for (let j = 0; j < fgPixels.length; j++) {
              const i = fgPixels[j];
              const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
              let bestK = 0;
              let bestD = Infinity;
              for (let k = 0; k < K; k++) {
                const c = centroids[k];
                const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
                if (d < bestD) {
                  bestD = d;
                  bestK = k;
                }
              }
              labels[i] = bestK;
              sums[bestK][0] += r;
              sums[bestK][1] += g;
              sums[bestK][2] += b;
              sums[bestK][3] += 1;
            }
            for (let k = 0; k < K; k++) {
              if (sums[k][3] > 0) {
                centroids[k] = [
                  sums[k][0] / sums[k][3],
                  sums[k][1] / sums[k][3],
                  sums[k][2] / sums[k][3],
                ];
              }
            }
          }

          // Merge centroids that converged to within RGB distance < 28
          const mergedMap = new Int16Array(K);
          const finalCentroids: [number, number, number][] = [];
          for (let k = 0; k < K; k++) {
            let foundIdx = -1;
            for (let m = 0; m < finalCentroids.length; m++) {
              const fc = finalCentroids[m];
              if (Math.hypot(centroids[k][0] - fc[0], centroids[k][1] - fc[1], centroids[k][2] - fc[2]) < 28) {
                foundIdx = m;
                break;
              }
            }
            if (foundIdx >= 0) {
              mergedMap[k] = foundIdx;
            } else {
              mergedMap[k] = finalCentroids.length;
              finalCentroids.push(centroids[k]);
            }
          }
          for (let i = 0; i < totalPixels; i++) {
            if (labels[i] >= 0) labels[i] = mergedMap[labels[i]];
          }

          // Step 3: 3x3 Morphological Majority Filter (removes 1px anti-aliasing halos)
          const smoothed = new Int16Array(labels);
          for (let pass = 0; pass < 2; pass++) {
            const src = pass === 0 ? labels : smoothed;
            for (let y = 1; y < H - 1; y++) {
              for (let x = 1; x < W - 1; x++) {
                const idx = y * W + x;
                const counts = new Map<number, number>();
                let bestLbl = src[idx];
                let maxC = 0;
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const lbl = src[(y + dy) * W + (x + dx)];
                    const c = (counts.get(lbl) || 0) + 1;
                    counts.set(lbl, c);
                    if (c > maxC) {
                      maxC = c;
                      bestLbl = lbl;
                    }
                  }
                }
                if (maxC >= 5) smoothed[idx] = bestLbl;
              }
            }
          }

          // Step 4: Boundary Contour Tracing + Smooth Bezier Curve Fitting per Color Layer
          // Scale coordinates from 360x360 to 500x500 viewBox
          const scaleOut = 500 / W;

          function traceLayerBoundaryLoops(layerIdx: number): string {
            // Build binary grid with 1px padding
            const gw = W + 2;
            const gh = H + 2;
            const grid = new Uint8Array(gw * gh);
            let pixelCount = 0;
            for (let y = 0; y < H; y++) {
              for (let x = 0; x < W; x++) {
                if (smoothed[y * W + x] === layerIdx) {
                  grid[(y + 1) * gw + (x + 1)] = 1;
                  pixelCount++;
                }
              }
            }
            if (pixelCount < 16) return '';

            // Collect directed boundary edges between 0 and 1 cells
            // Each pixel (x,y) in grid occupies [x, x+1] x [y, y+1]
            // Directed edges keep the filled pixel on their right-hand side (clockwise outer, CCW hole)
            const nextEdgeMap = new Map<number, number[]>();
            const encodePt = (x: number, y: number) => (y << 10) | x;
            const decodePt = (code: number): [number, number] => [code & 0x3ff, code >> 10];
            const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
              const k1 = encodePt(x1, y1);
              const k2 = encodePt(x2, y2);
              const arr = nextEdgeMap.get(k1);
              if (arr) arr.push(k2);
              else nextEdgeMap.set(k1, [k2]);
            };

            for (let y = 1; y <= H; y++) {
              for (let x = 1; x <= W; x++) {
                if (!grid[y * gw + x]) continue;
                // Top edge: (x, y) -> (x+1, y)
                if (!grid[(y - 1) * gw + x]) addEdge(x - 1, y - 1, x, y - 1);
                // Right edge: (x+1, y) -> (x+1, y+1)
                if (!grid[y * gw + (x + 1)]) addEdge(x, y - 1, x, y);
                // Bottom edge: (x+1, y+1) -> (x, y+1)
                if (!grid[(y + 1) * gw + x]) addEdge(x, y, x - 1, y);
                // Left edge: (x, y+1) -> (x, y)
                if (!grid[y * gw + (x - 1)]) addEdge(x - 1, y, x - 1, y - 1);
              }
            }

            // Stitch directed edges into closed loops
            const loops: [number, number][][] = [];
            for (const [startKey, neighbors] of nextEdgeMap.entries()) {
              while (neighbors.length > 0) {
                const loop: [number, number][] = [];
                let curr = startKey;
                let safety = 0;
                while (safety++ < 25000) {
                  loop.push(decodePt(curr));
                  const nbrs = nextEdgeMap.get(curr);
                  if (!nbrs || nbrs.length === 0) break;
                  const next = nbrs.pop()!;
                  if (next === startKey) break;
                  curr = next;
                }
                if (loop.length >= 8) {
                  loops.push(loop);
                }
              }
            }

            // Ramer-Douglas-Peucker simplification
            function simplifyRdp(pts: [number, number][], eps: number): [number, number][] {
              if (pts.length <= 3) return pts;
              let maxDist = 0;
              let index = 0;
              const [x1, y1] = pts[0];
              const [x2, y2] = pts[pts.length - 1];
              const dx = x2 - x1;
              const dy = y2 - y1;
              const lenSq = dx * dx + dy * dy;

              for (let i = 1; i < pts.length - 1; i++) {
                const [px, py] = pts[i];
                let d = 0;
                if (lenSq === 0) {
                  d = Math.hypot(px - x1, py - y1);
                } else {
                  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
                  d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
                }
                if (d > maxDist) {
                  maxDist = d;
                  index = i;
                }
              }

              if (maxDist > eps) {
                const left = simplifyRdp(pts.slice(0, index + 1), eps);
                const right = simplifyRdp(pts.slice(index), eps);
                return left.slice(0, -1).concat(right);
              }
              return [pts[0], pts[pts.length - 1]];
            }

            // Convert each loop into smooth Quadratic Bezier SVG path commands
            const pathParts: string[] = [];
            for (const rawLoop of loops) {
              // 1. Moving average smoothing of staircase pixels
              const n = rawLoop.length;
              const smoothedPts: [number, number][] = [];
              for (let i = 0; i < n; i++) {
                const pPrev = rawLoop[(i - 1 + n) % n];
                const pCurr = rawLoop[i];
                const pNext = rawLoop[(i + 1) % n];
                smoothedPts.push([
                  (pPrev[0] + pCurr[0] * 2 + pNext[0]) * 0.25 * scaleOut,
                  (pPrev[1] + pCurr[1] * 2 + pNext[1]) * 0.25 * scaleOut,
                ]);
              }

              // 2. Simplify closed loop via RDP (split at midpoint)
              const mid = Math.floor(smoothedPts.length / 2);
              const half1 = simplifyRdp(smoothedPts.slice(0, mid + 1), 1.05);
              const half2 = simplifyRdp(smoothedPts.slice(mid).concat([smoothedPts[0]]), 1.05);
              const pts = half1.slice(0, -1).concat(half2.slice(0, -1));
              if (pts.length < 3) continue;

              const m = pts.length;
              const isCorner = ( idx: number ): boolean => {
                const p0 = pts[(idx - 1 + m) % m];
                const p1 = pts[idx];
                const p2 = pts[(idx + 1) % m];
                const v1x = p1[0] - p0[0], v1y = p1[1] - p0[1];
                const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
                const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
                if (l1 < 0.001 || l2 < 0.001) return false;
                const cos = (v1x * v2x + v1y * v2y) / (l1 * l2);
                return cos < 0.45; // Angle sharper than ~63 deg -> preserve crisp corner
              };

              const fmt = (v: number) => Number(v.toFixed(1));
              const startMid: [number, number] = isCorner(0)
                ? pts[0]
                : [(pts[m - 1][0] + pts[0][0]) / 2, (pts[m - 1][1] + pts[0][1]) / 2];

              let d = `M ${fmt(startMid[0])} ${fmt(startMid[1])}`;
              for (let i = 0; i < m; i++) {
                const curr = pts[i];
                const next = pts[(i + 1) % m];
                if (isCorner(i)) {
                  d += ` L ${fmt(curr[0])} ${fmt(curr[1])}`;
                  if (!isCorner((i + 1) % m)) {
                    const midPt: [number, number] = [(curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2];
                    d += ` L ${fmt(midPt[0])} ${fmt(midPt[1])}`;
                  }
                } else {
                  const endPt: [number, number] = isCorner((i + 1) % m)
                    ? next
                    : [(curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2];
                  d += ` Q ${fmt(curr[0])} ${fmt(curr[1])} ${fmt(endPt[0])} ${fmt(endPt[1])}`;
                }
              }
              d += ' Z';
              pathParts.push(d);
            }

            return pathParts.join(' ');
          }

          const layersOut: {
            id: string;
            name: string;
            color: string;
            pathData: string;
            areaRatio: number;
          }[] = [];

          for (let k = 0; k < finalCentroids.length; k++) {
            const pathData = traceLayerBoundaryLoops(k);
            if (!pathData) continue;
            let count = 0;
            for (let i = 0; i < totalPixels; i++) {
              if (smoothed[i] === k) count++;
            }
            const [r, g, b] = finalCentroids[k];
            const hex = toHex(r, g, b);
            layersOut.push({
              id: `layer_${k + 1}`,
              name: `Farvelag ${k + 1}`,
              color: hex,
              pathData,
              areaRatio: Number((count / totalPixels).toFixed(4)),
            });
          }

          // Sort largest area first (back-to-front painter's order)
          layersOut.sort((a, b) => b.areaRatio - a.areaRatio);
          layersOut.forEach((l, idx) => {
            l.id = `layer_${idx + 1}`;
            l.name = `Farvelag ${idx + 1}`;
          });

          return { layers: layersOut, detectedBgHex };
        },
        {
          dataUrl: options.imageDataUrl,
          numColors: maxColors,
          maskText: separateText,
          meta: options.analysis,
        }
      );

      return result;
    });
  }

  /**
   * Builds a clean Canva-compatible SVG string (only explicit inline fill="#HEX" <path> elements)
   */
  public buildCanvaIconSvg(state: CanvaLogoState): string {
    const size = state.viewBoxSize || 500;
    const bgRect = !state.transparentBg && state.backgroundColor
      ? `  <rect width="${size}" height="${size}" rx="48" fill="${state.backgroundColor}" />\n`
      : '';
    const paths = state.layers
      .map(
        (layer) =>
          `  <path id="${layer.id}" fill="${layer.color}" fill-rule="evenodd" d="${layer.pathData}" />`
      )
      .join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="1000" height="1000">\n${bgRect}${paths}\n</svg>`;
  }

  /**
   * Builds a complete SVG containing both the vectorized icon paths and the brand typography
   */
  public buildCombinedSvg(state: CanvaLogoState): string {
    const hasBrand = Boolean(state.brandName && state.brandName.trim());
    if (!hasBrand || state.layout === 'icon-only') {
      return this.buildCanvaIconSvg(state);
    }

    const escapeXml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const displayBrand = state.uppercase ? state.brandName.toUpperCase() : state.brandName;
    const displayTag = state.tagline ? (state.uppercase ? state.tagline.toUpperCase() : state.tagline) : '';
    const letterSpacingPx = Math.round((state.letterSpacingEm || 0.08) * 64);

    if (state.layout === 'horizontal') {
      const W = 1200;
      const H = 500;
      const bgRect = !state.transparentBg && state.backgroundColor
        ? `  <rect width="${W}" height="${H}" rx="44" fill="${state.backgroundColor}" />\n`
        : '';
      const paths = state.layers
        .map((l) => `    <path fill="${l.color}" fill-rule="evenodd" d="${l.pathData}" />`)
        .join('\n');

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${bgRect}  <g transform="translate(40, 25) scale(0.9)">
${paths}
  </g>
  <text x="520" y="${displayTag ? 235 : 270}" fill="${state.textColor || '#ffffff'}" font-family="${escapeXml(state.fontFamily || 'Montserrat')}, sans-serif" font-size="76" font-weight="800" letter-spacing="${letterSpacingPx}">${escapeXml(displayBrand)}</text>
${displayTag ? `  <text x="524" y="305" fill="${state.taglineColor || '#94a3b8'}" font-family="${escapeXml(state.fontFamily || 'Montserrat')}, sans-serif" font-size="28" font-weight="600" letter-spacing="${Math.round(letterSpacingPx * 1.4)}">${escapeXml(displayTag)}</text>` : ''}
</svg>`;
    }

    // Default: 'stacked'
    const W = 800;
    const H = 900;
    const bgRect = !state.transparentBg && state.backgroundColor
      ? `  <rect width="${W}" height="${H}" rx="56" fill="${state.backgroundColor}" />\n`
      : '';
    const paths = state.layers
      .map((l) => `    <path fill="${l.color}" fill-rule="evenodd" d="${l.pathData}" />`)
      .join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${bgRect}  <g transform="translate(150, 50)">
${paths}
  </g>
  <text x="${W / 2}" y="660" text-anchor="middle" fill="${state.textColor || '#ffffff'}" font-family="${escapeXml(state.fontFamily || 'Montserrat')}, sans-serif" font-size="74" font-weight="800" letter-spacing="${letterSpacingPx}">${escapeXml(displayBrand)}</text>
${displayTag ? `  <text x="${W / 2}" y="730" text-anchor="middle" fill="${state.taglineColor || '#94a3b8'}" font-family="${escapeXml(state.fontFamily || 'Montserrat')}, sans-serif" font-size="28" font-weight="600" letter-spacing="${Math.round(letterSpacingPx * 1.5)}">${escapeXml(displayTag)}</text>` : ''}
</svg>`;
  }

  /**
   * Renders a 3-Page Canva-Editable Vector PDF (.pdf):
   * When imported into Canva, the SVG <path> elements become color-editable vector shapes,
   * and the HTML/PDF text elements become real, double-clickable editable Canva text boxes!
   */
  public async renderCanvaEditablePdf(state: CanvaLogoState): Promise<Buffer> {
    const escapeHtml = (s: string) =>
      (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fontName = state.fontFamily || 'Montserrat';
    const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@500;600;700;800;900&family=Inter:wght@500;600;700;800&display=swap`;
    const displayBrand = state.uppercase ? (state.brandName || '').toUpperCase() : (state.brandName || '');
    const displayTag = state.uppercase ? (state.tagline || '').toUpperCase() : (state.tagline || '');
    const bgHex = state.backgroundColor || '#0f172a';
    const textHex = state.textColor || '#ffffff';
    const tagHex = state.taglineColor || '#94a3b8';
    const letterSpacing = `${state.letterSpacingEm ?? 0.08}em`;

    const svgPathsHtml = state.layers
      .map((l) => `<path fill="${l.color}" fill-rule="evenodd" d="${l.pathData}" />`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontUrl}" rel="stylesheet">
  <style>
    @page {
      size: 1080px 1080px;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: '${fontName}', 'Inter', sans-serif;
      background: transparent;
    }
    .canva-page {
      width: 1080px;
      height: 1080px;
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .canva-page:last-child {
      page-break-after: auto;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: Primary Stacked Editable Logo (Vector Icon + Editable Text Boxes) -->
  <div class="canva-page" style="background-color: ${bgHex};">
    <div style="width: 520px; height: 520px; display: flex; align-items: center; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        ${svgPathsHtml}
      </svg>
    </div>
    ${
      displayBrand
        ? `<h1 style="margin-top: 32px; font-family: '${fontName}', sans-serif; font-size: 84px; font-weight: 800; color: ${textHex}; letter-spacing: ${letterSpacing}; text-align: center; line-height: 1.1;">${escapeHtml(displayBrand)}</h1>`
        : ''
    }
    ${
      displayTag
        ? `<p style="margin-top: 18px; font-family: '${fontName}', sans-serif; font-size: 30px; font-weight: 600; color: ${tagHex}; letter-spacing: 0.22em; text-align: center;">${escapeHtml(displayTag)}</p>`
        : ''
    }
  </div>

  <!-- PAGE 2: Horizontal Header / Website Banner Logo + Standalone Icon Variations -->
  <div class="canva-page" style="background-color: ${bgHex}; padding: 80px; justify-content: space-around;">
    <!-- Horizontal Lockup -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 48px; width: 100%; padding: 48px; border-radius: 36px; background-color: rgba(255,255,255,0.04);">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="240" height="240">
        ${svgPathsHtml}
      </svg>
      <div style="display: flex; flex-direction: column; justify-content: center;">
        <h2 style="font-family: '${fontName}', sans-serif; font-size: 68px; font-weight: 800; color: ${textHex}; letter-spacing: ${letterSpacing}; line-height: 1.1;">${escapeHtml(displayBrand || 'BRAND NAME')}</h2>
        <p style="margin-top: 12px; font-family: '${fontName}', sans-serif; font-size: 26px; font-weight: 600; color: ${tagHex}; letter-spacing: 0.2em;">${escapeHtml(displayTag || 'TAGLINE HERE')}</p>
      </div>
    </div>

    <!-- Brand Color Swatches & Icon Badges (All 100% Editable in Canva) -->
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 28px;">
      <!-- Light Badge -->
      <div style="width: 260px; height: 260px; border-radius: 48px; background-color: #ffffff; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="180" height="180">
          ${svgPathsHtml}
        </svg>
      </div>

      <!-- Dark Badge -->
      <div style="width: 260px; height: 260px; border-radius: 48px; background-color: #090d16; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="180" height="180">
          ${svgPathsHtml}
        </svg>
      </div>

      <!-- Editable Color Palette Swatches -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 16px; background-color: rgba(255,255,255,0.05); padding: 28px; border-radius: 36px;">
        <p style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: ${tagHex}; letter-spacing: 0.15em;">CANVA BRAND PALETTE</p>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          ${state.layers
            .map(
              (l) => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <rect width="72" height="72" rx="18" fill="${l.color}" />
              </svg>
              <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: ${textHex};">${l.color.toUpperCase()}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;

    return browserService.executeTask(async (context) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 1080, height: 1080 });
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const pdfBuf = await page.pdf({
        width: '1080px',
        height: '1080px',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });
      return Buffer.from(pdfBuf);
    });
  }

  /**
   * End-to-end conversion from an uploaded AI logo (base64/dataURL or remote URL)
   * into editable Canva vector layers + downloadable SVG & Editable Canva PDF.
   */
  public async convertLogoForCanva(options: {
    imageDataUrl?: string;
    imageUrl?: string;
    maxColors?: number;
    separateText?: boolean;
    customState?: Partial<CanvaLogoState>;
  }): Promise<CanvaLogoResult> {
    let dataUrl = options.imageDataUrl || '';
    let mimeType = 'image/png';
    let rawBase64 = '';

    if (!dataUrl && options.imageUrl) {
      const res = await fetch(options.imageUrl, {
        headers: { 'User-Agent': 'Tailprint-CanvaLogo/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        throw new Error(`Could not fetch logo from URL (${res.status})`);
      }
      mimeType = res.headers.get('content-type') || 'image/png';
      const buf = Buffer.from(await res.arrayBuffer());
      rawBase64 = buf.toString('base64');
      dataUrl = `data:${mimeType};base64,${rawBase64}`;
    } else if (dataUrl.startsWith('data:')) {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        mimeType = m[1];
        rawBase64 = m[2];
      }
    } else if (dataUrl) {
      rawBase64 = dataUrl;
      dataUrl = `data:image/png;base64,${rawBase64}`;
    }

    let state: CanvaLogoState;

    if (options.customState && Array.isArray(options.customState.layers) && options.customState.layers.length > 0) {
      // Re-export using existing customized layers & typography from the studio
      state = {
        brandName: options.customState.brandName ?? '',
        tagline: options.customState.tagline ?? '',
        fontFamily: options.customState.fontFamily || 'Montserrat',
        uppercase: options.customState.uppercase !== false,
        letterSpacingEm: options.customState.letterSpacingEm ?? 0.08,
        layout: options.customState.layout || 'stacked',
        backgroundColor: options.customState.backgroundColor || '#0f172a',
        transparentBg: options.customState.transparentBg !== false,
        textColor: options.customState.textColor || '#ffffff',
        taglineColor: options.customState.taglineColor || '#94a3b8',
        layers: options.customState.layers,
        viewBoxSize: 500,
      };
    } else {
      if (!rawBase64) {
        throw new Error('Missing imageDataUrl or imageUrl for logo vectorization');
      }

      // 1. Analyze with Gemini 3.8 Flash Vision
      const analysis = await this.analyzeLogoWithGemini(rawBase64, mimeType);

      // 2. Trace raster image into multi-color Bezier SVG layers (and strip baked-in raster text)
      const traced = await this.traceImageToVectorLayers({
        imageDataUrl: dataUrl,
        maxColors: options.maxColors || 4,
        separateText: options.separateText !== false,
        analysis,
      });

      state = {
        brandName: options.customState?.brandName ?? analysis.brandName,
        tagline: options.customState?.tagline ?? analysis.tagline,
        fontFamily: options.customState?.fontFamily || analysis.fontFamily || 'Montserrat',
        uppercase: options.customState?.uppercase ?? analysis.uppercase,
        letterSpacingEm: options.customState?.letterSpacingEm ?? analysis.letterSpacingEm,
        layout: options.customState?.layout || analysis.layout || 'stacked',
        backgroundColor: options.customState?.backgroundColor || traced.detectedBgHex || analysis.backgroundColor || '#0f172a',
        transparentBg: options.customState?.transparentBg ?? true,
        textColor: options.customState?.textColor || analysis.textColor || '#ffffff',
        taglineColor: options.customState?.taglineColor || analysis.taglineColor || '#94a3b8',
        layers: traced.layers,
        viewBoxSize: 500,
      };
    }

    const iconSvg = this.buildCanvaIconSvg(state);
    const combinedSvg = this.buildCombinedSvg(state);
    const pdfBuffer = await this.renderCanvaEditablePdf(state);

    const safeSlug = (state.brandName || 'canva-logo').toLowerCase().replace(/[^a-z0-9]/g, '') || 'logo';

    const [iconStored, combinedStored, pdfStored] = await Promise.all([
      storageService.saveFile(Buffer.from(iconSvg, 'utf-8'), {
        mimeType: 'image/svg+xml',
        extension: 'svg',
        filename: `${safeSlug}-canva-icon.svg`,
      }),
      storageService.saveFile(Buffer.from(combinedSvg, 'utf-8'), {
        mimeType: 'image/svg+xml',
        extension: 'svg',
        filename: `${safeSlug}-canva-full.svg`,
      }),
      storageService.saveFile(pdfBuffer, {
        mimeType: 'application/pdf',
        extension: 'pdf',
        filename: `${safeSlug}-canva-editable.pdf`,
      }),
    ]);

    return {
      state,
      iconSvg,
      combinedSvg,
      iconSvgUrl: iconStored.hostedUrl,
      combinedSvgUrl: combinedStored.hostedUrl,
      canvaPdfUrl: pdfStored.hostedUrl,
      canvaPdfDownloadUrl: `${pdfStored.hostedUrl}?download=true`,
    };
  }

  /**
   * Generates a multi-layer vector logo concept directly from a text prompt using Gemini 3.8 Flash,
   * returning 100% Canva-editable vector layers, separated typography, SVG, and Editable Canva PDF.
   */
  public async generateAiLogoFromPrompt(promptText: string): Promise<CanvaLogoResult> {
    const apiKey = env.GEMINI_API_KEY;
    const defaultState: CanvaLogoState = {
      brandName: 'NORDIC AI',
      tagline: 'INTELLIGENT AUTOMATION',
      fontFamily: 'Space Grotesk',
      uppercase: true,
      letterSpacingEm: 0.1,
      layout: 'stacked',
      backgroundColor: '#0b0f19',
      transparentBg: true,
      textColor: '#ffffff',
      taglineColor: '#38bdf8',
      viewBoxSize: 500,
      layers: [
        {
          id: 'layer_1',
          name: 'Farvelag 1',
          color: '#4f46e5',
          pathData: 'M 250 55 L 420 152 L 420 348 L 250 445 L 80 348 L 80 152 Z M 250 115 L 135 182 L 135 318 L 250 385 L 365 318 L 365 182 Z',
          areaRatio: 0.35,
        },
        {
          id: 'layer_2',
          name: 'Farvelag 2',
          color: '#38bdf8',
          pathData: 'M 250 135 L 345 190 L 250 245 L 155 190 Z M 250 265 L 345 210 L 345 310 L 250 365 Z',
          areaRatio: 0.22,
        },
        {
          id: 'layer_3',
          name: 'Farvelag 3',
          color: '#f43f5e',
          pathData: 'M 155 210 L 235 256 L 235 356 L 155 310 Z',
          areaRatio: 0.12,
        },
      ],
    };

    if (apiKey && promptText.trim()) {
      const sysPrompt = `You are a master vector logo designer creating a multi-layer geometric logo for Canva in a 500x500 coordinate space (viewBox="0 0 500 500", center at 250,250).
User prompt: "${promptText.trim()}"

Return ONLY a valid JSON object matching this exact schema:
{
  "brandName": "SHORT BRAND NAME",
  "tagline": "SHORT TAGLINE OR INDUSTRY",
  "fontFamily": "Choose from: 'Montserrat', 'Space Grotesk', 'Outfit', 'Playfair Display', 'Plus Jakarta Sans', 'Cinzel'",
  "uppercase": true,
  "letterSpacingEm": 0.08,
  "layout": "stacked",
  "backgroundColor": "#0b0f19",
  "textColor": "#ffffff",
  "taglineColor": "#94a3b8",
  "layers": [
    {
      "id": "layer_1",
      "name": "Farvelag 1",
      "color": "#HEX1",
      "pathData": "Valid SVG <path d='...'> commands (M, L, C, Q, Z) inside 60..440 coordinate range"
    },
    {
      "id": "layer_2",
      "name": "Farvelag 2",
      "color": "#HEX2",
      "pathData": "Valid SVG <path d='...'> commands for secondary geometric accent/symbol"
    },
    {
      "id": "layer_3",
      "name": "Farvelag 3",
      "color": "#HEX3",
      "pathData": "Valid SVG <path d='...'> commands for center highlight/detail"
    }
  ]
}
Rules:
- Create 3 to 4 distinct, visually striking geometric vector layers that combine into a cohesive, modern professional logo mark centered at (250, 250).
- Do NOT put any text inside the SVG pathData (text is rendered as a separate editable layer).`;

      const modelName = 'gemini-3.8-flash';
      const endpoints = [
        `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
      ];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: sysPrompt }] }],
              generationConfig: {
                temperature: 0.35,
                responseMimeType: 'application/json',
              },
            }),
            signal: AbortSignal.timeout(18000),
          });
          if (!res.ok) continue;
          const data = (await res.json()) as any;
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) continue;
          const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed.layers) && parsed.layers.length > 0) {
            return this.convertLogoForCanva({
              customState: {
                brandName: parsed.brandName || defaultState.brandName,
                tagline: parsed.tagline ?? defaultState.tagline,
                fontFamily: parsed.fontFamily || 'Space Grotesk',
                uppercase: parsed.uppercase !== false,
                letterSpacingEm: typeof parsed.letterSpacingEm === 'number' ? parsed.letterSpacingEm : 0.08,
                layout: ['stacked', 'horizontal', 'icon-only'].includes(parsed.layout) ? parsed.layout : 'stacked',
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(parsed.backgroundColor) ? parsed.backgroundColor : '#0b0f19',
                transparentBg: true,
                textColor: /^#[0-9a-fA-F]{6}$/.test(parsed.textColor) ? parsed.textColor : '#ffffff',
                taglineColor: /^#[0-9a-fA-F]{6}$/.test(parsed.taglineColor) ? parsed.taglineColor : '#94a3b8',
                layers: parsed.layers.map((l: any, idx: number) => ({
                  id: `layer_${idx + 1}`,
                  name: l.name || `Farvelag ${idx + 1}`,
                  color: /^#[0-9a-fA-F]{6}$/.test(l.color) ? l.color : '#6366f1',
                  pathData: String(l.pathData || '').trim(),
                  areaRatio: Number((0.3 / (idx + 1)).toFixed(3)),
                })),
                viewBoxSize: 500,
              },
            });
          }
        } catch (err) {
          console.warn('[CanvaLogoService] AI Logo prompt generation fallback:', err);
        }
      }
    }

    return this.convertLogoForCanva({ customState: defaultState });
  }
}

export const canvaLogoService = CanvaLogoService.getInstance();
