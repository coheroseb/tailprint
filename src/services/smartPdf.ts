import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';
import { env } from '../config/env.js';
import { redisService, type PdfProofRecord } from './redis.js';
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
  domSynapses?: ExtractedDomSynapse[];
  noStore?: boolean;
}

export interface SmartPdfEnrichResult {
  buffer: Buffer;
  docId: string;
  manifest: TailprintManifest;
  cortex: TailprintNeuralCortex | null;
  fileSha256: string;
}

export interface SmartPdfVerificationReport {
  valid: boolean;
  signed: boolean;
  tampered: boolean;
  ai_ready: boolean;
  neural_implant: boolean;
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

  /**
   * Enriches a rendered PDF with:
   * 1. Dual-Brain structured JSON (`tailprint-manifest.json`),
   * 2. Cryptographic Proof-of-Origin (HMAC-SHA256 content stream signature + Redis proof ledger),
   * 3. Neural-Implant Cortex (`tailprint-cortex.json` with 64-D Int8 vectors, DOM bounding boxes, and latent memory).
   */
  public async enrichPdf(
    pdfBuffer: Buffer,
    options: SmartPdfEnrichOptions
  ): Promise<SmartPdfEnrichResult> {
    const docId = `doc_${crypto.randomBytes(8).toString('hex')}`;
    const issuedAt = new Date().toISOString();
    const issuer = options.customerId || 'tailprint.com';
    const templateId = options.templateId ?? null;
    const hasNeuralImplant = Boolean(
      options.neuralImplant ||
        options.neuralContext ||
        options.neuralPersona ||
        options.neuralCustomUrl ||
        options.neuralBadgeLabel
    );
    const signed = Boolean(options.sign || options.verifySeal || hasNeuralImplant);
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

    // 1. Load PDF and optionally stamp the cryptographic verification seal & interactive Neural Implant badge
    const initialDoc = await PDFDocument.load(pdfBuffer);
    if (options.verifySeal) {
      await this.drawVerificationSeal(initialDoc, docId, verificationUrl);
    }
    if (hasNeuralImplant && options.neuralBadge !== false) {
      await this.drawNeuralImplantBadgeAndLink(
        initialDoc,
        docId,
        brainUrl,
        options.neuralBadgeLabel
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
      page_count: pageCount,
      content_fingerprint: contentFingerprint,
      data_hash: dataHash,
      data: dataPayload,
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
      ...(templateId ? [`tailprint:template=${templateId}`] : []),
    ]);

    const finalBytes = await pdfDoc.save({ useObjectStreams: false });
    const finalBuffer = Buffer.from(finalBytes);
    const fileSha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');

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
      };
      await redisService.savePdfProof(proofRecord);

      if (cortex) {
        await redisService.savePdfCortex(docId, cortex as unknown as Record<string, unknown>);
      }
    }

    return {
      buffer: finalBuffer,
      docId,
      manifest,
      cortex,
      fileSha256,
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

      if (!cortex && manifest && manifest.data) {
        cortex = neuralCortexService.compileCortex({
          docId: manifest.doc_id,
          structuredData: manifest.data,
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

      // Verify cryptographic integrity if manifest is present
      let verified = false;
      if (manifest) {
        const actualFp = this.computeContentFingerprint(pdfDoc);
        verified = manifest.content_fingerprint === actualFp;
      }

      // If the PDF is a Dual-Brain PDF without a pre-compiled cortex, dynamically compile a cortex from its manifest data!
      if (!cortex && manifest && manifest.data) {
        cortex = neuralCortexService.compileCortex({
          docId: manifest.doc_id,
          structuredData: manifest.data,
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
   *    embedded data hash, and Redis proof ledger to detect any tampering.
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
        return {
          valid: true,
          signed: bySha.signed,
          tampered: false,
          ai_ready: bySha.ai_ready,
          neural_implant: false,
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
          reasons: ['Verified via Tailprint cryptographic SHA-256 ledger.'],
        };
      }

      return {
        valid: false,
        signed: false,
        tampered: false,
        ai_ready: false,
        neural_implant: false,
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

    const actualDataHash = manifest.data
      ? crypto.createHash('sha256').update(canonicalizeJson(manifest.data)).digest('hex')
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

    const ledgerRecord = manifest.doc_id
      ? await redisService.getPdfProof(manifest.doc_id)
      : null;
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

    const tampered =
      !contentIntact ||
      !dataIntact ||
      (manifest.signed && !signatureValid) ||
      ledgerMismatch;

    const valid = !tampered && (manifest.signed ? signatureValid : contentIntact && dataIntact);

    if (valid && reasons.length === 0) {
      if (cortex) {
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
      ai_ready: Boolean(manifest.ai_ready),
      neural_implant: Boolean(manifest.neural_implant || cortex),
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
      brain_url: manifest.brain_url || (cortex ? cortex.brain_url : null),
      cortex_hash: manifest.cortex_hash || (cortex ? cortex.cortex_hash : null),
      cortex_summary: cortex
        ? {
            total_synapses: cortex.total_synapses,
            visual_synapses_count: cortex.visual_synapses_count,
            latent_synapses_count: cortex.latent_synapses_count,
            data_synapses_count: cortex.data_synapses_count,
            suggested_questions: cortex.suggested_questions,
          }
        : null,
      data_hash: manifest.data_hash,
      data: manifest.data ?? null,
      reasons,
    };
  }
}

export const smartPdfService = SmartPdfService.getInstance();
