import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional().default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default('whsec_placeholder'),
  STRIPE_PRICE_STARTER: z.string().optional().default('price_starter_test'),
  STRIPE_PRICE_PRO: z.string().optional().default('price_pro_test'),
  STRIPE_PRICE_BUSINESS: z.string().optional().default('price_business_test'),
  STRIPE_PRICE_ENTERPRISE: z.string().optional().default('price_enterprise_test'),
  APP_URL: z.string().default('http://localhost:3000'),

  // Browser & Rendering limits
  CONCURRENCY_LIMIT: z.coerce.number().int().positive().default(5),
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  // Caching
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(604800), // 7 days

  // Tailwind CDN
  TAILWIND_CDN_URL: z.string().url().default('https://cdn.tailwindcss.com'),

  // Dev bypass (for quick local testing without Redis if needed)
  DEV_DEFAULT_API_KEY: z.string().optional().default('sec_live_dev_test_key_12345'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
