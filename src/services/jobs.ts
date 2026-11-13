import crypto from 'node:crypto';
import pLimit from 'p-limit';
import { env } from '../config/env.js';
import { redisService } from './redis.js';
import { browserService } from './browser.js';
import { storageService } from './storage.js';
import { pdfOperationsService } from './pdfOperations.js';
import type {
  RenderPdfOutput,
  RenderBatchRequest,
  JobStatusResponse,
  JobResultItem,
} from '../schemas/render.js';

export interface CreateJobOptions {
  type: 'render_pdf' | 'batch_pdf';
  customerId?: string;
  apiKeyToken?: string;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  totalItems: number;
}

export class JobsService {
  private static instance: JobsService | null = null;
  // Local fallback storage in case Redis is unavailable or for rapid memory access
  private memoryJobs = new Map<string, JobStatusResponse>();

  private constructor() {}

  public static getInstance(): JobsService {
    if (!JobsService.instance) {
      JobsService.instance = new JobsService();
    }
    return JobsService.instance;
  }

  public generateJobId(type: 'render' | 'batch'): string {
    const randomHex = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    return `job_${type}_${randomHex}`;
  }

  public async createJob(options: CreateJobOptions): Promise<JobStatusResponse> {
    const jobId = this.generateJobId(options.type === 'render_pdf' ? 'render' : 'batch');
    const now = new Date().toISOString();

    const jobRecord: JobStatusResponse = {
      job_id: jobId,
      type: options.type,
      status: 'pending',
      progress: {
        total: options.totalItems,
        completed: 0,
        failed: 0,
      },
      results: [],
      error: null,
      created_at: now,
    };

    if (options.webhookUrl) {
      jobRecord.webhook_delivery = {
        url: options.webhookUrl,
        delivered: false,
      };
    }

    await this.saveJob(jobRecord, options.apiKeyToken, options.webhookHeaders);
    return jobRecord;
  }

  public async getJob(jobId: string): Promise<JobStatusResponse | null> {
    const memoryJob = this.memoryJobs.get(jobId);
    if (memoryJob) return memoryJob;

    try {
      const parsed = await redisService.getJson<JobStatusResponse>(`job:${jobId}`);
      if (!parsed) return null;
      this.memoryJobs.set(jobId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private async saveJob(
    job: JobStatusResponse,
    apiKeyToken?: string,
    webhookHeaders?: Record<string, string>
  ): Promise<void> {
    this.memoryJobs.set(job.job_id, job);

    try {
      // Keep jobs in Redis for 7 days (604,800 seconds)
      await redisService.setJson(`job:${job.job_id}`, job, 604800);

      // Save webhook headers & token metadata if provided
      if (apiKeyToken || webhookHeaders) {
        const meta = { apiKeyToken, webhookHeaders };
        await redisService.setJson(`job_meta:${job.job_id}`, meta, 604800);
      }
    } catch (err) {
      console.warn(`[JobsService] Failed to persist job ${job.job_id} to Redis:`, err);
    }
  }

  public async getJobMeta(jobId: string): Promise<{
    apiKeyToken?: string;
    webhookHeaders?: Record<string, string>;
  } | null> {
    try {
      return await redisService.getJson<any>(`job_meta:${jobId}`);
    } catch {
      return null;
    }
  }

  public async dispatchWebhook(
    job: JobStatusResponse,
    event: 'render.completed' | 'batch.completed' | 'render.failed',
    payload: any,
    signingSecret?: string,
    customHeaders?: Record<string, string>
  ): Promise<void> {
    const webhookUrl = job.webhook_delivery?.url;
    if (!webhookUrl) return;

    const payloadJson = JSON.stringify({
      id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      event,
      created_at: new Date().toISOString(),
      job_id: job.job_id,
      status: job.status,
      data: payload,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Tailprint-Webhooks/1.0 (+https://tailprint.com)',
      'X-Tailprint-Event': event,
      'X-Tailprint-Job-Id': job.job_id,
      'X-Tailprint-Timestamp': String(Math.floor(Date.now() / 1000)),
      ...(customHeaders ?? {}),
    };

    if (signingSecret) {
      const signature = crypto
        .createHmac('sha256', signingSecret)
        .update(payloadJson)
        .digest('hex');
      headers['X-Tailprint-Signature'] = `sha256=${signature}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payloadJson,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      job.webhook_delivery = {
        url: webhookUrl,
        status_code: res.status,
        delivered: res.ok,
        delivered_at: new Date().toISOString(),
        error: res.ok ? undefined : `Webhook responded with status ${res.status}`,
      };
    } catch (err: any) {
      job.webhook_delivery = {
        url: webhookUrl,
        delivered: false,
        delivered_at: new Date().toISOString(),
        error: err.name === 'AbortError' ? 'Webhook request timed out after 10000ms' : (err.message || String(err)),
      };
    }

    await this.saveJob(job);
  }

  /**
   * Processes a single PDF render in background (async: true)
   */
  public async processRenderPdfJob(
    jobId: string,
    params: RenderPdfOutput,
    apiKeyToken?: string
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    const startTime = Date.now();
    job.status = 'processing';
    job.started_at = new Date().toISOString();
    await this.saveJob(job, apiKeyToken, params.webhook_headers);

    const meta = await this.getJobMeta(jobId);
    const signingKey = apiKeyToken || meta?.apiKeyToken;

    try {
      const pdfBuffer = await browserService.renderPdf(params);
      const renderDuration = Date.now() - startTime;

      // Always save async outputs so they have a persistent download URL
      const stored = await storageService.saveFile(pdfBuffer, {
        mimeType: 'application/pdf',
        extension: 'pdf',
        filename: 'rendered.pdf',
        expiresIn: params.expires_in ?? '24h',
      });

      const resultItem: JobResultItem = {
        index: 0,
        filename: 'rendered.pdf',
        file_id: stored.fileId,
        download_url: stored.hostedUrl,
        size_bytes: pdfBuffer.length,
        status: 'completed',
        render_time_ms: renderDuration,
      };

      job.status = 'completed';
      job.completed_at = new Date().toISOString();
      job.duration_ms = Date.now() - startTime;
      job.progress.completed = 1;
      job.results = [resultItem];

      await this.saveJob(job, apiKeyToken, params.webhook_headers);

      if (params.webhook_url) {
        await this.dispatchWebhook(
          job,
          'render.completed',
          {
            file_id: stored.fileId,
            download_url: stored.hostedUrl,
            filename: stored.filename,
            size_bytes: pdfBuffer.length,
            duration_ms: renderDuration,
            expires_at: stored.expiresAt,
          },
          signingKey,
          params.webhook_headers
        );
      }
    } catch (err: any) {
      job.status = 'failed';
      job.completed_at = new Date().toISOString();
      job.duration_ms = Date.now() - startTime;
      job.progress.failed = 1;
      job.error = err.message || 'PDF render failed';

      await this.saveJob(job, apiKeyToken, params.webhook_headers);

      if (params.webhook_url) {
        await this.dispatchWebhook(
          job,
          'render.failed',
          {
            error: job.error,
            duration_ms: job.duration_ms,
          },
          signingKey,
          params.webhook_headers
        );
      }
    }
  }

  /**
   * Processes a batch of multiple PDF documents in background
   */
  public async processBatchJob(
    jobId: string,
    params: RenderBatchRequest,
    apiKeyToken?: string
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    const startTime = Date.now();
    job.status = 'processing';
    job.started_at = new Date().toISOString();
    await this.saveJob(job, apiKeyToken, params.webhook_headers);

    const meta = await this.getJobMeta(jobId);
    const signingKey = apiKeyToken || meta?.apiKeyToken;

    // Use concurrency throttle of 3 workers so we don't overwhelm Chromium
    const limit = pLimit(3);
    const results: JobResultItem[] = new Array(params.items.length);
    const successfulBuffers: { index: number; buffer: Buffer }[] = [];

    const tasks = params.items.map((item, index) =>
      limit(async () => {
        const itemStartTime = Date.now();
        const filename = item.filename || `document-${index + 1}.pdf`;

        try {
          const pdfBuffer = await browserService.renderPdf({
            html: item.html,
            url: item.url,
            format: item.format ?? 'A4',
            landscape: item.landscape ?? false,
            margin: item.margin,
            header_html: item.header_html,
            footer_html: item.footer_html,
            smart_pagination: item.smart_pagination ?? true,
            delay_ms: item.delay_ms,
            print_background: true,
            display_header_footer: Boolean(item.header_html || item.footer_html),
            no_store: false,
            store: true,
            expires_in: params.expires_in ?? '24h',
          });

          const stored = await storageService.saveFile(pdfBuffer, {
            mimeType: 'application/pdf',
            extension: 'pdf',
            filename,
            expiresIn: params.expires_in ?? '24h',
          });

          results[index] = {
            index,
            filename,
            file_id: stored.fileId,
            download_url: stored.hostedUrl,
            size_bytes: pdfBuffer.length,
            status: 'completed',
            render_time_ms: Date.now() - itemStartTime,
          };

          successfulBuffers.push({ index, buffer: pdfBuffer });
          job.progress.completed++;
        } catch (err: any) {
          results[index] = {
            index,
            filename,
            status: 'failed',
            error: err.message || 'Render failed',
            render_time_ms: Date.now() - itemStartTime,
          };
          job.progress.failed++;
        }

        job.results = [...results].filter(Boolean);
        await this.saveJob(job, apiKeyToken, params.webhook_headers);
      })
    );

    await Promise.all(tasks);

    // If merge_output is requested and we have completed PDFs
    if (params.merge_output && successfulBuffers.length > 0) {
      try {
        // Sort in original request order
        successfulBuffers.sort((a, b) => a.index - b.index);
        const orderedBuffers = successfulBuffers.map((b) => b.buffer);

        const mergedBuffer = await pdfOperationsService.mergePdfs({ pdfBuffers: orderedBuffers });
        const mergedFilename = params.merged_filename || 'merged-batch.pdf';

        const storedMerged = await storageService.saveFile(mergedBuffer, {
          mimeType: 'application/pdf',
          extension: 'pdf',
          filename: mergedFilename,
          expiresIn: params.expires_in ?? '24h',
        });

        job.merged_output = {
          file_id: storedMerged.fileId,
          download_url: storedMerged.hostedUrl,
          filename: mergedFilename,
          size_bytes: mergedBuffer.length,
        };
      } catch (mergeErr: any) {
        console.warn(`[JobsService] Batch merge failed for job ${jobId}:`, mergeErr);
      }
    }

    job.status = job.progress.completed > 0 ? 'completed' : 'failed';
    job.completed_at = new Date().toISOString();
    job.duration_ms = Date.now() - startTime;
    job.results = results;

    await this.saveJob(job, apiKeyToken, params.webhook_headers);

    if (params.webhook_url) {
      await this.dispatchWebhook(
        job,
        job.status === 'completed' ? 'batch.completed' : 'render.failed',
        {
          total: job.progress.total,
          completed: job.progress.completed,
          failed: job.progress.failed,
          results: job.results,
          merged_output: job.merged_output,
          duration_ms: job.duration_ms,
        },
        signingKey,
        params.webhook_headers
      );
    }
  }
}

export const jobsService = JobsService.getInstance();
