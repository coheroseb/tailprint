import { z } from 'zod';

export const ScrapeMarkdownRequestSchema = z.object({
  url: z.string().url('A valid http or https URL is required').describe('Target web page URL to scrape and convert to LLM-ready markdown'),
  wait_for: z.string().optional().describe('Optional CSS selector to wait for before extracting content (e.g. "article", ".main-content")'),
  strip_images: z.boolean().default(true).describe('Whether to remove image links and tags from generated markdown (recommended to save tokens)'),
  include_raw_html: z.boolean().default(false).describe('Whether to include the unparsed raw HTML string in the response'),
  timeout_ms: z.coerce.number().int().min(1000).max(15000).default(8000).describe('Hard network and render timeout in milliseconds'),
});

export type ScrapeMarkdownRequest = z.infer<typeof ScrapeMarkdownRequestSchema>;

export const ScrapeMarkdownResponseSchema = z.object({
  url: z.string().url().describe('The resolved final URL'),
  title: z.string().describe('Extracted page or article title'),
  byline: z.string().nullable().describe('Extracted author or publisher name if detected'),
  published_at: z.string().nullable().describe('Publication date ISO string if detected'),
  description: z.string().nullable().describe('Meta description or summary excerpt'),
  markdown: z.string().describe('Clean, structured Markdown formatted for LLM prompts, RAG context, or agents'),
  word_count: z.number().int().describe('Total word count in cleaned markdown'),
  estimated_tokens: z.number().int().describe('Estimated LLM token count (~1.3 tokens per word)'),
  language: z.string().optional().describe('Detected ISO language code (e.g. "da", "en", "de")'),
  raw_content_bytes: z.number().int().describe('Raw HTML payload size in bytes before cleaning'),
  markdown_bytes: z.number().int().describe('Cleaned Markdown payload size in bytes'),
  token_savings_percent: z.string().describe('Percentage of token payload saved compared to raw HTML (e.g. "94.2%")'),
  cached: z.boolean().describe('Whether this response was served from the Redis deduplication cache'),
  raw_html: z.string().optional().describe('Raw HTML if include_raw_html was true'),
});

export type ScrapeMarkdownResponse = z.infer<typeof ScrapeMarkdownResponseSchema>;
