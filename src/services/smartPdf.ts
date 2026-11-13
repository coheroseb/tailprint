import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { PDFDocument, PDFName, StandardFonts, rgb } from 'pdf-lib';
import { env } from '../config/env.js';
import { redisService, type PdfProofRecord } from './redis.js';

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
  noStore?: boolean;
}

export interface SmartPdfEnrichResult {
  buffer: Buffer;
  docId: string;
  manifest: TailprintManifest;
  fileSha256: string;
}

export interface SmartPdfVerificationReport {
  valid: boolean;
  signed: boolean;
  tampered: boolean;
  ai_ready: boolean;
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
   * Because embedded files live in the document catalog (/Names -> /EmbeddedFiles)
   * rather than page nodes, this fingerprint remains identical before and after
   * attaching `tailprint-manifest.json`, while immediately changing if any page text,
   * drawing stream, watermark, or page count is altered.
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
  }): string {
    const canonical = canonicalizeJson(payload);
    return crypto
      .createHmac('sha256', this.getSigningSecret())
      .update(canonical)
      .digest('hex');
  }

  /**
   * Draws a sleek vector "Verified by Tailprint" cryptographic badge on the first page.
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

    // Subtle slate/emerald cryptographic seal box
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

    // Left accent bar
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
   * Enriches a rendered PDF with Dual-Brain structured JSON (`tailprint-manifest.json`)
   * and/or Cryptographic Proof-of-Origin (HMAC-SHA256 content stream signature + Redis proof ledger).
   */
  public async enrichPdf(
    pdfBuffer: Buffer,
    options: SmartPdfEnrichOptions
  ): Promise<SmartPdfEnrichResult> {
    const docId = `doc_${crypto.randomBytes(8).toString('hex')}`;
    const issuedAt = new Date().toISOString();
    const issuer = options.customerId || 'tailprint.com';
    const templateId = options.templateId ?? null;
    const signed = Boolean(options.sign || options.verifySeal);
    const aiReady = options.aiReady !== undefined ? options.aiReady : true;
    const dataPayload =
      options.data && typeof options.data === 'object' && Object.keys(options.data).length > 0
        ? options.data
        : null;

    const appBaseUrl = (env.APP_URL || 'https://tailprint.com').replace(/\/+$/, '');
    const verificationUrl = `${appBaseUrl}/verify/${docId}`;

    // 1. Load PDF and optionally stamp the cryptographic verification seal
    const initialDoc = await PDFDocument.load(pdfBuffer);
    if (options.verifySeal) {
      await this.drawVerificationSeal(initialDoc, docId, verificationUrl);
    }

    // 2. Normalize streams with useObjectStreams: false so content_fingerprint is 100% deterministic
    const normalizedBytes = await initialDoc.save({ useObjectStreams: false });
    const pdfDoc = await PDFDocument.load(normalizedBytes);

    const pageCount = pdfDoc.getPageCount();
    const contentFingerprint = this.computeContentFingerprint(pdfDoc);
    const dataHash = dataPayload
      ? crypto.createHash('sha256').update(canonicalizeJson(dataPayload)).digest('hex')
      : null;

    const signature = signed
      ? this.signManifestPayload({
          doc_id: docId,
          issued_at: issuedAt,
          issuer,
          template_id: templateId,
          page_count: pageCount,
          content_fingerprint: contentFingerprint,
          data_hash: dataHash,
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
      page_count: pageCount,
      content_fingerprint: contentFingerprint,
      data_hash: dataHash,
      data: dataPayload,
      verification_url: verificationUrl,
      signature,
    };

    const manifestJson = JSON.stringify(manifest, null, 2);

    // 3. Attach tailprint-manifest.json into the PDF's /EmbeddedFiles catalog
    await pdfDoc.attach(Buffer.from(manifestJson, 'utf-8'), MANIFEST_FILENAME, {
      mimeType: 'application/json',
      description: 'Tailprint Dual-Brain Structured Payload & Cryptographic Proof Manifest',
      creationDate: new Date(issuedAt),
      modificationDate: new Date(issuedAt),
    });

    pdfDoc.setProducer('Tailprint Dual-Brain PDF Engine (https://tailprint.com)');
    pdfDoc.setKeywords([
      `tailprint:doc_id=${docId}`,
      `tailprint:ai_ready=${String(aiReady)}`,
      `tailprint:signed=${String(signed)}`,
      ...(templateId ? [`tailprint:template=${templateId}`] : []),
    ]);

    const finalBytes = await pdfDoc.save({ useObjectStreams: false });
    const finalBuffer = Buffer.from(finalBytes);
    const fileSha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');

    // 4. Store cryptographic proof record in Redis (unless zero-retention no_store is active)
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
    }

    return {
      buffer: finalBuffer,
      docId,
      manifest,
      fileSha256,
    };
  }

  /**
   * Extracts `tailprint-manifest.json` from a PDF document's /EmbeddedFiles catalog
   * in 0ms without OCR.
   */
  public extractManifestFromPdfDoc(
    pdfDoc: PDFDocument,
    rawBuffer: Buffer
  ): TailprintManifest | null {
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

              if (lowerName.includes('tailprint-manifest') || lowerName.endsWith('.json')) {
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

                if (jsonText.includes(DUAL_BRAIN_CONTEXT) || jsonText.includes('"doc_id"')) {
                  return JSON.parse(jsonText) as TailprintManifest;
                }
              }
            }
          }
        }
      }
    } catch {
      // Fall through to raw scan
    }

    // Fallback scan for uncompressed JSON manifest stream
    try {
      const rawText = rawBuffer.toString('utf-8');
      const idx = rawText.indexOf(DUAL_BRAIN_CONTEXT);
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
                  return JSON.parse(candidate) as TailprintManifest;
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

  /**
   * Inspects a PDF buffer to:
   * 1. Extract its Dual-Brain structured JSON (`data`) in 0ms without OCR.
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

    if (!manifest) {
      // Check if exact file hash exists in Redis ledger
      const bySha = await redisService.getPdfProofBySha256(fileSha256);
      if (bySha) {
        return {
          valid: true,
          signed: bySha.signed,
          tampered: false,
          ai_ready: bySha.ai_ready,
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
        data_hash: null,
        data: null,
        reasons: [
          'No embedded Tailprint Dual-Brain manifest (tailprint-manifest.json) or cryptographic signature found in this PDF.',
        ],
      };
    }

    // 1. Check content stream fingerprint (detects any visual edits, added pages, or watermarks)
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

    // 2. Check embedded JSON data integrity against data_hash
    const actualDataHash = manifest.data
      ? crypto.createHash('sha256').update(canonicalizeJson(manifest.data)).digest('hex')
      : null;
    const dataIntact = manifest.data_hash === actualDataHash;
    if (!dataIntact) {
      reasons.push(
        'Embedded Dual-Brain JSON payload was modified after issuance (data_hash mismatch).'
      );
    }

    // 3. Verify cryptographic HMAC-SHA256 signature if signed
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

    // 4. Cross-check Redis ledger if record is stored
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
      if (manifest.signed) {
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
      data_hash: manifest.data_hash,
      data: manifest.data ?? null,
      reasons,
    };
  }
}

export const smartPdfService = SmartPdfService.getInstance();
