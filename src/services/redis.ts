import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { PLANS } from '../config/plans.js';

export interface ApiKeyRecord {
  key_prefix: string;
  customer_id: string;
  plan: string;
  monthly_limit: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
}

// In-Memory store fallback for local development or tests when Upstash is not configured
class MemoryRedisClient {
  private data = new Map<string, any>();
  private expirations = new Map<string, number>();

  private cleanKey(key: string): void {
    const exp = this.expirations.get(key);
    if (exp && Date.now() > exp) {
      this.data.delete(key);
      this.expirations.delete(key);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    this.cleanKey(key);
    const val = this.data.get(key);
    if (val === undefined) return null;
    return val as T;
  }

  async set(key: string, value: any, opts?: { ex?: number }): Promise<'OK'> {
    this.data.set(key, value);
    if (opts?.ex) {
      this.expirations.set(key, Date.now() + opts.ex * 1000);
    } else {
      this.expirations.delete(key);
    }
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    this.cleanKey(key);
    const val = Number(this.data.get(key) || 0) + 1;
    this.data.set(key, val);
    return val;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.data.delete(k)) {
        this.expirations.delete(k);
        count++;
      }
    }
    return count;
  }

  async smembers(key: string): Promise<string[]> {
    this.cleanKey(key);
    const set = this.data.get(key);
    if (set instanceof Set) {
      return Array.from(set);
    }
    return [];
  }

  async sadd(key: string, member: string): Promise<number> {
    this.cleanKey(key);
    let set = this.data.get(key);
    if (!(set instanceof Set)) {
      set = new Set<string>();
      this.data.set(key, set);
    }
    const had = set.has(member);
    set.add(member);
    return had ? 0 : 1;
  }
}

export class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | MemoryRedisClient;
  public readonly isMemoryFallback: boolean;

  private constructor() {
    const isUpstashConfigured = Boolean(
      env.UPSTASH_REDIS_REST_URL &&
      env.UPSTASH_REDIS_REST_TOKEN &&
      !env.UPSTASH_REDIS_REST_URL.includes('your-upstash-redis-url') &&
      !env.UPSTASH_REDIS_REST_TOKEN.includes('your_upstash_rest_token')
    );

    if (isUpstashConfigured) {
      this.client = new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      });
      this.isMemoryFallback = false;
      this.seedDevKey();
    } else {
      this.client = new MemoryRedisClient();
      this.isMemoryFallback = true;
      this.seedDevKey();
    }
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
  }

  private seedDevKey(): void {
    if (env.DEV_DEFAULT_API_KEY) {
      const hash = this.hashKey(env.DEV_DEFAULT_API_KEY);
      const devRecord: ApiKeyRecord = {
        key_prefix: env.DEV_DEFAULT_API_KEY.slice(0, 12),
        customer_id: 'cus_dev_sandbox',
        plan: 'starter',
        monthly_limit: PLANS.starter.monthlyLimit,
        status: 'active',
        created_at: new Date().toISOString(),
      };
      this.client.set(`api_keys:${hash}`, devRecord);
      if ('sadd' in this.client) {
        (this.client as any).sadd('customer_keys:cus_dev_sandbox', hash);
      }
    }
  }

  public async getApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
    const hash = this.hashKey(rawKey);
    const key = `api_keys:${hash}`;
    const record = await this.client.get<ApiKeyRecord | string>(key);

    if (!record) {
      // In development mode, auto-provision any key to avoid friction
      if (env.NODE_ENV === 'development') {
        const autoRecord: ApiKeyRecord = {
          key_prefix: rawKey.slice(0, 12),
          customer_id: 'cus_dev_auto',
          plan: 'starter',
          monthly_limit: PLANS.starter.monthlyLimit,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        await this.storeApiKey(rawKey, autoRecord);
        return autoRecord;
      }
      return null;
    }

    if (typeof record === 'string') {
      try {
        return JSON.parse(record) as ApiKeyRecord;
      } catch {
        return null;
      }
    }

    return record as ApiKeyRecord;
  }

  public async storeApiKey(rawKey: string, record: ApiKeyRecord): Promise<void> {
    const hash = this.hashKey(rawKey);
    const key = `api_keys:${hash}`;
    await this.client.set(key, record);

    // Track customer's keys for webhook lifecycle management
    if ('sadd' in this.client) {
      await (this.client as any).sadd(`customer_keys:${record.customer_id}`, hash);
    }
  }

  public async updateKeyStatusByCustomer(customerId: string, status: 'active' | 'inactive'): Promise<number> {
    let hashes: string[] = [];
    if ('smembers' in this.client) {
      hashes = await (this.client as any).smembers(`customer_keys:${customerId}`);
    }

    let updatedCount = 0;
    for (const hash of hashes) {
      const key = `api_keys:${hash}`;
      const record = await this.client.get<ApiKeyRecord | string>(key);
      if (record) {
        const parsed: ApiKeyRecord = typeof record === 'string' ? JSON.parse(record) : record;
        parsed.status = status;
        await this.client.set(key, parsed);
        updatedCount++;
      }
    }
    return updatedCount;
  }

  public getMonthString(date = new Date()): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  public async incrementAndCheckQuota(rawKey: string, monthlyLimit: number): Promise<QuotaCheckResult> {
    const hash = this.hashKey(rawKey);
    const month = this.getMonthString();
    const usageKey = `usage:${hash}:${month}`;

    const usage = await this.client.incr(usageKey);
    const allowed = usage <= monthlyLimit;
    const remaining = Math.max(0, monthlyLimit - usage);

    return {
      allowed,
      currentUsage: usage,
      limit: monthlyLimit,
      remaining,
    };
  }

  public async resetMonthlyQuotaForCustomer(customerId: string): Promise<void> {
    let hashes: string[] = [];
    if ('smembers' in this.client) {
      hashes = await (this.client as any).smembers(`customer_keys:${customerId}`);
    }
    const month = this.getMonthString();
    for (const hash of hashes) {
      const usageKey = `usage:${hash}:${month}`;
      await this.client.del(usageKey);
    }
  }

  public generateImageCacheHash(params: {
    html?: string;
    url?: string;
    width: number;
    height: number;
    type: string;
    wait_for?: string;
    delay_ms?: number;
  }): string {
    const target = params.url ? `url:${params.url}` : `html:${params.html || ''}`;
    const payload = `${params.type}:${params.width}x${params.height}:${params.wait_for || ''}:${params.delay_ms || ''}:${target}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public async getCachedImage(cacheHash: string): Promise<Buffer | null> {
    const key = `cache:img:${cacheHash}`;
    const base64Data = await this.client.get<string>(key);
    if (!base64Data) return null;
    return Buffer.from(base64Data, 'base64');
  }

  public async setCachedImage(cacheHash: string, imageBuffer: Buffer, ttlSeconds = env.CACHE_TTL_SECONDS): Promise<void> {
    const key = `cache:img:${cacheHash}`;
    const base64Data = imageBuffer.toString('base64');
    await this.client.set(key, base64Data, { ex: ttlSeconds });
  }

  public generateScrapeCacheHash(params: { url: string; strip_images: boolean }): string {
    const payload = `scrape:${params.strip_images}:${params.url.trim()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public async getCachedScrape<T = any>(cacheHash: string): Promise<T | null> {
    const key = `cache:scrape:${cacheHash}`;
    const data = await this.client.get<string | T>(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    }
    return data as T;
  }

  public async setCachedScrape(cacheHash: string, result: any, ttlSeconds = 86400): Promise<void> {
    const key = `cache:scrape:${cacheHash}`;
    await this.client.set(key, JSON.stringify(result), { ex: ttlSeconds });
  }

  public async getCurrentUsage(rawKey: string): Promise<number> {
    const hash = this.hashKey(rawKey);
    const month = this.getMonthString();
    const usageKey = `usage:${hash}:${month}`;
    const val = await this.client.get<number | string>(usageKey);
    return Number(val || 0);
  }

  public async saveSessionKey(
    sessionId: string,
    apiKey: string,
    plan: string,
    monthlyLimit: number,
    ttlSeconds = 86400
  ): Promise<void> {
    const key = `session_keys:${sessionId}`;
    await this.client.set(key, JSON.stringify({ apiKey, plan, monthlyLimit }), { ex: ttlSeconds });
  }

  public async getSessionKey(
    sessionId: string
  ): Promise<{ apiKey: string; plan: string; monthlyLimit: number } | null> {
    const key = `session_keys:${sessionId}`;
    const val = await this.client.get<string | any>(key);
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  }

  public async checkPlaygroundRateLimit(ip: string, maxPerHour = 25): Promise<{ allowed: boolean; remaining: number }> {
    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `ratelimit:playground:${ip}:${hour}`;
    const usage = await this.client.incr(key);
    const allowed = usage <= maxPerHour;
    return { allowed, remaining: Math.max(0, maxPerHour - usage) };
  }

  public async getFreeKeyByEmail(email: string): Promise<string | null> {
    const key = `free_key_email:${email.toLowerCase().trim()}`;
    const val = await this.client.get<string>(key);
    return val || null;
  }

  public async setFreeKeyEmail(email: string, rawApiKey: string): Promise<void> {
    const key = `free_key_email:${email.toLowerCase().trim()}`;
    await this.client.set(key, rawApiKey);
  }

  public async checkClaimRateLimit(ip: string, maxPerHour = 10): Promise<{ allowed: boolean; remaining: number }> {
    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `ratelimit:claim:${ip}:${hour}`;
    const count = await this.client.incr(key);
    return {
      allowed: count <= maxPerHour,
      remaining: Math.max(0, maxPerHour - count),
    };
  }
}

export const redisService = RedisService.getInstance();
