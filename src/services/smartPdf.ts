import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';
import { env } from '../config/env.js';
import { redisService, type PdfProofRecord } from './redis.js';
import { parseDurationToMs, storageService } from './storage.js';
import type { ExtractedDomSynapse } from './browser.js';
import {
  neuralCortexService,
  NEURAL_CORTEX_CONTEXT,
  CORTEX_FILENAME,
  type TailprintNeuralCortex,
  type NeuralAskResponse,
} from './neuralCortex.js';

export const DUAL_BRAIN_CONTEXT = 'https://tailprint.com/schema/dual-brain/v1';
export const MANIFEST_FILENAME = 'tailprint-manifest.json';

export interface TailprintManifest {
  '@context': typeof DUAL_BRAIN_CONTEXT;
  schema_version: '1.0';
  doc_id: string;
  issued_at: string;
  issuer: string;
  template_id: string | null;
  ai_ready: boolean;
  signed: boolean;
  neural_implant?: boolean;
  cortex_hash?: string | null;
  brain_url?: string | null;
  isotope?: boolean;
  expires_at?: string | null;
  expire_mode?: 'replace_and_stamp' | 'replace_only' | 'lockout';
  expire_message?: string | null;
  max_reads?: number | null;
  decayed_elements_count?: number;
  encrypted_data?: string | null;
  expired_copy?: boolean;
  page_count: number;
  content_fingerprint: string;
  data_hash: string | null;
  data: Record<string, unknown> | null;
  verification_url: string;
  signature: string | null;
}

export interface SmartPdfEnrichOptions {
  customerId?: string;
  templateId?: string | null;
  data?: Record<string, unknown> | null;
  aiReady?: boolean;
  sign?: boolean;
  verifySeal?: boolean;
  verifyCustomUrl?: string;
  neuralImplant?: boolean;
  neuralPersona?: string;
  neuralContext?: Record<string, unknown> | string | null;
  neuralBadge?: boolean;
  neuralCustomUrl?: string;
  neuralBadgeLabel?: string;
  hasCustomNeuralButton?: boolean;
  hasCustomVerifyButton?: boolean;
  hasCustomExpireButton?: boolean;
  isotopeElementCount?: number;
  inferredIsotopeTtl?: string | null;
  isotope?: boolean;
  documentTtl?: string;
  expiresAt?: string;
  expireMode?: 'replace_and_stamp' | 'replace_only' | 'lockout';
  expireBadge?: boolean;
  expireMessage?: string;
  maxReads?: number;
  rawDecayedBuffer?: Buffer;
  domSynapses?: ExtractedDomSynapse[];
  noStore?: boolean;
}

export interface SmartPdfEnrichResult {
  buffer: Buffer;
  decayedBuffer?: Buffer;
  docId: string;
  manifest: TailprintManifest;
  cortex: TailprintNeuralCortex | null;
  fileSha256: string;
  isotope: boolean;
  expiresAt: string | null;
}

export interface SmartPdfVerificationReport {
  valid: boolean;
  signed: boolean;
  tampered: boolean;
  ai_ready: boolean;
  neural_implant: boolean;
  isotope?: boolean;
  expired?: boolean;
  revoked?: boolean;
  expires_at?: string | null;
  remaining_seconds?: number | null;
  reads_count?: number | null;
  max_reads?: number | null;
  expire_message?: string | null;
  doc_id: string | null;
  issued_at: string | null;
  issuer: string | null;
  template_id: string | null;
  page_count: number;
  file_sha256: string;
  content_fingerprint: string;
  signature_valid: boolean;
  content_intact: boolean;
  ledger_verified: boolean;
  verification_url: string | null;
  brain_url: string | null;
  cortex_hash: string | null;
  cortex_summary: {
    total_synapses: number;
    visual_synapses_count: number;
    latent_synapses_count: number;
    data_synapses_count: number;
    suggested_questions: string[];
  } | null;
  data_hash: string | null;
  data: Record<string, unknown> | null;
  reasons: string[];
}

export interface DocumentLifecycleReport {
  success: boolean;
  doc_id: string | null;
  file_id: string | null;
  hosted_url: string | null;
  verify_url: string | null;
  status: 'active' | 'expired' | 'revoked';
  isotope: boolean;
  expired: boolean;
  revoked: boolean;
  issued_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  remaining_seconds: number;
  reads_count: number;
  max_reads: number | null;
  expire_message: string | null;
  decayed_elements_count: number;
  message: string;
}

function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export class SmartPdfService {
  private static instance: SmartPdfService | null = null;

  private constructor() {}

  public static getInstance(): SmartPdfService {
    if (!SmartPdfService.instance) {
      SmartPdfService.instance = new SmartPdfService();
    }
    return SmartPdfService.instance;
  }

  private getSigningSecret(): string {
    return (
      env.ADMIN_SECRET ||
      env.STRIPE_WEBHOOK_SECRET ||
      env.DEV_DEFAULT_API_KEY ||
      'tailprint_cryptographic_proof_secret_v1'
    );
  }

  /**
   * Computes a deterministic SHA-256 fingerprint of all visual page streams,
   * dimensions, rotations, and annotations inside a PDFDocument.
   */
  public computeContentFingerprint(pdfDoc: PDFDocument): string {
    const hash = crypto.createHash('sha256');
    const pages = pdfDoc.getPages();
    hash.update(`pages:${pages.length}|`);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle || 0;
      hash.update(`p${i}:${Math.round(width * 100)}x${Math.round(height * 100)}@${rotation}|`);

      const contents = page.node.Contents();
      if (contents) {
        const updateWithStreamObj = (streamObj: any) => {
          if (!streamObj) return;
          const rawBytes: Uint8Array | undefined = streamObj.contents;
          if (rawBytes && rawBytes.length > 0) {
            try {
              const inflated = zlib.inflateSync(Buffer.from(rawBytes));
              hash.update(inflated);
            } catch {
              hash.update(Buffer.from(rawBytes));
            }
          }
        };

        if (typeof (contents as any).size === 'function') {
          const arr = contents as any;
          hash.update(`streams:${arr.size()}|`);
          for (let j = 0; j < arr.size(); j++) {
            const ref = arr.get(j);
            const resolved = page.node.context.lookup(ref);
            updateWithStreamObj(resolved);
          }
        } else {
          hash.update('streams:1|');
          updateWithStreamObj(contents);
        }
      } else {
        hash.update('streams:0|');
      }

      const annots = page.node.Annots();
      if (annots && typeof (annots as any).size === 'function') {
        hash.update(`annots:${(annots as any).size()}|`);
      } else {
        hash.update('annots:0|');
      }
    }

    return hash.digest('hex');
  }

  /**
   * Computes an HMAC-SHA256 cryptographic signature over the canonical manifest fields.
   */
  public signManifestPayload(payload: {
    doc_id: string;
    issued_at: string;
    issuer: string;
    template_id: string | null;
    page_count: number;
    content_fingerprint: string;
    data_hash: string | null;
    cortex_hash?: string | null;
  }): string {
    const canonical = canonicalizeJson(payload);
    return crypto
      .createHmac('sha256', this.getSigningSecret())
      .update(canonical)
      .digest('hex');
  }

  /**
   * Draws a sleek vector "Verified by Tailprint" cryptographic badge on the first page (bottom-right).
   */
  private async drawVerificationSeal(
    pdfDoc: PDFDocument,
    docId: string,
    verifyUrl: string
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return;

    const firstPage = pages[0];
    const { width } = firstPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const badgeWidth = 248;
    const badgeHeight = 24;
    const x = Math.max(16, width - badgeWidth - 18);
    const y = 12;

    firstPage.drawRectangle({
      x,
      y,
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(0.96, 0.99, 0.97),
      borderColor: rgb(0.08, 0.65, 0.45),
      borderWidth: 0.75,
      opacity: 0.96,
    });

    firstPage.drawRectangle({
      x,
      y,
      width: 4,
      height: badgeHeight,
      color: rgb(0.06, 0.62, 0.42),
    });

    firstPage.drawText(`VERIFIED CRYPTOGRAPHIC PDF  •  ${docId}`, {
      x: x + 10,
      y: y + 13,
      size: 6.5,
      font: fontBold,
      color: rgb(0.05, 0.42, 0.29),
    });

    const displayUrl = verifyUrl.replace(/^https?:\/\//i, '');
    firstPage.drawText(`Verify & inspect Dual-Brain JSON: ${displayUrl}`, {
      x: x + 10,
      y: y + 4.5,
      size: 5.8,
      font: fontRegular,
      color: rgb(0.28, 0.35, 0.42),
    });
  }

  /**
   * Draws an interactive, clickable "NEURAL CORTEX ACTIVE — Click to ask this PDF" badge
   * on the first page (bottom-left) AND attaches an ISO-32000 PDF /Link Annotation
   * so clicking the badge in Apple Preview, Chrome, or Adobe Reader opens `brainUrl`
   * (either `/brain/:docId` or the customer's white-label `neural_custom_url`).
   */
  private async drawNeuralImplantBadgeAndLink(
    pdfDoc: PDFDocument,
    docId: string,
    brainUrl: string,
    customLabel?: string
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return;

    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const badgeWidth = 262;
    const badgeHeight = 24;
    const x = 18;
    const y = 12;

    // Futuristic indigo/violet Neural Cortex pill
    firstPage.drawRectangle({
      x,
      y,
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(0.96, 0.96, 1.0),
      borderColor: rgb(0.38, 0.35, 0.92),
      borderWidth: 0.75,
      opacity: 0.97,
    });

    firstPage.drawRectangle({
      x,
      y,
      width: 4,
      height: badgeHeight,
      color: rgb(0.35, 0.32, 0.9),
    });

    const headerLabel = (
      customLabel?.trim() || 'NEURAL-IMPLANT PDF  •  CLICK TO ASK THIS DOCUMENT'
    ).slice(0, 62);

    firstPage.drawText(headerLabel, {
      x: x + 10,
      y: y + 13,
      size: 6.4,
      font: fontBold,
      color: rgb(0.24, 0.2, 0.72),
    });

    const displayUrl = brainUrl.replace(/^https?:\/\//i, '').slice(0, 56);
    firstPage.drawText(`Interactive Brain & Latent Memory: ${displayUrl}`, {
      x: x + 10,
      y: y + 4.5,
      size: 5.8,
      font: fontRegular,
      color: rgb(0.32, 0.35, 0.48),
    });

    // Attach clickable ISO-32000 /Link URI annotation over the badge rectangle
    const linkAnnot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + badgeWidth, y + badgeHeight],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(brainUrl),
      },
    });
    const linkAnnotRef = pdfDoc.context.register(linkAnnot);
    firstPage.node.addAnnot(linkAnnotRef);
  }

  private resolveCustomUrl(customUrl: string | undefined, defaultUrl: string, docId: string): string {
    if (!customUrl || !customUrl.trim()) return defaultUrl;
    const trimmed = customUrl.trim();
    if (trimmed.includes('{{doc_id}}') || trimmed.includes(':docId')) {
      return trimmed.replace(/\{\{\s*doc_id\s*\}\}/g, docId).replace(/:docId\b/g, docId);
    }
    return trimmed;
  }

  private deriveIsotopeCipherKey(docId: string): Buffer {
    return crypto
      .createHash('sha256')
      .update(`isotope-vault:${docId}:${this.getSigningSecret()}`)
      .digest();
  }

  private encryptIsotopeData(docId: string, data: Record<string, unknown>): string {
    const key = this.deriveIsotopeCipherKey(docId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(data), 'utf-8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  private decryptIsotopeData(docId: string, token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const ciphertext = Buffer.from(parts[2], 'base64');
      const key = this.deriveIsotopeCipherKey(docId);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(decrypted.toString('utf-8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Draws an interactive, clickable "TIME-LIMITED ISOTOPE PDF" validity seal on the top-right
   * of the first page with an ISO-32000 `/Link` annotation to `verifyUrl`.
   */
  private async drawIsotopeValidityBadge(
    pdfDoc: PDFDocument,
    docId: string,
    expiresAt: string,
    verifyUrl: string,
    maxReads?: number | null
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return;

    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const badgeWidth = 258;
    const badgeHeight = 24;
    const x = Math.max(16, width - badgeWidth - 18);
    const y = Math.max(16, height - badgeHeight - 12);

    firstPage.drawRectangle({
      x,
      y,
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(1.0, 0.98, 0.92),
      borderColor: rgb(0.92, 0.58, 0.08),
      borderWidth: 0.75,
      opacity: 0.97,
    });

    firstPage.drawRectangle({
      x,
      y,
      width: 4,
      height: badgeHeight,
      color: rgb(0.88, 0.52, 0.05),
    });

    const expShort = expiresAt.replace('T', ' ').slice(0, 16) + ' UTC';
    const geigerSuffix = maxReads ? `  •  MAX ${maxReads} READS` : '';
    const headerText = `TIME-LIMITED PDF  •  VALID UNTIL ${expShort}${geigerSuffix}`.slice(0, 62);

    firstPage.drawText(headerText, {
      x: x + 10,
      y: y + 13,
      size: 6.2,
      font: fontBold,
      color: rgb(0.58, 0.25, 0.04),
    });

    const displayUrl = verifyUrl.replace(/^https?:\/\//i, '').slice(0, 54);
    firstPage.drawText(`Click to verify live validity: ${displayUrl}`, {
      x: x + 10,
      y: y + 4.5,
      size: 5.7,
      font: fontRegular,
      color: rgb(0.45, 0.32, 0.18),
    });

    const linkAnnot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + badgeWidth, y + badgeHeight],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(verifyUrl),
      },
    });
    const linkAnnotRef = pdfDoc.context.register(linkAnnot);
    firstPage.node.addAnnot(linkAnnotRef);
  }

  /**
   * Compiles the Decayed / Expired PDF buffer that will be served by `/d/:fileId`
   * after `expires_at` passes, `max_reads` is reached, or `expire_now` (SCRAM) is triggered.
   */
  private async compileDecayedPdfBuffer(options: {
    baseDecayedBuffer: Buffer;
    docId: string;
    issuedAt: string;
    issuer: string;
    templateId: string | null;
    expiresAt: string;
    expireMode: 'replace_and_stamp' | 'replace_only' | 'lockout';
    expireMessage: string | null;
    brainUrl: string;
    verificationUrl: string;
  }): Promise<Buffer> {
    const decayedDoc = await PDFDocument.load(options.baseDecayedBuffer);
    this.rewriteCustomHtmlLinks(decayedDoc, options.brainUrl, options.verificationUrl);

    if (options.expireMode !== 'replace_only' && options.expireMode !== 'lockout') {
      const fontBold = await decayedDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await decayedDoc.embedFont(StandardFonts.Helvetica);
      const expShort = options.expiresAt.replace('T', ' ').slice(0, 16) + ' UTC';
      const msg = (
        options.expireMessage ||
        `This time-limited document expired on ${expShort} and is no longer valid.`
      ).slice(0, 88);

      for (const page of decayedDoc.getPages()) {
        const { width, height } = page.getSize();
        const bannerHeight = 28;
        const y = Math.max(0, height - bannerHeight);

        page.drawRectangle({
          x: 0,
          y,
          width,
          height: bannerHeight,
          color: rgb(0.99, 0.94, 0.94),
          borderColor: rgb(0.9, 0.22, 0.22),
          borderWidth: 0.75,
          opacity: 0.97,
        });

        page.drawText(`DOCUMENT EXPIRED  •  NO LONGER VALID  (${options.docId})`, {
          x: 18,
          y: y + 15,
          size: 7.5,
          font: fontBold,
          color: rgb(0.62, 0.1, 0.1),
        });

        page.drawText(msg, {
          x: 18,
          y: y + 5,
          size: 6.2,
          font: fontRegular,
          color: rgb(0.5, 0.15, 0.15),
        });
      }
    }

    const normBytes = await decayedDoc.save({ useObjectStreams: false });
    const finalDecayedDoc = await PDFDocument.load(normBytes);
    const pageCount = finalDecayedDoc.getPageCount();
    const contentFingerprint = this.computeContentFingerprint(finalDecayedDoc);

    const expiredManifest: TailprintManifest = {
      '@context': DUAL_BRAIN_CONTEXT,
      schema_version: '1.0',
      doc_id: options.docId,
      issued_at: options.issuedAt,
      issuer: options.issuer,
      template_id: options.templateId,
      ai_ready: false,
      signed: true,
      isotope: true,
      expires_at: options.expiresAt,
      expire_mode: options.expireMode,
      expire_message: options.expireMessage,
      expired_copy: true,
      page_count: pageCount,
      content_fingerprint: contentFingerprint,
      data_hash: null,
      data: null,
      verification_url: options.verificationUrl,
      signature: null,
    };

    await finalDecayedDoc.attach(
      Buffer.from(JSON.stringify(expiredManifest, null, 2), 'utf-8'),
      MANIFEST_FILENAME,
      {
        mimeType: 'application/json',
        description: 'Tailprint Decayed Isotope Manifest (Expired)',
        creationDate: new Date(options.issuedAt),
        modificationDate: new Date(),
      }
    );

    const saved = await finalDecayedDoc.save({ useObjectStreams: false });
    return Buffer.from(saved);
  }

  /**
   * Rewrites Chromium-generated `/Link` annotations for user-placed HTML buttons
   * (`<div data-neural-button></div>`, `<div data-verify-button></div>`, and `<div data-expire-button></div>`)
   * so they point to the final `brainUrl` and `verificationUrl` with `docId`.
   */
  private rewriteCustomHtmlLinks(
    pdfDoc: PDFDocument,
    brainUrl: string,
    verificationUrl: string
  ): {
    rewrittenNeuralLinks: number;
    rewrittenVerifyLinks: number;
    rewrittenExpireLinks: number;
  } {
    let rewrittenNeuralLinks = 0;
    let rewrittenVerifyLinks = 0;
    let rewrittenExpireLinks = 0;

    for (const page of pdfDoc.getPages()) {
      const annots = page.node.Annots();
      if (!annots) continue;

      for (let i = 0; i < annots.size(); i++) {
        const annotDict = annots.lookupMaybe(i, PDFDict);
        if (!annotDict) continue;

        const actionDict = annotDict.lookupMaybe(PDFName.of('A'), PDFDict);
        if (!actionDict) continue;

        const uriObj = actionDict.get(PDFName.of('URI'));
        const rawUri =
          uriObj instanceof PDFString || uriObj instanceof PDFHexString
            ? uriObj.decodeText()
            : uriObj
              ? String(uriObj)
              : '';

        if (rawUri.includes('__NEURAL_BRAIN_URL__')) {
          actionDict.set(PDFName.of('URI'), PDFString.of(brainUrl));
          rewrittenNeuralLinks++;
        } else if (rawUri.includes('__VERIFY_SEAL_URL__')) {
          actionDict.set(PDFName.of('URI'), PDFString.of(verificationUrl));
          rewrittenVerifyLinks++;
        } else if (rawUri.includes('__EXPIRE_STATUS_URL__')) {
          actionDict.set(PDFName.of('URI'), PDFString.of(verificationUrl));
          rewrittenExpireLinks++;
        }
      }
    }

    return { rewrittenNeuralLinks, rewrittenVerifyLinks, rewrittenExpireLinks };
  }

  /**
   * Enriches a rendered PDF with:
   * 1. Dual-Brain structured JSON (`tailprint-manifest.json`),
   * 2. Cryptographic Proof-of-Origin (HMAC-SHA256 content stream signature + Redis proof ledger),
   * 3. Neural-Implant Cortex (`tailprint-cortex.json` with 64-D Int8 vectors, DOM bounding boxes, and latent memory),
   * 4. Isotope / Time-Limited Lifecycle (`expires_at`, `max_reads`, AES-256-GCM time-locked payload, and pre-compiled Decayed PDF).
   */
  public async enrichPdf(
    pdfBuffer: Buffer,
    options: SmartPdfEnrichOptions
  ): Promise<SmartPdfEnrichResult> {
    const docId = `doc_${crypto.randomBytes(8).toString('hex')}`;
    const issuedAt = new Date().toISOString();
    const issuer = options.customerId || 'tailprint.com';
    const templateId = options.templateId ?? null;

    const isIsotope = Boolean(
      options.isotope ||
        options.documentTtl ||
        options.expiresAt ||
        options.maxReads ||
        options.expireMode ||
        options.expireMessage ||
        options.hasCustomExpireButton ||
        (options.isotopeElementCount && options.isotopeElementCount > 0)
    );

    let resolvedExpiresAt: string | null = null;
    if (isIsotope) {
      if (options.expiresAt && !Number.isNaN(Date.parse(options.expiresAt))) {
        resolvedExpiresAt = new Date(Date.parse(options.expiresAt)).toISOString();
      } else {
        const ttlStr = options.documentTtl || options.inferredIsotopeTtl || '24h';
        const ttlMs = parseDurationToMs(ttlStr);
        resolvedExpiresAt = new Date(Date.now() + ttlMs).toISOString();
      }
    }

    const expireMode = options.expireMode || 'replace_and_stamp';
    const expireMessage = options.expireMessage?.trim() || null;
    const maxReads =
      typeof options.maxReads === 'number' && options.maxReads > 0 ? options.maxReads : null;
    const decayedElementsCount = options.isotopeElementCount || 0;

    const hasNeuralImplant = Boolean(
      options.neuralImplant ||
        options.hasCustomNeuralButton ||
        options.neuralContext ||
        options.neuralPersona ||
        options.neuralCustomUrl ||
        options.neuralBadgeLabel
    );
    const signed = Boolean(
      options.sign ||
        options.verifySeal ||
        options.hasCustomVerifyButton ||
        hasNeuralImplant ||
        isIsotope
    );
    const aiReady = options.aiReady !== undefined ? options.aiReady : true;
    const dataPayload =
      options.data && typeof options.data === 'object' && Object.keys(options.data).length > 0
        ? options.data
        : null;

    const appBaseUrl = (env.APP_URL || 'https://tailprint.com').replace(/\/+$/, '');
    const verificationUrl = this.resolveCustomUrl(
      options.verifyCustomUrl,
      `${appBaseUrl}/verify/${docId}`,
      docId
    );
    const brainUrl = this.resolveCustomUrl(
      options.neuralCustomUrl,
      `${appBaseUrl}/brain/${docId}`,
      docId
    );

    // 1. Load PDF, rewrite any custom HTML buttons (<div data-neural-button>, <div data-expire-button>), and optionally stamp fallback badges
    const initialDoc = await PDFDocument.load(pdfBuffer);
    const { rewrittenNeuralLinks, rewrittenVerifyLinks, rewrittenExpireLinks } =
      this.rewriteCustomHtmlLinks(initialDoc, brainUrl, verificationUrl);

    const usedCustomVerifyButton =
      rewrittenVerifyLinks > 0 || Boolean(options.hasCustomVerifyButton);
    const usedCustomNeuralButton =
      rewrittenNeuralLinks > 0 || Boolean(options.hasCustomNeuralButton);
    const usedCustomExpireButton =
      rewrittenExpireLinks > 0 || Boolean(options.hasCustomExpireButton);

    if (options.verifySeal && !usedCustomVerifyButton) {
      await this.drawVerificationSeal(initialDoc, docId, verificationUrl);
    }
    if (hasNeuralImplant && options.neuralBadge !== false && !usedCustomNeuralButton) {
      await this.drawNeuralImplantBadgeAndLink(
        initialDoc,
        docId,
        brainUrl,
        options.neuralBadgeLabel
      );
    }
    if (
      isIsotope &&
      resolvedExpiresAt &&
      options.expireBadge !== false &&
      !usedCustomExpireButton
    ) {
      await this.drawIsotopeValidityBadge(
        initialDoc,
        docId,
        resolvedExpiresAt,
        verificationUrl,
        maxReads
      );
    }

    // 2. Normalize streams with useObjectStreams: false so content_fingerprint is 100% deterministic
    const normalizedBytes = await initialDoc.save({ useObjectStreams: false });
    const pdfDoc = await PDFDocument.load(normalizedBytes);

    const pageCount = pdfDoc.getPageCount();
    const contentFingerprint = this.computeContentFingerprint(pdfDoc);
    const dataHash = dataPayload
      ? crypto.createHash('sha256').update(canonicalizeJson(dataPayload)).digest('hex')
      : null;

    // 3. Compile Neural-Implant Cortex if enabled
    let cortex: TailprintNeuralCortex | null = null;
    if (hasNeuralImplant) {
      cortex = neuralCortexService.compileCortex({
        docId,
        persona: options.neuralPersona,
        domSynapses: options.domSynapses,
        latentContext: options.neuralContext,
        structuredData: dataPayload,
        appBaseUrl,
        brainUrl,
      });

      const cortexJson = JSON.stringify(cortex, null, 2);
      await pdfDoc.attach(Buffer.from(cortexJson, 'utf-8'), CORTEX_FILENAME, {
        mimeType: 'application/json',
        description:
          'Tailprint Neural-Implant Spatial Cortex (64-D Int8 Vectors, DOM Bounding Boxes & Latent Memory)',
        creationDate: new Date(issuedAt),
        modificationDate: new Date(issuedAt),
      });
    }

    const signature = signed
      ? this.signManifestPayload({
          doc_id: docId,
          issued_at: issuedAt,
          issuer,
          template_id: templateId,
          page_count: pageCount,
          content_fingerprint: contentFingerprint,
          data_hash: dataHash,
          ...(cortex ? { cortex_hash: cortex.cortex_hash } : {}),
        })
      : null;

    const encryptedDataToken =
      isIsotope && dataPayload ? this.encryptIsotopeData(docId, dataPayload) : null;

    const manifest: TailprintManifest = {
      '@context': DUAL_BRAIN_CONTEXT,
      schema_version: '1.0',
      doc_id: docId,
      issued_at: issuedAt,
      issuer,
      template_id: templateId,
      ai_ready: aiReady,
      signed,
      neural_implant: hasNeuralImplant,
      cortex_hash: cortex ? cortex.cortex_hash : null,
      brain_url: hasNeuralImplant ? brainUrl : null,
      ...(isIsotope
        ? {
            isotope: true,
            expires_at: resolvedExpiresAt,
            expire_mode: expireMode,
            expire_message: expireMessage,
            max_reads: maxReads,
            decayed_elements_count: decayedElementsCount,
            encrypted_data: encryptedDataToken,
          }
        : {}),
      page_count: pageCount,
      content_fingerprint: contentFingerprint,
      data_hash: dataHash,
      data: isIsotope ? null : dataPayload,
      verification_url: verificationUrl,
      signature,
    };

    const manifestJson = JSON.stringify(manifest, null, 2);

    // 4. Attach tailprint-manifest.json into the PDF's /EmbeddedFiles catalog
    await pdfDoc.attach(Buffer.from(manifestJson, 'utf-8'), MANIFEST_FILENAME, {
      mimeType: 'application/json',
      description: 'Tailprint Dual-Brain Structured Payload & Cryptographic Proof Manifest',
      creationDate: new Date(issuedAt),
      modificationDate: new Date(issuedAt),
    });

    pdfDoc.setProducer('Tailprint Dual-Brain & Neural-Implant PDF Engine (https://tailprint.com)');
    pdfDoc.setKeywords([
      `tailprint:doc_id=${docId}`,
      `tailprint:ai_ready=${String(aiReady)}`,
      `tailprint:signed=${String(signed)}`,
      `tailprint:neural_implant=${String(hasNeuralImplant)}`,
      ...(isIsotope && resolvedExpiresAt ? [`tailprint:expires_at=${resolvedExpiresAt}`] : []),
      ...(templateId ? [`tailprint:template=${templateId}`] : []),
    ]);

    const finalBytes = await pdfDoc.save({ useObjectStreams: false });
    const finalBuffer = Buffer.from(finalBytes);
    const fileSha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');

    // Compile Decayed PDF buffer if Isotope mode is active
    let compiledDecayedBuffer: Buffer | undefined;
    if (isIsotope && resolvedExpiresAt) {
      compiledDecayedBuffer = await this.compileDecayedPdfBuffer({
        baseDecayedBuffer: options.rawDecayedBuffer || pdfBuffer,
        docId,
        issuedAt,
        issuer,
        templateId,
        expiresAt: resolvedExpiresAt,
        expireMode,
        expireMessage,
        brainUrl,
        verificationUrl,
      });
    }

    // 5. Store cryptographic proof & neural cortex in Redis (unless zero-retention no_store is active)
    if (!options.noStore) {
      const proofRecord: PdfProofRecord = {
        doc_id: docId,
        customer_id: issuer,
        issued_at: issuedAt,
        template_id: templateId,
        signed,
        ai_ready: aiReady,
        page_count: pageCount,
        file_sha256: fileSha256,
        content_fingerprint: contentFingerprint,
        data_hash: dataHash,
        data_keys: dataPayload ? Object.keys(dataPayload) : [],
        signature,
        verification_url: verificationUrl,
        ...(isIsotope
          ? {
              isotope: true,
              expires_at: resolvedExpiresAt,
              revoked: false,
              revoked_at: null,
              expire_message: expireMessage,
              max_reads: maxReads,
              reads_count: 0,
              decayed_elements_count: decayedElementsCount,
            }
          : {}),
      };
      await redisService.savePdfProof(proofRecord);

      if (cortex) {
        await redisService.savePdfCortex(docId, cortex as unknown as Record<string, unknown>);
      }
    }

    // Return decrypted data in the in-memory `manifest` returned to the caller while keeping the PDF attachment encrypted
    return {
      buffer: finalBuffer,
      decayedBuffer: compiledDecayedBuffer,
      docId,
      manifest: {
        ...manifest,
        data: dataPayload,
      },
      cortex,
      fileSha256,
      isotope: isIsotope,
      expiresAt: resolvedExpiresAt,
    };
  }

  /**
   * Checks whether a document is currently expired or revoked based on its manifest and live ledger state.
   */
  public async evaluateIsotopeState(
    docId: string | null | undefined,
    manifest?: TailprintManifest | null,
    incrementReads = false
  ): Promise<{
    isotope: boolean;
    expired: boolean;
    revoked: boolean;
    expires_at: string | null;
    remaining_seconds: number | null;
    reads_count: number | null;
    max_reads: number | null;
    expire_message: string | null;
    ledgerRecord: PdfProofRecord | null;
  }> {
    const ledgerRecord = docId ? await redisService.getPdfProof(docId) : null;
    const isIsotope = Boolean(
      manifest?.isotope ||
        manifest?.expires_at ||
        manifest?.expired_copy ||
        ledgerRecord?.isotope ||
        ledgerRecord?.expires_at
    );

    if (!isIsotope) {
      return {
        isotope: false,
        expired: false,
        revoked: false,
        expires_at: null,
        remaining_seconds: null,
        reads_count: null,
        max_reads: null,
        expire_message: null,
        ledgerRecord,
      };
    }

    const effectiveExpiresAt = ledgerRecord?.expires_at || manifest?.expires_at || null;
    const revoked = Boolean(ledgerRecord?.revoked);
    const maxReads = ledgerRecord?.max_reads ?? manifest?.max_reads ?? null;
    let readsCount = ledgerRecord?.reads_count ?? 0;
    const expireMessage = ledgerRecord?.expire_message ?? manifest?.expire_message ?? null;

    const now = Date.now();
    const expMs = effectiveExpiresAt ? new Date(effectiveExpiresAt).getTime() : null;
    const isTimeExpired = expMs !== null && !Number.isNaN(expMs) && now > expMs;
    const isMaxReadsExpired =
      typeof maxReads === 'number' && maxReads > 0 && readsCount >= maxReads;
    const expired = Boolean(manifest?.expired_copy || revoked || isTimeExpired || isMaxReadsExpired);

    if (!expired && incrementReads && docId && ledgerRecord) {
      readsCount += 1;
      await redisService.updatePdfProof(docId, { reads_count: readsCount });
    }

    const remainingSeconds =
      expMs !== null && !Number.isNaN(expMs) && !revoked
        ? Math.max(0, Math.floor((expMs - now) / 1000))
        : 0;

    return {
      isotope: true,
      expired,
      revoked,
      expires_at: effectiveExpiresAt,
      remaining_seconds: expired ? 0 : remainingSeconds,
      reads_count: readsCount,
      max_reads: maxReads,
      expire_message: expireMessage,
      ledgerRecord,
    };
  }

  /**
   * Real-time remote lifecycle management for Time-Limited / Isotope PDFs:
   * - `status`: Inspect live countdown, Geiger read counter, and revocation status.
   * - `expire_now` (SCRAM / Kill Switch): Immediately expire/revoke the PDF and switch `/d/:fileId` to its Decayed state.
   * - `extend`: Extend (or reactivate) the document's validity window without re-rendering or resending the PDF.
   */
  public async manageDocumentLifecycle(options: {
    docId?: string;
    fileId?: string;
    action: 'status' | 'expire_now' | 'extend';
    extendBy?: string;
    expiresAt?: string;
    expireMessage?: string;
    maxReads?: number;
  }): Promise<DocumentLifecycleReport> {
    let docId = options.docId?.trim() || null;
    let fileId = options.fileId?.trim() || null;

    let fileMeta = fileId ? await storageService.getFileMetadata(fileId) : null;
    if (!docId && fileMeta?.docId) {
      docId = fileMeta.docId;
    }
    if (!fileMeta && docId) {
      fileMeta = await storageService.findFileByDocId(docId);
      if (fileMeta) {
        fileId = fileMeta.fileId;
      }
    }

    let proof = docId ? await redisService.getPdfProof(docId) : null;
    if (!proof && !fileMeta) {
      throw new Error(
        `Document "${docId || fileId || 'unknown'}" was not found in the Tailprint lifecycle ledger.`
      );
    }

    const nowIso = new Date().toISOString();

    if (options.action === 'expire_now') {
      const customMsg =
        options.expireMessage?.trim() ||
        proof?.expire_message ||
        fileMeta?.expireMessage ||
        'This document was manually revoked/expired by the issuer.';

      if (docId && proof) {
        proof = await redisService.updatePdfProof(docId, {
          isotope: true,
          revoked: true,
          revoked_at: nowIso,
          expires_at: nowIso,
          expire_message: customMsg,
        });
      }
      if (fileId && fileMeta) {
        fileMeta = await storageService.updateFileLifecycle(fileId, {
          isotope: true,
          revoked: true,
          revokedAt: nowIso,
          expiresAt: nowIso,
          expireMessage: customMsg,
        });
      }
    } else if (options.action === 'extend') {
      let newExpiresAt: string;
      if (options.expiresAt && !Number.isNaN(Date.parse(options.expiresAt))) {
        newExpiresAt = new Date(Date.parse(options.expiresAt)).toISOString();
      } else {
        const addMs = parseDurationToMs(options.extendBy || '7d');
        const currentExpMs = proof?.expires_at
          ? new Date(proof.expires_at).getTime()
          : fileMeta?.expiresAt
            ? new Date(fileMeta.expiresAt).getTime()
            : Date.now();
        const baseMs = Math.max(Date.now(), Number.isNaN(currentExpMs) ? Date.now() : currentExpMs);
        newExpiresAt = new Date(baseMs + addMs).toISOString();
      }

      const newMaxReads =
        typeof options.maxReads === 'number' && options.maxReads > 0
          ? options.maxReads
          : proof?.max_reads ?? fileMeta?.maxReads ?? null;

      if (docId && proof) {
        proof = await redisService.updatePdfProof(docId, {
          isotope: true,
          revoked: false,
          revoked_at: null,
          expires_at: newExpiresAt,
          reads_count: 0,
          ...(newMaxReads !== null ? { max_reads: newMaxReads } : {}),
          ...(options.expireMessage ? { expire_message: options.expireMessage.trim() } : {}),
        });
      }
      if (fileId && fileMeta) {
        fileMeta = await storageService.updateFileLifecycle(fileId, {
          isotope: true,
          revoked: false,
          revokedAt: null,
          expiresAt: newExpiresAt,
          readsCount: 0,
          ...(newMaxReads !== null ? { maxReads: newMaxReads } : {}),
          ...(options.expireMessage ? { expireMessage: options.expireMessage.trim() } : {}),
        });
      }
    }

    const effectiveExpiresAt = proof?.expires_at || fileMeta?.expiresAt || null;
    const isRevoked = Boolean(proof?.revoked || fileMeta?.revoked);
    const maxReads = proof?.max_reads ?? fileMeta?.maxReads ?? null;
    const readsCount = Math.max(proof?.reads_count || 0, fileMeta?.readsCount || 0);
    const expMs = effectiveExpiresAt ? new Date(effectiveExpiresAt).getTime() : null;
    const isTimeExpired = expMs !== null && !Number.isNaN(expMs) && Date.now() > expMs;
    const isMaxReadsReached =
      typeof maxReads === 'number' && maxReads > 0 && readsCount >= maxReads;
    const isExpired = Boolean(isRevoked || isTimeExpired || isMaxReadsReached);

    const remainingSeconds =
      !isExpired && expMs !== null && !Number.isNaN(expMs)
        ? Math.max(0, Math.floor((expMs - Date.now()) / 1000))
        : 0;

    const status: 'active' | 'expired' | 'revoked' = isRevoked
      ? 'revoked'
      : isExpired
        ? 'expired'
        : 'active';

    const appBaseUrl = (env.APP_URL || 'https://tailprint.com').replace(/\/+$/, '');
    return {
      success: true,
      doc_id: docId,
      file_id: fileId,
      hosted_url: fileMeta?.hostedUrl || (fileId ? `${appBaseUrl}/d/${fileId}` : null),
      verify_url: proof?.verification_url || (docId ? `${appBaseUrl}/verify/${docId}` : null),
      status,
      isotope: Boolean(proof?.isotope || fileMeta?.isotope || effectiveExpiresAt),
      expired: isExpired,
      revoked: isRevoked,
      issued_at: proof?.issued_at || fileMeta?.createdAt || null,
      expires_at: effectiveExpiresAt,
      revoked_at: proof?.revoked_at || fileMeta?.revokedAt || null,
      remaining_seconds: remainingSeconds,
      reads_count: readsCount,
      max_reads: maxReads,
      expire_message: proof?.expire_message || fileMeta?.expireMessage || null,
      decayed_elements_count: proof?.decayed_elements_count || 0,
      message:
        status === 'revoked'
          ? 'Document has been immediately revoked (SCRAM) and switched to its decayed state.'
          : status === 'expired'
            ? `Document has expired (${isMaxReadsReached ? `max reads ${readsCount}/${maxReads} reached` : `validity window ended at ${effectiveExpiresAt}`}).`
            : `Document is active and valid (${remainingSeconds}s remaining).`,
    };
  }

  /**
   * Extracts an embedded JSON file from a PDF's /Names -> /EmbeddedFiles catalog by filename or context URI.
   */
  private extractEmbeddedJson<T>(
    pdfDoc: PDFDocument,
    rawBuffer: Buffer,
    targetFilename: string,
    contextUri: string
  ): T | null {
    try {
      const names = pdfDoc.catalog.lookup(PDFName.of('Names'));
      if (names && typeof (names as any).lookup === 'function') {
        const embeddedFiles = (names as any).lookup(PDFName.of('EmbeddedFiles'));
        if (embeddedFiles && typeof (embeddedFiles as any).lookup === 'function') {
          const efNames = (embeddedFiles as any).lookup(PDFName.of('Names'));
          if (efNames && typeof efNames.size === 'function') {
            for (let i = 0; i < efNames.size(); i += 2) {
              const rawName = efNames.get(i);
              const fileName =
                rawName && typeof rawName.decodeText === 'function'
                  ? rawName.decodeText()
                  : String(rawName);
              const lowerName = fileName.toLowerCase();

              if (lowerName.includes(targetFilename.toLowerCase()) || lowerName.endsWith('.json')) {
                const fileSpec = efNames.lookup(i + 1);
                if (!fileSpec || typeof (fileSpec as any).lookup !== 'function') continue;

                const efDict = (fileSpec as any).lookup(PDFName.of('EF'));
                if (!efDict || typeof (efDict as any).lookup !== 'function') continue;

                const stream = (efDict as any).lookup(PDFName.of('F'));
                if (!stream || !stream.contents) continue;

                let jsonText = '';
                try {
                  const decompressed = zlib.inflateSync(Buffer.from(stream.contents));
                  jsonText = decompressed.toString('utf-8');
                } catch {
                  jsonText = Buffer.from(stream.contents).toString('utf-8');
                }

                if (jsonText.includes(contextUri)) {
                  return JSON.parse(jsonText) as T;
                }
              }
            }
          }
        }
      }
    } catch {
      // Fall through to raw scan
    }

    try {
      const rawText = rawBuffer.toString('utf-8');
      const idx = rawText.indexOf(contextUri);
      if (idx !== -1) {
        const startBrace = rawText.lastIndexOf('{', idx);
        if (startBrace !== -1) {
          let depth = 0;
          let inString = false;
          let escaped = false;
          for (let i = startBrace; i < rawText.length; i++) {
            const ch = rawText[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (ch === '\\') {
              escaped = true;
              continue;
            }
            if (ch === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (ch === '{') depth++;
              else if (ch === '}') {
                depth--;
                if (depth === 0) {
                  const candidate = rawText.slice(startBrace, i + 1);
                  return JSON.parse(candidate) as T;
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignore fallback scan errors
    }

    return null;
  }

  public extractManifestFromPdfDoc(
    pdfDoc: PDFDocument,
    rawBuffer: Buffer
  ): TailprintManifest | null {
    return this.extractEmbeddedJson<TailprintManifest>(
      pdfDoc,
      rawBuffer,
      MANIFEST_FILENAME,
      DUAL_BRAIN_CONTEXT
    );
  }

  public extractCortexFromPdfDoc(
    pdfDoc: PDFDocument,
    rawBuffer: Buffer
  ): TailprintNeuralCortex | null {
    return this.extractEmbeddedJson<TailprintNeuralCortex>(
      pdfDoc,
      rawBuffer,
      CORTEX_FILENAME,
      NEURAL_CORTEX_CONTEXT
    );
  }

  /**
   * Retrieves the full compiled Neural-Implant Cortex (`TailprintNeuralCortex` including
   * `suggested_questions`, `persona`, `synapses` with `bbox`, and `knowledge_graph`)
   * either statelessly from a `pdfBuffer` or by `docId` from Redis.
   */
  public async getCortex(options: {
    pdfBuffer?: Buffer;
    docId?: string;
  }): Promise<TailprintNeuralCortex> {
    if (options.pdfBuffer) {
      const pdfDoc = await PDFDocument.load(options.pdfBuffer, { ignoreEncryption: true });
      let cortex = this.extractCortexFromPdfDoc(pdfDoc, options.pdfBuffer);
      const manifest = this.extractManifestFromPdfDoc(pdfDoc, options.pdfBuffer);

      const isoState = await this.evaluateIsotopeState(manifest?.doc_id, manifest, false);
      if (isoState.expired) {
        throw new Error(
          isoState.expire_message ||
            `This time-limited Isotope PDF expired at ${isoState.expires_at || 'an earlier time'} and its Neural Cortex is locked.`
        );
      }

      const resolvedData =
        manifest?.data ||
        (manifest?.encrypted_data && manifest.doc_id
          ? this.decryptIsotopeData(manifest.doc_id, manifest.encrypted_data)
          : null);

      if (!cortex && manifest && resolvedData) {
        cortex = neuralCortexService.compileCortex({
          docId: manifest.doc_id,
          structuredData: resolvedData,
        });
      }

      if (!cortex && manifest?.doc_id) {
        cortex = await redisService.getPdfCortex<TailprintNeuralCortex>(manifest.doc_id);
      }

      if (!cortex) {
        throw new Error(
          'This PDF does not contain an implanted Tailprint Neural Cortex (tailprint-cortex.json) or Dual-Brain manifest.'
        );
      }

      return cortex;
    }

    if (options.docId) {
      const isoState = await this.evaluateIsotopeState(options.docId, null, false);
      if (isoState.expired) {
        throw new Error(
          isoState.expire_message ||
            `Document "${options.docId}" has expired and its Neural Cortex is locked.`
        );
      }

      const cortex = await redisService.getPdfCortex<TailprintNeuralCortex>(options.docId);
      if (!cortex) {
        throw new Error(
          `No Neural Cortex found in ledger for document ID "${options.docId}". Provide the PDF file directly to extract its embedded cortex.`
        );
      }
      return cortex;
    }

    throw new Error('Either "pdf" or "doc_id" must be provided to retrieve a Neural Cortex.');
  }

  /**
   * Queries a PDF's Neural-Implant Cortex either directly from a PDF buffer (100% stateless/offline)
   * or by `docId` from the Redis Cortex store.
   */
  public async askPdf(options: {
    pdfBuffer?: Buffer;
    docId?: string;
    question: string;
  }): Promise<NeuralAskResponse> {
    if (options.pdfBuffer) {
      const pdfDoc = await PDFDocument.load(options.pdfBuffer, { ignoreEncryption: true });
      let cortex = this.extractCortexFromPdfDoc(pdfDoc, options.pdfBuffer);
      const manifest = this.extractManifestFromPdfDoc(pdfDoc, options.pdfBuffer);

      const isoState = await this.evaluateIsotopeState(manifest?.doc_id, manifest, true);
      if (isoState.expired) {
        throw new Error(
          isoState.expire_message ||
            `This time-limited Isotope PDF has expired (${isoState.expires_at || 'revoked'}) and its AI memory can no longer be queried.`
        );
      }

      // Verify cryptographic integrity if manifest is present
      let verified = false;
      if (manifest) {
        const actualFp = this.computeContentFingerprint(pdfDoc);
        verified = manifest.content_fingerprint === actualFp;
      }

      const resolvedData =
        manifest?.data ||
        (manifest?.encrypted_data && manifest.doc_id
          ? this.decryptIsotopeData(manifest.doc_id, manifest.encrypted_data)
          : null);

      // If the PDF is a Dual-Brain PDF without a pre-compiled cortex, dynamically compile a cortex from its manifest data!
      if (!cortex && manifest && resolvedData) {
        cortex = neuralCortexService.compileCortex({
          docId: manifest.doc_id,
          structuredData: resolvedData,
        });
      }

      if (!cortex && manifest?.doc_id) {
        cortex = await redisService.getPdfCortex<TailprintNeuralCortex>(manifest.doc_id);
      }

      if (!cortex) {
        throw new Error(
          'This PDF does not contain an implanted Tailprint Neural Cortex (tailprint-cortex.json) or Dual-Brain manifest.'
        );
      }

      return neuralCortexService.askCortex(cortex, options.question, verified);
    }

    if (options.docId) {
      const isoState = await this.evaluateIsotopeState(options.docId, null, true);
      if (isoState.expired) {
        throw new Error(
          isoState.expire_message ||
            `Document "${options.docId}" has expired and its AI memory can no longer be queried.`
        );
      }

      const cortex = await redisService.getPdfCortex<TailprintNeuralCortex>(options.docId);
      if (!cortex) {
        throw new Error(
          `No Neural Cortex found in ledger for document ID "${options.docId}". Upload the PDF file directly to query its embedded cortex.`
        );
      }
      return neuralCortexService.askCortex(cortex, options.question, true);
    }

    throw new Error('Either "pdf" or "doc_id" must be provided to query a Neural-Implant PDF.');
  }

  /**
   * Inspects a PDF buffer to:
   * 1. Extract its Dual-Brain structured JSON (`data`) and Neural-Implant Cortex summary in 0ms without OCR.
   * 2. Cryptographically verify its HMAC-SHA256 signature, visual page stream fingerprint,
   *    embedded data hash, Isotope expiration window, and Redis proof ledger to detect any tampering or expiration.
   */
  public async inspectAndVerifyPdf(pdfBuffer: Buffer): Promise<SmartPdfVerificationReport> {
    const fileSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const reasons: string[] = [];

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    } catch (err: any) {
      throw new Error(`Invalid or corrupted PDF document: ${err?.message || 'Unable to parse PDF'}`);
    }

    const pageCount = pdfDoc.getPageCount();
    const actualFingerprint = this.computeContentFingerprint(pdfDoc);
    const manifest = this.extractManifestFromPdfDoc(pdfDoc, pdfBuffer);
    const cortex = this.extractCortexFromPdfDoc(pdfDoc, pdfBuffer);

    if (!manifest) {
      const bySha = await redisService.getPdfProofBySha256(fileSha256);
      if (bySha) {
        const isoState = await this.evaluateIsotopeState(bySha.doc_id, null, true);
        return {
          valid: !isoState.expired,
          signed: bySha.signed,
          tampered: false,
          ai_ready: bySha.ai_ready && !isoState.expired,
          neural_implant: false,
          isotope: isoState.isotope,
          expired: isoState.expired,
          revoked: isoState.revoked,
          expires_at: isoState.expires_at,
          remaining_seconds: isoState.remaining_seconds,
          reads_count: isoState.reads_count,
          max_reads: isoState.max_reads,
          expire_message: isoState.expire_message,
          doc_id: bySha.doc_id,
          issued_at: bySha.issued_at,
          issuer: bySha.customer_id,
          template_id: bySha.template_id,
          page_count: pageCount,
          file_sha256: fileSha256,
          content_fingerprint: actualFingerprint,
          signature_valid: bySha.signed,
          content_intact: true,
          ledger_verified: true,
          verification_url: bySha.verification_url,
          brain_url: null,
          cortex_hash: null,
          cortex_summary: null,
          data_hash: bySha.data_hash,
          data: null,
          reasons: isoState.expired
            ? [
                isoState.expire_message ||
                  `Document expired at ${isoState.expires_at || 'an earlier time'} and is no longer valid.`,
              ]
            : ['Verified via Tailprint cryptographic SHA-256 ledger.'],
        };
      }

      return {
        valid: false,
        signed: false,
        tampered: false,
        ai_ready: false,
        neural_implant: false,
        isotope: false,
        expired: false,
        revoked: false,
        expires_at: null,
        remaining_seconds: null,
        reads_count: null,
        max_reads: null,
        expire_message: null,
        doc_id: null,
        issued_at: null,
        issuer: null,
        template_id: null,
        page_count: pageCount,
        file_sha256: fileSha256,
        content_fingerprint: actualFingerprint,
        signature_valid: false,
        content_intact: true,
        ledger_verified: false,
        verification_url: null,
        brain_url: null,
        cortex_hash: null,
        cortex_summary: null,
        data_hash: null,
        data: null,
        reasons: [
          'No embedded Tailprint Dual-Brain manifest (tailprint-manifest.json) or cryptographic signature found in this PDF.',
        ],
      };
    }

    const isoState = await this.evaluateIsotopeState(manifest.doc_id, manifest, true);
    const ledgerRecord = isoState.ledgerRecord;

    if (manifest.expired_copy) {
      return {
        valid: false,
        signed: true,
        tampered: false,
        ai_ready: false,
        neural_implant: false,
        isotope: true,
        expired: true,
        revoked: isoState.revoked,
        expires_at: isoState.expires_at,
        remaining_seconds: 0,
        reads_count: isoState.reads_count,
        max_reads: isoState.max_reads,
        expire_message: isoState.expire_message,
        doc_id: manifest.doc_id,
        issued_at: manifest.issued_at,
        issuer: manifest.issuer,
        template_id: manifest.template_id,
        page_count: pageCount,
        file_sha256: fileSha256,
        content_fingerprint: actualFingerprint,
        signature_valid: true,
        content_intact: true,
        ledger_verified: Boolean(ledgerRecord),
        verification_url: manifest.verification_url,
        brain_url: null,
        cortex_hash: null,
        cortex_summary: null,
        data_hash: null,
        data: null,
        reasons: [
          isoState.expire_message ||
            `This is a decayed/expired copy of time-limited document ${manifest.doc_id} (expired at ${isoState.expires_at}). Sensitive fields and JSON payloads have been permanently decayed.`,
        ],
      };
    }

    const contentIntact =
      manifest.content_fingerprint === actualFingerprint && manifest.page_count === pageCount;
    if (!contentIntact) {
      if (manifest.page_count !== pageCount) {
        reasons.push(
          `Page count mismatch: document was issued with ${manifest.page_count} page(s), but now has ${pageCount} page(s).`
        );
      } else {
        reasons.push(
          'Visual PDF content stream fingerprint mismatch: one or more pages or visual elements were modified after issuance.'
        );
      }
    }

    let resolvedData: Record<string, unknown> | null = manifest.data ?? null;
    if (!resolvedData && manifest.encrypted_data && manifest.doc_id && !isoState.expired) {
      resolvedData = this.decryptIsotopeData(manifest.doc_id, manifest.encrypted_data);
    }

    const actualDataHash = resolvedData
      ? crypto.createHash('sha256').update(canonicalizeJson(resolvedData)).digest('hex')
      : isoState.expired && manifest.encrypted_data
        ? manifest.data_hash
        : null;
    const dataIntact = manifest.data_hash === actualDataHash;
    if (!dataIntact) {
      reasons.push(
        'Embedded Dual-Brain JSON payload was modified after issuance (data_hash mismatch).'
      );
    }

    let signatureValid = false;
    if (manifest.signed && manifest.signature) {
      const expectedSig = this.signManifestPayload({
        doc_id: manifest.doc_id,
        issued_at: manifest.issued_at,
        issuer: manifest.issuer,
        template_id: manifest.template_id,
        page_count: manifest.page_count,
        content_fingerprint: manifest.content_fingerprint,
        data_hash: manifest.data_hash,
        ...(manifest.cortex_hash ? { cortex_hash: manifest.cortex_hash } : {}),
      });

      const sigBufA = Buffer.from(manifest.signature, 'utf-8');
      const sigBufB = Buffer.from(expectedSig, 'utf-8');
      signatureValid =
        sigBufA.length === sigBufB.length && crypto.timingSafeEqual(sigBufA, sigBufB);

      if (!signatureValid) {
        reasons.push(
          'Cryptographic HMAC-SHA256 signature verification failed: manifest metadata or signature was forged or altered.'
        );
      }
    }

    let ledgerVerified = false;
    let ledgerMismatch = false;

    if (ledgerRecord) {
      if (
        ledgerRecord.file_sha256 === fileSha256 &&
        ledgerRecord.content_fingerprint === actualFingerprint
      ) {
        ledgerVerified = true;
      } else {
        ledgerMismatch = true;
        if (ledgerRecord.file_sha256 !== fileSha256 && contentIntact && dataIntact) {
          reasons.push(
            'PDF container bytes differ from original issued file SHA-256 recorded in the Tailprint proof ledger.'
          );
        }
      }
    }

    if (isoState.expired) {
      reasons.push(
        isoState.expire_message ||
          (isoState.revoked
            ? `Document ${manifest.doc_id} was manually revoked (SCRAM) by the issuer and is no longer valid.`
            : `Isotope validity window expired (${isoState.expires_at || 'max reads reached'}). Embedded Dual-Brain JSON and Neural Cortex are locked.`)
      );
    }

    const tampered =
      !contentIntact ||
      !dataIntact ||
      (manifest.signed && !signatureValid) ||
      ledgerMismatch;

    const valid =
      !tampered &&
      !isoState.expired &&
      (manifest.signed ? signatureValid : contentIntact && dataIntact);

    if (valid && reasons.length === 0) {
      if (isoState.isotope) {
        reasons.push(
          `Active Time-Limited Isotope PDF verified (${isoState.remaining_seconds}s remaining until ${isoState.expires_at}${isoState.max_reads ? `, read ${isoState.reads_count}/${isoState.max_reads}` : ''}).`
        );
      } else if (cortex) {
        reasons.push(
          `Cryptographic signature & Neural-Implant Cortex verified (${cortex.total_synapses} synapses: ${cortex.visual_synapses_count} visual DOM, ${cortex.latent_synapses_count} latent memory).`
        );
      } else if (manifest.signed) {
        reasons.push(
          'Cryptographic HMAC-SHA256 signature and PDF page content streams verified with 100% integrity.'
        );
      } else {
        reasons.push(
          'Dual-Brain structured JSON manifest extracted and content fingerprint verified.'
        );
      }
    }

    return {
      valid,
      signed: Boolean(manifest.signed),
      tampered,
      ai_ready: Boolean(manifest.ai_ready && !isoState.expired),
      neural_implant: Boolean((manifest.neural_implant || cortex) && !isoState.expired),
      isotope: isoState.isotope,
      expired: isoState.expired,
      revoked: isoState.revoked,
      expires_at: isoState.expires_at,
      remaining_seconds: isoState.remaining_seconds,
      reads_count: isoState.reads_count,
      max_reads: isoState.max_reads,
      expire_message: isoState.expire_message,
      doc_id: manifest.doc_id,
      issued_at: manifest.issued_at,
      issuer: manifest.issuer,
      template_id: manifest.template_id,
      page_count: pageCount,
      file_sha256: fileSha256,
      content_fingerprint: actualFingerprint,
      signature_valid: signatureValid,
      content_intact: contentIntact && dataIntact,
      ledger_verified: ledgerVerified,
      verification_url: manifest.verification_url,
      brain_url: !isoState.expired ? manifest.brain_url || (cortex ? cortex.brain_url : null) : null,
      cortex_hash: manifest.cortex_hash || (cortex ? cortex.cortex_hash : null),
      cortex_summary:
        cortex && !isoState.expired
          ? {
              total_synapses: cortex.total_synapses,
              visual_synapses_count: cortex.visual_synapses_count,
              latent_synapses_count: cortex.latent_synapses_count,
              data_synapses_count: cortex.data_synapses_count,
              suggested_questions: cortex.suggested_questions,
            }
          : null,
      data_hash: manifest.data_hash,
      data: isoState.expired ? null : resolvedData,
      reasons,
    };
  }
}

export const smartPdfService = SmartPdfService.getInstance();
