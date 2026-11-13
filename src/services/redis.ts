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

export interface IdempotencyRecord {
  requestHash: string;
  statusCode: number;
  contentType: string;
  isBinary: boolean;
  body: string;
  headers: Record<string, string>;
  createdAt: string;
}

export interface CustomTemplateRecord {
  id: string;
  customer_id: string;
  title: string;
  category: string;
  description: string;
  html: string;
  required_fields: string[];
  default_data?: Record<string, unknown>;
  example_data?: Record<string, unknown>;
  format: 'A4' | 'Letter' | 'Legal';
  landscape: boolean;
  smart_pagination: boolean;
  created_at: string;
  updated_at: string;
}

export interface PdfProofRecord {
  doc_id: string;
  customer_id: string;
  issued_at: string;
  template_id: string | null;
  signed: boolean;
  ai_ready: boolean;
  page_count: number;
  file_sha256: string;
  content_fingerprint: string;
  data_hash: string | null;
  data_keys: string[];
  signature: string | null;
  verification_url: string;
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

  async incrby(key: string, amount: number): Promise<number> {
    this.cleanKey(key);
    const val = Number(this.data.get(key) || 0) + amount;
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

  async srem(key: string, member: string): Promise<number> {
    this.cleanKey(key);
    const set = this.data.get(key);
    if (set instanceof Set) {
      return set.delete(member) ? 1 : 0;
    }
    return 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace(/\*$/, '');
    const result: string[] = [];
    for (const k of this.data.keys()) {
      this.cleanKey(k);
      if (this.data.has(k) && k.startsWith(prefix)) {
        result.push(k);
      }
    }
    return result;
  }
}

export class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | MemoryRedisClient;
  public readonly isMemoryFallback: boolean;

  private constructor() {
    const isUpstashConfigured = Boolean(
      env.NODE_ENV !== 'test' &&
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
        plan: 'enterprise',
        monthly_limit: 1000000,
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

  public async updateCustomerPlan(customerId: string, plan: string, monthlyLimit: number): Promise<number> {
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
        parsed.plan = plan;
        parsed.monthly_limit = monthlyLimit;
        parsed.status = 'active';
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

  public async incrementAndCheckQuota(
    rawKey: string,
    monthlyLimit: number,
    amount: number = 1
  ): Promise<QuotaCheckResult> {
    const hash = this.hashKey(rawKey);
    const month = this.getMonthString();
    const usageKey = `usage:${hash}:${month}`;

    const usage =
      amount > 1 && typeof (this.client as any).incrby === 'function'
        ? await (this.client as any).incrby(usageKey, amount)
        : await this.client.incr(usageKey);
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

  public async checkPlaygroundRateLimit(
    ip: string,
    maxPerHour = 60,
    isExempt = false
  ): Promise<{ allowed: boolean; remaining: number }> {
    // Exempt founder and local development addresses
    if (
      isExempt ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '130.225.247.124' ||
      ip === '46.224.82.103'
    ) {
      return { allowed: true, remaining: 9999 };
    }

    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `ratelimit:playground:${ip}:${hour}`;
    const usage = await this.client.incr(key);
    const allowed = usage <= maxPerHour;
    return { allowed, remaining: Math.max(0, maxPerHour - usage) };
  }

  public async checkAiToolRateLimit(
    ip: string,
    maxPerHour = 5,
    isExempt = false
  ): Promise<{ allowed: boolean; remaining: number }> {
    // Exempt founder and local development addresses
    if (
      isExempt ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '130.225.247.124' ||
      ip === '46.224.82.103'
    ) {
      return { allowed: true, remaining: 9999 };
    }

    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `ratelimit:ai_tool:${ip}:${hour}`;
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

  public async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  public async getJson<T = any>(key: string): Promise<T | null> {
    const val = await this.client.get<T>(key);
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as any;
      }
    }
    return val as T;
  }

  public async listCustomerAccounts(): Promise<
    Array<{
      email?: string;
      customer_id: string;
      plan: string;
      key_prefix: string;
      monthly_limit: number;
      current_usage: number;
      status: string;
      created_at: string;
    }>
  > {
    const accounts: Array<{
      email?: string;
      customer_id: string;
      plan: string;
      key_prefix: string;
      monthly_limit: number;
      current_usage: number;
      status: string;
      created_at: string;
    }> = [];

    try {
      const month = this.getMonthString();
      const seenHashes = new Set<string>();
      const clientAny = this.client as any;

      if (typeof clientAny.keys === 'function') {
        const emailKeys: string[] = await clientAny.keys('free_key_email:*');
        for (const ek of emailKeys) {
          const email = ek.replace('free_key_email:', '');
          if (
            email.includes('@example.com') ||
            email.includes('test_live_claim') ||
            email.toLowerCase() === 'seb@cohero.dk'
          ) {
            continue;
          }
          const rawKey = await this.client.get<string>(ek);
          if (!rawKey) continue;
          const hash = this.hashKey(rawKey);
          seenHashes.add(hash);
          const recRaw = await this.client.get<ApiKeyRecord | string>(`api_keys:${hash}`);
          const usageVal = await this.client.get<number | string>(`usage:${hash}:${month}`);
          const rec: ApiKeyRecord = recRaw
            ? typeof recRaw === 'string'
              ? JSON.parse(recRaw)
              : recRaw
            : {
                key_prefix: rawKey.slice(0, 14),
                customer_id: `cus_free_${hash.slice(0, 8)}`,
                plan: 'free',
                monthly_limit: 100,
                status: 'active',
                created_at: new Date().toISOString(),
              };

          accounts.push({
            email,
            customer_id: rec.customer_id,
            plan: rec.plan || 'free',
            key_prefix: rec.key_prefix || rawKey.slice(0, 14),
            monthly_limit: rec.monthly_limit || 100,
            current_usage: Number(usageVal || 0),
            status: rec.status || 'active',
            created_at: rec.created_at || new Date().toISOString(),
          });
        }

        const custKeys: string[] = await clientAny.keys('customer_keys:*');
        for (const ck of custKeys) {
          const cid = ck.replace('customer_keys:', '');
          if (
            cid === 'cus_dev_sandbox' ||
            cid === 'cus_dev_auto' ||
            cid === 'cus_customer_abc' ||
            cid === 'cus_quota_test' ||
            cid === 'cus_Vbw78ge2aOtfjx' ||
            cid === 'cus_free_07d65ae1bd2aeee8' ||
            cid === 'cus_free_c84e053e90e1ad4e' ||
            cid === 'cus_free_ea89923a5f6183dc'
          ) {
            continue;
          }
          const hashes: string[] = await clientAny.smembers(ck);
          for (const hash of hashes) {
            if (seenHashes.has(hash)) continue;
            seenHashes.add(hash);
            const recRaw = await this.client.get<ApiKeyRecord | string>(`api_keys:${hash}`);
            if (!recRaw) continue;
            const rec: ApiKeyRecord = typeof recRaw === 'string' ? JSON.parse(recRaw) : recRaw;
            const usageVal = await this.client.get<number | string>(`usage:${hash}:${month}`);
            accounts.push({
              customer_id: rec.customer_id || cid,
              plan: rec.plan || 'starter',
              key_prefix: rec.key_prefix || 'sec_live_...',
              monthly_limit: rec.monthly_limit || 2500,
              current_usage: Number(usageVal || 0),
              status: rec.status || 'active',
              created_at: rec.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // Ignore scan errors
    }

    return accounts.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public hashIdempotencyPayload(payload: unknown): string {
    const serialized = JSON.stringify(payload ?? {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private getIdempotencyRedisKey(rawKey: string, endpoint: string, idempotencyKey: string): string {
    const keyHash = this.hashKey(rawKey).slice(0, 24);
    const cleanEndpoint = endpoint.replace(/^\/v1\//, '/').replace(/\/+$/, '');
    return `idemp:${keyHash}:${cleanEndpoint}:${idempotencyKey}`;
  }

  public async getIdempotencyRecord(
    rawKey: string,
    endpoint: string,
    idempotencyKey: string
  ): Promise<IdempotencyRecord | null> {
    const key = this.getIdempotencyRedisKey(rawKey, endpoint, idempotencyKey);
    const raw = await this.client.get<IdempotencyRecord | string>(key);
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as IdempotencyRecord;
      } catch {
        return null;
      }
    }
    return raw as IdempotencyRecord;
  }

  public async setIdempotencyRecord(
    rawKey: string,
    endpoint: string,
    idempotencyKey: string,
    record: IdempotencyRecord,
    ttlSeconds = 86400
  ): Promise<void> {
    const key = this.getIdempotencyRedisKey(rawKey, endpoint, idempotencyKey);
    await this.client.set(key, record, { ex: ttlSeconds });
  }

  // ==========================================
  // Custom User Templates (Starter+ Plans)
  // ==========================================

  public isPaidPlan(plan?: string | null): boolean {
    if (!plan) return false;
    const p = plan.toLowerCase().trim();
    return p === 'starter' || p === 'pro' || p === 'business' || p === 'enterprise';
  }

  private getCustomTemplateKey(customerId: string, templateId: string): string {
    return `custom_templates:${customerId}:${templateId.toLowerCase().trim()}`;
  }

  private getCustomTemplateSetKey(customerId: string): string {
    return `custom_template_ids:${customerId}`;
  }

  public async saveCustomTemplate(record: CustomTemplateRecord): Promise<CustomTemplateRecord> {
    const normalizedId = record.id.toLowerCase().trim();
    const existing = await this.getCustomTemplate(record.customer_id, normalizedId);
    const now = new Date().toISOString();

    const saved: CustomTemplateRecord = {
      ...record,
      id: normalizedId,
      created_at: existing?.created_at || record.created_at || now,
      updated_at: now,
    };

    const key = this.getCustomTemplateKey(record.customer_id, normalizedId);
    await this.client.set(key, saved);
    if ('sadd' in this.client) {
      await (this.client as any).sadd(this.getCustomTemplateSetKey(record.customer_id), normalizedId);
    }
    return saved;
  }

  public async getCustomTemplate(customerId: string, templateId: string): Promise<CustomTemplateRecord | null> {
    const key = this.getCustomTemplateKey(customerId, templateId);
    const raw = await this.client.get<CustomTemplateRecord | string>(key);
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as CustomTemplateRecord;
      } catch {
        return null;
      }
    }
    return raw as CustomTemplateRecord;
  }

  public async listCustomTemplates(customerId: string): Promise<CustomTemplateRecord[]> {
    let ids: string[] = [];
    if ('smembers' in this.client) {
      ids = await (this.client as any).smembers(this.getCustomTemplateSetKey(customerId));
    }

    const records: CustomTemplateRecord[] = [];
    for (const id of ids) {
      const rec = await this.getCustomTemplate(customerId, id);
      if (rec) {
        records.push(rec);
      }
    }

    return records.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  public async deleteCustomTemplate(customerId: string, templateId: string): Promise<boolean> {
    const normalizedId = templateId.toLowerCase().trim();
    const key = this.getCustomTemplateKey(customerId, normalizedId);
    const deletedCount = await this.client.del(key);
    if ('srem' in this.client) {
      await (this.client as any).srem(this.getCustomTemplateSetKey(customerId), normalizedId);
    }
    return deletedCount > 0;
  }

  // ==========================================
  // Dual-Brain & Cryptographic PDF Proofs
  // ==========================================

  public async savePdfProof(record: PdfProofRecord, ttlSeconds = 30 * 86400): Promise<void> {
    const docKey = `pdf_proof:${record.doc_id}`;
    const shaKey = `pdf_proof_sha256:${record.file_sha256}`;
    await this.client.set(docKey, record, { ex: ttlSeconds });
    await this.client.set(shaKey, record.doc_id, { ex: ttlSeconds });
  }

  public async getPdfProof(docId: string): Promise<PdfProofRecord | null> {
    const cleanId = docId.trim();
    const raw = await this.client.get<PdfProofRecord | string>(`pdf_proof:${cleanId}`);
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as PdfProofRecord;
      } catch {
        return null;
      }
    }
    return raw as PdfProofRecord;
  }

  public async getPdfProofBySha256(fileSha256: string): Promise<PdfProofRecord | null> {
    const docId = await this.client.get<string>(`pdf_proof_sha256:${fileSha256.trim().toLowerCase()}`);
    if (!docId || typeof docId !== 'string') return null;
    return this.getPdfProof(docId);
  }

  public async savePdfCortex(
    docId: string,
    cortexRecord: Record<string, unknown>,
    ttlSeconds = 30 * 86400
  ): Promise<void> {
    await this.client.set(`pdf_cortex:${docId.trim()}`, cortexRecord, { ex: ttlSeconds });
  }

  public async getPdfCortex<T = Record<string, unknown>>(docId: string): Promise<T | null> {
    const raw = await this.client.get<T | string>(`pdf_cortex:${docId.trim()}`);
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
    return raw as T;
  }
}

export const redisService = RedisService.getInstance();
