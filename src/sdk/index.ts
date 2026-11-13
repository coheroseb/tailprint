/**
 * Official Tailprint TypeScript / Node.js Client SDK
 * High-performance Tailwind HTML to PDF, EU Factur-X E-Invoicing & Document Automation
 * Documentation: https://tailprint.com/docs
 */

export interface TailprintOptions {
  /**
   * Your Tailprint API Key (e.g. "sec_live_...").
   * Defaults to process.env.TAILPRINT_API_KEY if not explicitly passed.
   */
  apiKey?: string;
  /**
   * Base URL of the Tailprint API. Defaults to "https://tailprint.com".
   */
  baseUrl?: string;
  /**
   * Global request timeout in milliseconds. Defaults to 30000 (30 seconds).
   */
  timeoutMs?: number;
}

export interface RenderPdfOptions {
  html?: string;
  url?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  print_background?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  display_header_footer?: boolean;
  header_html?: string;
  footer_html?: string;
  password?: string;
  owner_password?: string;
  wait_for?: string;
  delay_ms?: number;
  block_popups?: boolean;
  smart_pagination?: boolean;
  no_store?: boolean;
  store?: boolean;
  expires_in?: '1h' | '24h' | '7d';
}

export interface StoredFileResponse {
  success: boolean;
  hostedUrl: string;
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string;
}

export interface EInvoiceParty {
  name: string;
  vatId?: string;
  country: string;
  street?: string;
  city?: string;
  postcode?: string;
  email?: string;
}

export interface EInvoiceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export interface GenerateEInvoiceOptions {
  invoiceNumber: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  lineItems: EInvoiceLineItem[];
  paymentIban?: string;
  paymentBic?: string;
  notes?: string;
  profile?: 'BASIC' | 'EN16931';
  store?: boolean;
  expires_in?: '1h' | '24h' | '7d';
}

export interface ValidateEInvoiceOptions {
  pdf?: Buffer | Uint8Array | string;
  xml?: string;
}

export interface EInvoiceValidationReport {
  isValid: boolean;
  hasEmbeddedXml: boolean;
  xmlFilename: string | null;
  standard: string;
  profile: string;
  profileUrn: string | null;
  invoiceDetails: {
    invoiceNumber: string | null;
    issueDate: string | null;
    dueDate: string | null;
    currency: string | null;
    seller: {
      name: string | null;
      vatId: string | null;
      country: string | null;
      city: string | null;
    } | null;
    buyer: {
      name: string | null;
      vatId: string | null;
      country: string | null;
      city: string | null;
    } | null;
    totals: {
      lineTotalAmount: number | null;
      taxBasisTotalAmount: number | null;
      taxTotalAmount: number | null;
      grandTotalAmount: number | null;
      duePayableAmount: number | null;
    } | null;
    lineItemsCount: number;
    paymentIban: string | null;
  } | null;
  errors: string[];
  warnings: string[];
}

export class TailprintError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'TailprintError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class Tailprint {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: TailprintOptions = {}) {
    this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env?.TAILPRINT_API_KEY || '' : '');
    this.baseUrl = (options.baseUrl || 'https://tailprint.com').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 30000;
  }

  private bufferToBase64(buf: Buffer | Uint8Array | string): string {
    if (typeof buf === 'string') {
      return buf;
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buf)) {
      return `data:application/pdf;base64,${buf.toString('base64')}`;
    }
    // Uint8Array fallback
    const binary = Array.from(buf).map((b) => String.fromCharCode(b)).join('');
    return `data:application/pdf;base64,${btoa(binary)}`;
  }

  private async request(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      body?: any;
      headers?: Record<string, string>;
      expectBinary?: boolean;
    } = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      ...(options.headers || {}),
    };

    let bodyPayload: any;
    if (options.body) {
      headers['Content-Type'] = 'application/json';
      bodyPayload = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers,
        body: bodyPayload,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text() };
        }
        throw new TailprintError(
          errorData.message || `Tailprint request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      if (options.expectBinary) {
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }

      const arrayBuf = await response.arrayBuffer();
      return Buffer.from(arrayBuf);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /**
   * Compiles HTML styled with Tailwind CSS (or a public URL) into a vector PDF document.
   */
  public async renderPdf(options: RenderPdfOptions & { store: true }): Promise<StoredFileResponse>;
  public async renderPdf(options: RenderPdfOptions): Promise<Buffer>;
  public async renderPdf(options: RenderPdfOptions): Promise<Buffer | StoredFileResponse> {
    const isStored = options.store === true;
    return this.request('/v1/render/pdf', {
      body: options,
      expectBinary: !isStored,
    });
  }

  /**
   * Generates a legally compliant European hybrid electronic invoice (Factur-X / ZUGFeRD 2.2 / EN 16931).
   */
  public async generateEInvoice(options: GenerateEInvoiceOptions & { store: true }): Promise<StoredFileResponse>;
  public async generateEInvoice(options: GenerateEInvoiceOptions): Promise<Buffer>;
  public async generateEInvoice(options: GenerateEInvoiceOptions): Promise<Buffer | StoredFileResponse> {
    const isStored = options.store === true;
    return this.request('/v1/render/einvoice', {
      body: options,
      expectBinary: !isStored,
    });
  }

  /**
   * Merges multiple PDF documents (buffers, base64 strings, or URLs) into a single unified vector PDF.
   */
  public async mergePdfs(
    pdfs: Array<Buffer | Uint8Array | string>,
    options: { output_filename?: string; store?: boolean; expires_in?: '1h' | '24h' | '7d' } = {}
  ): Promise<Buffer | StoredFileResponse> {
    const encodedPdfs = pdfs.map((p) => this.bufferToBase64(p));
    return this.request('/v1/pdf/merge', {
      body: {
        pdfs: encodedPdfs,
        output_filename: options.output_filename,
        store: options.store,
        expires_in: options.expires_in,
      },
      expectBinary: options.store !== true,
    });
  }

  /**
   * Extracts specific pages or page ranges (e.g. "1-3, 5, 8-10") from a source PDF document into a new PDF.
   */
  public async splitPdf(
    pdf: Buffer | Uint8Array | string,
    pages: string,
    options: { output_filename?: string; store?: boolean; expires_in?: '1h' | '24h' | '7d' } = {}
  ): Promise<Buffer | StoredFileResponse> {
    return this.request('/v1/pdf/split', {
      body: {
        pdf: this.bufferToBase64(pdf),
        pages,
        output_filename: options.output_filename,
        store: options.store,
        expires_in: options.expires_in,
      },
      expectBinary: options.store !== true,
    });
  }

  /**
   * Populates interactive AcroForm PDF fields with key-value data and optionally flattens the form.
   */
  public async fillPdfForm(
    pdf: Buffer | Uint8Array | string,
    fields: Record<string, string | number | boolean>,
    options: { flatten?: boolean; output_filename?: string; store?: boolean; expires_in?: '1h' | '24h' | '7d' } = {}
  ): Promise<Buffer | StoredFileResponse> {
    return this.request('/v1/pdf/fill-form', {
      body: {
        pdf: this.bufferToBase64(pdf),
        fields,
        flatten: options.flatten ?? true,
        output_filename: options.output_filename,
        store: options.store,
        expires_in: options.expires_in,
      },
      expectBinary: options.store !== true,
    });
  }

  /**
   * Compresses and compacts a PDF document by packaging internal objects into compressed streams.
   */
  public async compressPdf(
    pdf: Buffer | Uint8Array | string,
    options: { output_filename?: string; store?: boolean; expires_in?: '1h' | '24h' | '7d' } = {}
  ): Promise<Buffer | StoredFileResponse> {
    return this.request('/v1/pdf/compress', {
      body: {
        pdf: this.bufferToBase64(pdf),
        output_filename: options.output_filename,
        store: options.store,
        expires_in: options.expires_in,
      },
      expectBinary: options.store !== true,
    });
  }

  /**
   * Applies a diagonal, semi-transparent watermark or compliance stamp across all pages of a PDF.
   */
  public async stampPdf(
    pdf: Buffer | Uint8Array | string,
    watermarkText: string,
    options: {
      color?: 'red' | 'gray' | 'blue';
      opacity?: number;
      font_size?: number;
      output_filename?: string;
      store?: boolean;
      expires_in?: '1h' | '24h' | '7d';
    } = {}
  ): Promise<Buffer | StoredFileResponse> {
    return this.request('/v1/pdf/stamp', {
      body: {
        pdf: this.bufferToBase64(pdf),
        watermark_text: watermarkText,
        color: options.color || 'red',
        opacity: options.opacity || 0.15,
        font_size: options.font_size || 54,
        output_filename: options.output_filename,
        store: options.store,
        expires_in: options.expires_in,
      },
      expectBinary: options.store !== true,
    });
  }

  /**
   * Inspects a PDF or XML document to verify compliance with European standard EN 16931 / Factur-X / ZUGFeRD 2.2.
   */
  public async validateEInvoice(options: ValidateEInvoiceOptions): Promise<EInvoiceValidationReport> {
    const payload: any = {};
    if (options.pdf) {
      payload.pdf = this.bufferToBase64(options.pdf);
    }
    if (options.xml) {
      payload.xml = options.xml;
    }
    return this.request('/v1/pdf/validate-einvoice', {
      body: payload,
    });
  }

  /**
   * Returns real-time API quota usage and billing cycle information.
   */
  public async getUsage(): Promise<{
    status: 'active' | 'inactive';
    plan: string;
    monthly_limit: number;
    current_usage: number;
    remaining: number;
    percent_used: string;
    period_start: string;
    resets_at: string;
  }> {
    return this.request('/v1/usage', {
      method: 'GET',
    });
  }
}
