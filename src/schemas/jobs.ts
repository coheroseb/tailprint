import { z } from 'zod';

export const BatchMarginSchema = z.object({
  top: z.string().optional().describe('Top margin with unit (e.g. 10mm, 0.5in, 20px)'),
  bottom: z.string().optional().describe('Bottom margin with unit (e.g. 10mm, 0.5in, 20px)'),
  left: z.string().optional().describe('Left margin with unit (e.g. 10mm, 0.5in, 20px)'),
  right: z.string().optional().describe('Right margin with unit (e.g. 10mm, 0.5in, 20px)'),
}).describe('Page margins');

export const BatchItemSchema = z
  .object({
    html: z.string().optional().describe('HTML string with optional Tailwind CSS utility classes'),
    url: z.string().url().optional().describe('Direct web URL to render to PDF'),
    filename: z.string().optional().describe('Custom filename for this document item (e.g. invoice-101.pdf)'),
    format: z.enum(['A4', 'Letter', 'Legal']).default('A4').optional().describe('Paper format'),
    landscape: z.boolean().default(false).optional().describe('Whether to print in landscape orientation'),
    margin: BatchMarginSchema.optional(),
    header_html: z.string().optional().describe('Print header HTML'),
    footer_html: z.string().optional().describe('Print footer HTML'),
    smart_pagination: z.boolean().default(true).optional().describe('Prevent awkward page splits'),
    delay_ms: z.coerce.number().int().min(0).max(5000).optional().describe('Delay before rendering'),
  })
  .refine((data) => Boolean(data.html || data.url), {
    message: 'Either "html" or "url" must be provided for each batch item',
    path: ['html'],
  });

export type BatchItem = z.infer<typeof BatchItemSchema>;

export const RenderBatchRequestSchema = z.object({
  items: z.array(BatchItemSchema).min(1).max(100).describe('List of document items to render (up to 100 items per batch)'),
  merge_output: z.boolean().default(false).optional().describe('If true, combines all rendered PDFs into a single unified multi-page PDF'),
  merged_filename: z.string().default('merged-batch.pdf').optional().describe('Filename for the merged output if merge_output is true'),
  webhook_url: z.string().url().optional().describe('Callback URL to POST completion notification and download links when batch is done'),
  webhook_headers: z.record(z.string()).optional().describe('Optional custom HTTP headers for webhook callback (e.g. Authorization, X-Secret)'),
  expires_in: z.enum(['1h', '24h', '7d']).default('24h').optional().describe('Expiration duration for generated download links'),
});

export type RenderBatchRequest = z.infer<typeof RenderBatchRequestSchema>;

export const AsyncRenderAcceptedResponseSchema = z.object({
  success: z.boolean().default(true),
  job_id: z.string().describe('Unique asynchronous job identifier (e.g. job_render_...)'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).describe('Current job status'),
  message: z.string().describe('Status message and instructions'),
  status_url: z.string().url().describe('URL to poll for job progress and results'),
  webhook_url: z.string().url().optional().describe('Webhook callback target URL'),
  created_at: z.string().describe('ISO timestamp of job creation'),
});

export type AsyncRenderAcceptedResponse = z.infer<typeof AsyncRenderAcceptedResponseSchema>;

export const JobResultItemSchema = z.object({
  index: z.number().int().describe('Item index in the original batch request'),
  filename: z.string().describe('Document filename'),
  file_id: z.string().optional().describe('Tailprint hosted file identifier'),
  download_url: z.string().url().optional().describe('Public download URL for the rendered PDF'),
  size_bytes: z.number().int().optional().describe('File size in bytes'),
  pages: z.number().int().optional().describe('Number of pages in the generated PDF'),
  status: z.enum(['completed', 'failed']).describe('Item status'),
  error: z.string().optional().describe('Error message if item rendering failed'),
  render_time_ms: z.number().optional().describe('Render duration in milliseconds'),
});

export type JobResultItem = z.infer<typeof JobResultItemSchema>;

export const JobStatusResponseSchema = z.object({
  job_id: z.string().describe('Job identifier'),
  type: z.enum(['render_pdf', 'batch_pdf']).describe('Job operation type'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).describe('Overall job execution status'),
  progress: z.object({
    total: z.number().int().describe('Total documents in job'),
    completed: z.number().int().describe('Number of successfully rendered documents'),
    failed: z.number().int().describe('Number of failed documents'),
  }),
  results: z.array(JobResultItemSchema).describe('Render results for each document'),
  merged_output: z
    .object({
      file_id: z.string(),
      download_url: z.string().url(),
      filename: z.string(),
      size_bytes: z.number().int().optional(),
      pages: z.number().int().optional(),
    })
    .optional()
    .describe('Merged multi-page PDF details if merge_output was enabled'),
  webhook_delivery: z
    .object({
      url: z.string().url(),
      status_code: z.number().int().optional(),
      delivered: z.boolean(),
      delivered_at: z.string().optional(),
      error: z.string().optional(),
    })
    .optional()
    .describe('Webhook callback delivery status'),
  error: z.string().nullable().optional().describe('Top-level error message if job failed completely'),
  created_at: z.string().describe('ISO timestamp of job creation'),
  started_at: z.string().optional().describe('ISO timestamp when processing started'),
  completed_at: z.string().optional().describe('ISO timestamp when processing completed'),
  duration_ms: z.number().optional().describe('Total processing time in milliseconds'),
});

export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
