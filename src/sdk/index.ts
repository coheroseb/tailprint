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
  /** Hosted template id, e.g. "invoice-modern". Use together with `data` instead of html/url. */
  template_id?: string;
  /** JSON data for `template_id`. See `listTemplates()` / `getTemplate()`. */
  data?: Record<string, unknown>;
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
  async?: boolean;
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  /** Optional Idempotency-Key (max 255 chars) to safely retry requests without duplicate renders or quota deduction. */
  idempotency_key?: string;
  idempotencyKey?: string;
  /** Dual-Brain PDF mode: embeds lossless structured JSON-LD manifest (tailprint-manifest.json) inside the PDF catalog. */
  ai_ready?: boolean;
  /** Structured JSON payload to embed inside the Dual-Brain PDF container for 0ms zero-OCR extraction. */
  embed_data?: Record<string, unknown>;
  /** Cryptographic Proof-of-Origin: signs the PDF content streams and embedded manifest with HMAC-SHA256. */
  sign?: boolean;
  /** Renders a sleek vector "Verified by Tailprint" cryptographic seal onto the PDF document. */
  verify_seal?: boolean;
  /** White-label custom URL for the cryptographic verification seal and verification_url (supports {{doc_id}} placeholder). */
  verify_custom_url?: string;
  /** Neural-Implant PDF mode: compiles a Neuro-Symbolic Spatial Cortex (64-D Int8 vectors, DOM bounding boxes, and latent memory) into the PDF. */
  neural_implant?: boolean;
  /** Persona and instructions implanted into the PDF Neural Cortex. */
  neural_persona?: string;
  /** Subconscious Latent Memory implanted into the PDF Cortex (unprinted domain knowledge, FAQs, SLA, GDPR). */
  neural_context?: Record<string, unknown> | string;
  /** Whether to draw the clickable Neural-Implant badge on the PDF page (defaults to true). Set false for headless/API-only mode. */
  neural_badge?: boolean;
  /** White-label custom URL for the clickable PDF badge and brain_url (e.g. "https://portal.mycompany.com/docs/{{doc_id}}"). */
  neural_custom_url?: string;
  /** Custom white-label title text on the clickable PDF badge. */
  neural_badge_label?: string;
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

export interface BatchItemOptions {
  html?: string;
  url?: string;
  template_id?: string;
  data?: Record<string, unknown>;
  filename?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: RenderPdfOptions['margin'];
  header_html?: string;
  footer_html?: string;
  smart_pagination?: boolean;
  delay_ms?: number;
}

export interface RenderBatchOptions {
  items: BatchItemOptions[];
  merge_output?: boolean;
  merged_filename?: string;
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  expires_in?: '1h' | '24h' | '7d';
  idempotency_key?: string;
  idempotencyKey?: string;
}

export interface AsyncJobAccepted {
  success: boolean;
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  status_url: string;
  webhook_url?: string;
  created_at: string;
}

export interface JobStatus {
  job_id: string;
  type: 'render_pdf' | 'batch_pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: Array<{
    index: number;
    filename: string;
    file_id?: string;
    download_url?: string;
    size_bytes?: number;
    pages?: number;
    status: 'completed' | 'failed';
    error?: string;
    render_time_ms?: number;
  }>;
  merged_output?: {
    file_id: string;
    download_url: string;
    filename: string;
    size_bytes?: number;
    pages?: number;
  };
  webhook_delivery?: {
    url: string;
    status_code?: number;
    delivered: boolean;
    delivered_at?: string;
    error?: string;
  };
  error?: string | null;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface TemplateSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  format: string;
  landscape: boolean;
}

export interface TemplateDetails extends TemplateSummary {
  example_data: Record<string, unknown>;
  example_request: { template_id: string; data: Record<string, unknown> };
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
  idempotency_key?: string;
  idempotencyKey?: string;
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
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
      const { idempotency_key, idempotencyKey, ...restBody } = options.body;
      const resolvedIdemp = idempotencyKey || idempotency_key;
      if (resolvedIdemp) {
        headers['Idempotency-Key'] = String(resolvedIdemp);
      }
      headers['Content-Type'] = 'application/json';
      bodyPayload = JSON.stringify(restBody);
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
   * Lists the hosted document templates that can be rendered with `renderPdf({ template_id, data })`.
   */
  public async listTemplates(): Promise<TemplateSummary[]> {
    const res = await this.request('/v1/templates', { method: 'GET' });
    return res.templates;
  }

  /**
   * Returns a hosted template with complete example data and a ready-to-send request body.
   */
  public async getTemplate(templateId: string): Promise<TemplateDetails> {
    return this.request(`/v1/templates/${encodeURIComponent(templateId)}`, { method: 'GET' });
  }

  /**
   * Creates or overwrites a custom hosted Mustache + Tailwind CSS template on your account (Starter+ plan required).
   */
  public async createTemplate(options: {
    id: string;
    title: string;
    html: string;
    category?: string;
    description?: string;
    required_fields?: string[];
    default_data?: Record<string, unknown>;
    example_data?: Record<string, unknown>;
    format?: 'A4' | 'Letter' | 'Legal';
    landscape?: boolean;
    smart_pagination?: boolean;
  }): Promise<any> {
    return this.request('/v1/templates', { method: 'POST', body: options });
  }

  /**
   * Updates an existing custom hosted template on your account (Starter+ plan required).
   */
  public async updateTemplate(
    templateId: string,
    options: {
      title: string;
      html: string;
      category?: string;
      description?: string;
      required_fields?: string[];
      default_data?: Record<string, unknown>;
      example_data?: Record<string, unknown>;
      format?: 'A4' | 'Letter' | 'Legal';
      landscape?: boolean;
      smart_pagination?: boolean;
    }
  ): Promise<any> {
    return this.request(`/v1/templates/${encodeURIComponent(templateId)}`, {
      method: 'PUT',
      body: options,
    });
  }

  /**
   * Deletes a custom hosted template from your account (Starter+ plan required).
   */
  public async deleteTemplate(templateId: string): Promise<{ success: boolean; deleted: string }> {
    return this.request(`/v1/templates/${encodeURIComponent(templateId)}`, {
      method: 'DELETE',
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
   * Submits a PDF rendering job asynchronously in background. Returns immediately with job_id and status_url.
   */
  public async renderPdfAsync(
    options: RenderPdfOptions & { webhook_url?: string; webhook_headers?: Record<string, string> }
  ): Promise<AsyncJobAccepted> {
    return this.request('/v1/render/pdf', {
      body: {
        ...options,
        async: true,
      },
    });
  }

  /**
   * Submits up to 100 documents for concurrent batch rendering with optional merging and webhook notifications.
   */
  public async renderBatch(options: RenderBatchOptions): Promise<AsyncJobAccepted> {
    return this.request('/v1/render/batch', {
      body: options,
    });
  }

  /**
   * Retrieves the current processing status, progress, and download links of a render or batch job.
   */
  public async getJob(jobId: string): Promise<JobStatus> {
    return this.request(`/v1/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    });
  }

  /**
   * Polls a job until it finishes (reaches 'completed' or 'failed'), or until timeoutMs expires.
   */
  public async waitForJob(
    jobId: string,
    options: { pollIntervalMs?: number; timeoutMs?: number } = {}
  ): Promise<JobStatus> {
    const pollInterval = options.pollIntervalMs ?? 1000;
    const timeout = options.timeoutMs ?? 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.getJob(jobId);
      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new TailprintError(
      `Job ${jobId} did not complete within timeout of ${timeout}ms`,
      408
    );
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

  /**
   * Cryptographically verifies the HMAC-SHA256 proof-of-origin signature and visual page stream fingerprint
   * of a Tailprint PDF, and extracts its Dual-Brain structured JSON payload in 0ms without OCR.
   */
  public async verifyPdf(pdf: Buffer | Uint8Array | string): Promise<SmartPdfVerificationReport> {
    return this.request('/v1/pdf/verify', {
      body: { pdf: this.bufferToBase64(pdf) },
    });
  }

  /**
   * Extracts the lossless, machine-readable structured JSON-LD payload (`tailprint-manifest.json`)
   * embedded inside a Tailprint Dual-Brain PDF in 0ms without OCR or LLM vision token cost.
   */
  public async extractPdfData(pdf: Buffer | Uint8Array | string): Promise<SmartPdfVerificationReport> {
    return this.request('/v1/pdf/extract', {
      body: { pdf: this.bufferToBase64(pdf) },
    });
  }

  /**
   * Queries a Neural-Implant PDF's Spatial Cortex & Subconscious Latent Memory in sub-milliseconds.
   */
  public async askPdf(
    pdfOrDocId: Buffer | Uint8Array | string,
    question: string
  ): Promise<Record<string, any>> {
    const isDocId = typeof pdfOrDocId === 'string' && pdfOrDocId.startsWith('doc_');
    return this.request('/v1/pdf/ask', {
      body: isDocId
        ? { doc_id: pdfOrDocId, question }
        : { pdf: this.bufferToBase64(pdfOrDocId), question },
    });
  }

  /**
   * Retrieves the full compiled Neural-Implant Cortex (including suggested_questions, persona,
   * synapses with physical page bounding boxes, and knowledge_graph) by doc_id or PDF binary.
   */
  public async getCortex(
    pdfOrDocId: Buffer | Uint8Array | string
  ): Promise<Record<string, any>> {
    const isDocId = typeof pdfOrDocId === 'string' && pdfOrDocId.startsWith('doc_');
    return this.request('/v1/pdf/cortex', {
      body: isDocId
        ? { doc_id: pdfOrDocId }
        : { pdf: this.bufferToBase64(pdfOrDocId) },
    });
  }

  /**
   * 🧬 CRISPR-PDF™: Sequences 2 to 10 parent PDFs (or Tailprint doc_ids) into chromosomes,
   * excises Cas9 knockout terms, resolves conflicting alleles, applies point mutations,
   * and expresses a newly typeset Vector Master Offspring PDF with a fused Multi-Parent Neural Cortex.
   */
  public async splicePdfs(options: {
    pdfs: Array<
      | Buffer
      | Uint8Array
      | string
      | { pdf?: Buffer | Uint8Array | string; doc_id?: string; label?: string }
    >;
    title?: string;
    subtitle?: string;
    phenotype?: 'executive-indigo' | 'legal-contract' | 'board-dossier';
    mutations?: Record<string, unknown>;
    knockout_terms?: string[];
    neural_persona?: string;
    neural_custom_url?: string;
    neural_badge_label?: string;
    verify_custom_url?: string;
    store?: boolean;
    return_report?: boolean;
  }): Promise<any> {
    const encodedPdfs = options.pdfs.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (
        typeof Buffer !== 'undefined' &&
        (Buffer.isBuffer(item) || item instanceof Uint8Array)
      ) {
        return this.bufferToBase64(item);
      }
      const obj = item as { pdf?: Buffer | Uint8Array | string; doc_id?: string; label?: string };
      return {
        ...(obj.pdf ? { pdf: this.bufferToBase64(obj.pdf) } : {}),
        ...(obj.doc_id ? { doc_id: obj.doc_id } : {}),
        ...(obj.label ? { label: obj.label } : {}),
      };
    });

    const expectBinary = !options.store && !options.return_report;
    return this.request('/v1/pdf/splice', {
      body: {
        ...options,
        pdfs: encodedPdfs,
      },
      expectBinary,
    });
  }

  /**
   * 🧬 CRISPR-PDF™: Sequences 1 to 10 PDFs (or Tailprint doc_ids) into their constituent chromosomes
   * (Visual Exons, Data Proteome, and Latent Epigenome).
   */
  public async sequenceGenome(
    pdfs: Array<
      | Buffer
      | Uint8Array
      | string
      | { pdf?: Buffer | Uint8Array | string; doc_id?: string; label?: string }
    >
  ): Promise<{ count: number; genomes: Array<Record<string, any>> }> {
    const encodedPdfs = pdfs.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (
        typeof Buffer !== 'undefined' &&
        (Buffer.isBuffer(item) || item instanceof Uint8Array)
      ) {
        return this.bufferToBase64(item);
      }
      const obj = item as { pdf?: Buffer | Uint8Array | string; doc_id?: string; label?: string };
      return {
        ...(obj.pdf ? { pdf: this.bufferToBase64(obj.pdf) } : {}),
        ...(obj.doc_id ? { doc_id: obj.doc_id } : {}),
        ...(obj.label ? { label: obj.label } : {}),
      };
    });

    return this.request('/v1/pdf/genome', {
      body: { pdfs: encodedPdfs },
    });
  }
}
