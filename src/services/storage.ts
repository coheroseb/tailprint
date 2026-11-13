import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface StoredFileMetadata {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
  hostedUrl: string;
  docId?: string | null;
  isotope?: boolean;
  hasDecayedFile?: boolean;
  revoked?: boolean;
  revokedAt?: string | null;
  expireMessage?: string | null;
  maxReads?: number | null;
  readsCount?: number;
  hardDeleteAt?: string;
}

export interface SaveFileOptions {
  mimeType: string;
  extension: string;
  filename?: string;
  expiresIn?: string;
  expiresAt?: string;
  isPermanent?: boolean;
  docId?: string | null;
  isotope?: boolean;
  decayedBuffer?: Buffer;
  expireMessage?: string | null;
  maxReads?: number | null;
}

/**
 * Parses a human-friendly duration string (e.g. "500ms", "30s", "15m", "1h", "24h", "7d", "14d", "30d")
 * into milliseconds. Defaults to 24 hours if unrecognized.
 */
export function parseDurationToMs(duration?: string | null): number {
  if (!duration || typeof duration !== 'string') {
    return 24 * 60 * 60 * 1000;
  }
  const trimmed = duration.trim().toLowerCase();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|m|min|mins|h|hr|hrs|d|day|days|w|wk|wks)$/i);
  if (!match) {
    const asDate = Date.parse(duration.trim());
    if (!Number.isNaN(asDate)) {
      return Math.max(0, asDate - Date.now());
    }
    return 24 * 60 * 60 * 1000;
  }
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'ms':
      return Math.round(value);
    case 's':
    case 'sec':
    case 'secs':
      return Math.round(value * 1000);
    case 'm':
    case 'min':
    case 'mins':
      return Math.round(value * 60 * 1000);
    case 'h':
    case 'hr':
    case 'hrs':
      return Math.round(value * 60 * 60 * 1000);
    case 'd':
    case 'day':
    case 'days':
      return Math.round(value * 24 * 60 * 60 * 1000);
    case 'w':
    case 'wk':
    case 'wks':
      return Math.round(value * 7 * 24 * 60 * 60 * 1000);
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export class StorageService {
  private static instance: StorageService | null = null;
  private storageDir: string;

  private constructor() {
    this.storageDir = path.isAbsolute(env.STORAGE_PATH)
      ? env.STORAGE_PATH
      : path.join(process.cwd(), env.STORAGE_PATH);

    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
      fs.accessSync(this.storageDir, fs.constants.W_OK);
    } catch (err) {
      const fallbackDir = path.join(os.tmpdir(), 'tailprint-storage');
      console.warn(`[StorageService] Primary storage path ${this.storageDir} is not writable, falling back to ${fallbackDir}:`, err);
      this.storageDir = fallbackDir;
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    }

    // Run initial prune of expired files on startup
    this.pruneExpiredFiles().catch((err) => {
      console.warn('Storage initial prune warning:', err);
    });
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Saves a binary buffer (PDF, image, HTML, etc.) to the hosted storage engine.
   */
  public async saveFile(
    buffer: Buffer,
    options: SaveFileOptions
  ): Promise<StoredFileMetadata> {
    const rawExt = options.extension.replace(/^\./, '').toLowerCase() || 'bin';
    const randomToken = crypto.randomBytes(12).toString('hex');
    const fileId = `f_${randomToken}.${rawExt}`;
    const filePath = path.join(this.storageDir, fileId);
    const decayedPath = path.join(this.storageDir, `${fileId}.decayed`);
    const metaPath = path.join(this.storageDir, `${fileId}.meta.json`);

    const now = Date.now();
    let expiresAt: string;
    if (options.expiresAt && !Number.isNaN(Date.parse(options.expiresAt))) {
      expiresAt = new Date(Date.parse(options.expiresAt)).toISOString();
    } else {
      const ttlMs = parseDurationToMs(options.expiresIn || '24h');
      expiresAt = new Date(now + ttlMs).toISOString();
    }

    const cleanAppUrl = env.APP_URL.replace(/\/+$/, '');
    const hostedUrl = `${cleanAppUrl}/d/${fileId}`;
    const hasDecayedFile = Boolean(options.decayedBuffer && options.decayedBuffer.length > 0);
    const isIsotope = Boolean(options.isotope || hasDecayedFile || options.maxReads);

    const metadata: StoredFileMetadata = {
      fileId,
      filename: options.filename || fileId,
      mimeType: options.mimeType,
      sizeBytes: buffer.length,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      hostedUrl,
      ...(options.docId ? { docId: options.docId } : {}),
      ...(isIsotope
        ? {
            isotope: true,
            hasDecayedFile,
            revoked: false,
            revokedAt: null,
            expireMessage: options.expireMessage || null,
            maxReads: options.maxReads ?? null,
            readsCount: 0,
            hardDeleteAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : {}),
    };

    await fs.promises.writeFile(filePath, buffer);
    if (hasDecayedFile && options.decayedBuffer) {
      await fs.promises.writeFile(decayedPath, options.decayedBuffer);
    }
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    return metadata;
  }

  /**
   * Retrieves a stored file by ID if it exists.
   * For Isotope / time-limited PDFs with a decayed state, automatically transitions to serving
   * the decayed PDF buffer once `expiresAt` is reached, `maxReads` is exceeded, or `revoked` is true.
   */
  public async getFile(
    fileId: string
  ): Promise<{ buffer: Buffer; metadata: StoredFileMetadata; decayed?: boolean } | null> {
    const safeFileId = path.basename(fileId);
    const filePath = path.join(this.storageDir, safeFileId);
    const decayedPath = path.join(this.storageDir, `${safeFileId}.decayed`);
    const metaPath = path.join(this.storageDir, `${safeFileId}.meta.json`);

    if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
      return null;
    }

    try {
      const rawMeta = await fs.promises.readFile(metaPath, 'utf-8');
      const metadata: StoredFileMetadata = JSON.parse(rawMeta);

      const now = Date.now();
      const expiresAtMs = new Date(metadata.expiresAt).getTime();
      const isTimeExpired = now > expiresAtMs;
      const isRevoked = Boolean(metadata.revoked);
      const isMaxReadsReached =
        typeof metadata.maxReads === 'number' &&
        metadata.maxReads > 0 &&
        (metadata.readsCount || 0) >= metadata.maxReads;

      if (metadata.isotope || metadata.hasDecayedFile) {
        const hardDeleteMs = metadata.hardDeleteAt
          ? new Date(metadata.hardDeleteAt).getTime()
          : expiresAtMs + 30 * 24 * 60 * 60 * 1000;

        if (now > hardDeleteMs) {
          await fs.promises.unlink(filePath).catch(() => {});
          await fs.promises.unlink(decayedPath).catch(() => {});
          await fs.promises.unlink(metaPath).catch(() => {});
          return null;
        }

        if (isTimeExpired || isRevoked || isMaxReadsReached) {
          if (fs.existsSync(decayedPath)) {
            const decayedBuffer = await fs.promises.readFile(decayedPath);
            return { buffer: decayedBuffer, metadata, decayed: true };
          }
          return null;
        }

        // Still active: increment Geiger counter (`readsCount`)
        metadata.readsCount = (metadata.readsCount || 0) + 1;
        await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

        const buffer = await fs.promises.readFile(filePath);
        return { buffer, metadata, decayed: false };
      }

      if (isTimeExpired) {
        // Non-isotope file expired - clean up immediately
        await fs.promises.unlink(filePath).catch(() => {});
        await fs.promises.unlink(metaPath).catch(() => {});
        return null;
      }

      const buffer = await fs.promises.readFile(filePath);
      return { buffer, metadata, decayed: false };
    } catch (err) {
      return null;
    }
  }

  /**
   * Reads file metadata without incrementing the Geiger counter (`readsCount`).
   */
  public async getFileMetadata(fileId: string): Promise<StoredFileMetadata | null> {
    const safeFileId = path.basename(fileId);
    const metaPath = path.join(this.storageDir, `${safeFileId}.meta.json`);
    if (!fs.existsSync(metaPath)) return null;
    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8');
      return JSON.parse(raw) as StoredFileMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Finds a stored file's metadata by its associated `docId`.
   */
  public async findFileByDocId(docId: string): Promise<StoredFileMetadata | null> {
    try {
      const files = await fs.promises.readdir(this.storageDir);
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
      for (const metaFile of metaFiles) {
        const metaPath = path.join(this.storageDir, metaFile);
        try {
          const raw = await fs.promises.readFile(metaPath, 'utf-8');
          const meta: StoredFileMetadata = JSON.parse(raw);
          if (meta.docId === docId) {
            return meta;
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Updates the lifecycle metadata (`expiresAt`, `revoked`, `revokedAt`, `maxReads`, `readsCount`, `expireMessage`)
   * for a stored file by `fileId`.
   */
  public async updateFileLifecycle(
    fileId: string,
    patch: Partial<
      Pick<
        StoredFileMetadata,
        'expiresAt' | 'revoked' | 'revokedAt' | 'maxReads' | 'readsCount' | 'expireMessage' | 'isotope'
      >
    >
  ): Promise<StoredFileMetadata | null> {
    const safeFileId = path.basename(fileId);
    const metaPath = path.join(this.storageDir, `${safeFileId}.meta.json`);
    if (!fs.existsSync(metaPath)) return null;

    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8');
      const metadata: StoredFileMetadata = JSON.parse(raw);
      const updated: StoredFileMetadata = {
        ...metadata,
        ...patch,
      };
      await fs.promises.writeFile(metaPath, JSON.stringify(updated, null, 2), 'utf-8');
      return updated;
    } catch {
      return null;
    }
  }

  /**
   * Sweeps the storage directory and purges expired files and metadata.
   */
  public async pruneExpiredFiles(): Promise<number> {
    let purgedCount = 0;
    try {
      const files = await fs.promises.readdir(this.storageDir);
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
      const now = Date.now();

      for (const metaFile of metaFiles) {
        const metaPath = path.join(this.storageDir, metaFile);
        try {
          const raw = await fs.promises.readFile(metaPath, 'utf-8');
          const meta: StoredFileMetadata = JSON.parse(raw);
          const deleteAtMs =
            meta.isotope || meta.hasDecayedFile
              ? meta.hardDeleteAt
                ? new Date(meta.hardDeleteAt).getTime()
                : new Date(meta.expiresAt).getTime() + 30 * 24 * 60 * 60 * 1000
              : new Date(meta.expiresAt).getTime();

          if (now > deleteAtMs) {
            const dataFile = metaFile.replace(/\.meta\.json$/, '');
            const dataPath = path.join(this.storageDir, dataFile);
            const decayedPath = path.join(this.storageDir, `${dataFile}.decayed`);

            await fs.promises.unlink(dataPath).catch(() => {});
            await fs.promises.unlink(decayedPath).catch(() => {});
            await fs.promises.unlink(metaPath).catch(() => {});
            purgedCount++;
          }
        } catch {
          // Corrupt meta file, delete
          await fs.promises.unlink(metaPath).catch(() => {});
        }
      }
    } catch {
      // directory error
    }

    return purgedCount;
  }
}

export const storageService = StorageService.getInstance();
