import { env } from './env.js';

export interface PlanConfig {
  id: string;
  name: string;
  priceUsd: number;
  monthlyLimit: number;
  stripePriceId?: string;
  badge?: string;
  targetAudience: string;
  description: string;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Developer Free',
    priceUsd: 0,
    monthlyLimit: 100,
    badge: '100% FREE',
    targetAudience: 'Testing in development, indie hacking & local integration',
    description: 'Instant API key to test Tailprint in your local codebase with zero credit card.',
    features: [
      '100 PDF & image renders / month',
      'Full Tailwind CSS v3 & v4 support',
      'LLM Web Scraper & Markdown API',
      'Model Context Protocol (MCP) access',
      'No credit card required',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceUsd: 14,
    monthlyLimit: 2500,
    stripePriceId: env.STRIPE_PRICE_STARTER,
    targetAudience: 'Solo developers, hobby projects, small e-commerce stores',
    description: 'Zero purchase friction. Get production-grade rendering up and running in minutes.',
    features: [
      '2,500 PDF & image renders / month',
      'Full Tailwind CSS v3 & v4 support',
      'Instant sub-500ms execution',
      'SSRF & network sandbox security',
      'Community & documentation access',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 39,
    monthlyLimit: 20000,
    stripePriceId: env.STRIPE_PRICE_PRO,
    badge: 'MOST POPULAR',
    targetAudience: 'Growing SaaS, agencies with multiple client projects',
    description: 'Higher priority in the Chromium pool with aggressive deduplication caching.',
    features: [
      '20,000 PDF & image renders / month',
      'Prioritized Chromium concurrency queue',
      '7-day SHA-256 image caching (Instant HIT)',
      'Custom paper sizes & print margins',
      'Priority developer support',
    ],
  },
  business: {
    id: 'business',
    name: 'Business / Scale',
    priceUsd: 99,
    monthlyLimit: 75000,
    stripePriceId: env.STRIPE_PRICE_BUSINESS,
    badge: 'BEST VALUE FOR SCALE',
    targetAudience: 'Fast-growing platforms needing scale without sales friction',
    description: 'High-throughput scaling with elevated pool limits and self-service onboarding.',
    features: [
      '75,000 PDF & image renders / month',
      'Elevated concurrency pool reservation',
      'Full webhook & billing automation',
      'Multi-key team access support',
      'Direct Slack / Discord technical channel',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceUsd: 199,
    monthlyLimit: 100000,
    stripePriceId: env.STRIPE_PRICE_ENTERPRISE,
    targetAudience: 'Large platforms, high volume, custom compliance & SLA',
    description: 'Heavy volume with dedicated browser instances and strict uptime SLA guarantees.',
    features: [
      '100,000+ renders / month',
      'Dedicated Playwright Chromium workers',
      '99.9% availability SLA agreement',
      'Custom pre-loaded font sets & brand assets',
      'Dedicated technical account engineer',
    ],
  },
};

export const DEFAULT_PLAN = PLANS.starter;

export function getPlanById(planId?: string | null): PlanConfig {
  if (!planId) return DEFAULT_PLAN;
  const normalized = planId.toLowerCase().trim();
  return PLANS[normalized] ?? DEFAULT_PLAN;
}

export function getPlanByStripePriceId(priceId?: string | null): PlanConfig {
  if (!priceId) return DEFAULT_PLAN;
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId && plan.stripePriceId === priceId) {
      return plan;
    }
  }
  return DEFAULT_PLAN;
}
