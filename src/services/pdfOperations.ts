import { PDFDocument } from 'pdf-lib';

export interface MergePdfsOptions {
  pdfBuffers: Buffer[];
}

export interface SplitPdfOptions {
  pdfBuffer: Buffer;
  /**
   * Page ranges string, e.g. "1-3, 5, 8-10" or array of 1-based page numbers
   */
  pages: string | number[];
}

export interface FillPdfFormOptions {
  pdfBuffer: Buffer;
  fields: Record<string, string | number | boolean>;
  flatten?: boolean;
}

export class PdfOperationsService {
  private static instance: PdfOperationsService | null = null;

  public static getInstance(): PdfOperationsService {
    if (!PdfOperationsService.instance) {
      PdfOperationsService.instance = new PdfOperationsService();
    }
    return PdfOperationsService.instance;
  }

  /**
   * Resolves a PDF buffer from a base64 data URI, raw base64 string, or public HTTP/HTTPS URL.
   */
  public async resolvePdfBuffer(input: string): Promise<Buffer> {
    const trimmed = input.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const res = await fetch(trimmed, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/pdf,application/octet-stream,*/*;q=0.9',
          'Accept-Language': 'da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      if (!res.ok) {
        throw new Error(
          `Failed to download PDF from URL (${trimmed}): ${res.statusText} (${res.status}). Note: Some websites (like sst.dk behind Vercel Bot Protection) block automated downloads with HTTP 429.`
        );
      }
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
    const cleanBase64 = trimmed.replace(/^data:application\/pdf;base64,/, '').trim();
    return Buffer.from(cleanBase64, 'base64');
  }

  /**
   * Merges multiple PDF buffers into a single combined vector PDF.
   */
  public async mergePdfs(options: MergePdfsOptions): Promise<Buffer> {
    const { pdfBuffers } = options;
    if (!pdfBuffers || pdfBuffers.length === 0) {
      throw new Error('At least one PDF buffer is required to merge');
    }

    const mergedDoc = await PDFDocument.create();

    for (const buf of pdfBuffers) {
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }

    const mergedBytes = await mergedDoc.save();
    return Buffer.from(mergedBytes);
  }

  /**
   * Splits a PDF or extracts specific pages specified by comma-separated ranges (e.g. "1-3, 5, 8-10").
   */
  public async splitPdf(options: SplitPdfOptions): Promise<Buffer> {
    const { pdfBuffer, pages } = options;
    const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // Parse requested 0-based page indices
    const indicesToExtract: number[] = [];

    if (Array.isArray(pages)) {
      for (const p of pages) {
        const idx = p - 1;
        if (idx >= 0 && idx < totalPages && !indicesToExtract.includes(idx)) {
          indicesToExtract.push(idx);
        }
      }
    } else if (typeof pages === 'string') {
      const parts = pages.split(',').map((s) => s.trim());
      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
          if (!isNaN(startStr) && !isNaN(endStr)) {
            const start = Math.max(1, Math.min(startStr, endStr));
            const end = Math.min(totalPages, Math.max(startStr, endStr));
            for (let p = start; p <= end; p++) {
              const idx = p - 1;
              if (!indicesToExtract.includes(idx)) {
                indicesToExtract.push(idx);
              }
            }
          }
        } else {
          const p = parseInt(part, 10);
          if (!isNaN(p) && p >= 1 && p <= totalPages) {
            const idx = p - 1;
            if (!indicesToExtract.includes(idx)) {
              indicesToExtract.push(idx);
            }
          }
        }
      }
    }

    if (indicesToExtract.length === 0) {
      throw new Error(`No valid pages selected within range 1-${totalPages}`);
    }

    // Sort page indices to preserve order
    indicesToExtract.sort((a, b) => a - b);

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indicesToExtract);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    const resultBytes = await newDoc.save();
    return Buffer.from(resultBytes);
  }

  /**
   * Programmatically fills form fields in an interactive AcroForm PDF.
   */
  public async fillPdfForm(options: FillPdfFormOptions): Promise<{ buffer: Buffer; filledFields: string[]; availableFields: string[] }> {
    const { pdfBuffer, fields, flatten = true } = options;
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    let form;
    try {
      form = doc.getForm();
    } catch {
      throw new Error('This PDF does not contain interactive form fields (AcroForm).');
    }

    const availableFields = form.getFields().map((f) => f.getName());
    const filledFields: string[] = [];

    for (const [key, val] of Object.entries(fields)) {
      try {
        const field = form.getFieldMaybe(key);
        if (!field) continue;

        const constructorName = field.constructor.name;

        if (constructorName.includes('TextField') || typeof val === 'string' || typeof val === 'number') {
          form.getTextField(key).setText(String(val));
          filledFields.push(key);
        } else if (constructorName.includes('CheckBox')) {
          const checkBox = form.getCheckBox(key);
          if (Boolean(val)) {
            checkBox.check();
          } else {
            checkBox.uncheck();
          }
          filledFields.push(key);
        } else if (constructorName.includes('Dropdown')) {
          form.getDropdown(key).select(String(val));
          filledFields.push(key);
        } else if (constructorName.includes('RadioGroup')) {
          form.getRadioGroup(key).select(String(val));
          filledFields.push(key);
        }
      } catch {}
    }

    if (flatten) {
      try {
        form.flatten();
      } catch {}
    }

    const filledBytes = await doc.save();
    return {
      buffer: Buffer.from(filledBytes),
      filledFields,
      availableFields,
    };
  }

  /**
   * Compresses PDF by pruning unused objects and compacting internal streams.
   */
  public async compressPdf(pdfBuffer: Buffer): Promise<Buffer> {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    // PDF-lib's useObjectStreams flag bundles objects into compressed streams, significantly reducing byte size
    const compressedBytes = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    return Buffer.from(compressedBytes);
  }
}

export const pdfOperationsService = PdfOperationsService.getInstance();
