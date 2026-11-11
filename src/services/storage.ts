import fs from 'node:fs';
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
}

export interface SaveFileOptions {
  mimeType: string;
  extension: string;
  filename?: string;
  expiresIn?: '1h' | '24h' | '7d';
  isPermanent?: boolean;
}

export class StorageService {
  private static instance: StorageService | null = null;
  private storageDir: string;

  private constructor() {
    this.storageDir = path.isAbsolute(env.STORAGE_PATH)
      ? env.STORAGE_PATH
      : path.join(process.cwd(), env.STORAGE_PATH);

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
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
    const metaPath = path.join(this.storageDir, `${fileId}.meta.json`);

    const now = Date.now();
    let ttlMs = 24 * 60 * 60 * 1000; // 24 hours default

    if (options.expiresIn === '1h') {
      ttlMs = 60 * 60 * 1000;
    } else if (options.expiresIn === '7d') {
      ttlMs = 7 * 24 * 60 * 60 * 1000;
    }

    const expiresAt = new Date(now + ttlMs).toISOString();
    const cleanAppUrl = env.APP_URL.replace(/\/+$/, '');
    const hostedUrl = `${cleanAppUrl}/d/${fileId}`;

    const metadata: StoredFileMetadata = {
      fileId,
      filename: options.filename || fileId,
      mimeType: options.mimeType,
      sizeBytes: buffer.length,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      hostedUrl,
    };

    await fs.promises.writeFile(filePath, buffer);
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    return metadata;
  }

  /**
   * Retrieves a stored file by ID if it exists and has not expired.
   */
  public async getFile(
    fileId: string
  ): Promise<{ buffer: Buffer; metadata: StoredFileMetadata } | null> {
    const safeFileId = path.basename(fileId);
    const filePath = path.join(this.storageDir, safeFileId);
    const metaPath = path.join(this.storageDir, `${safeFileId}.meta.json`);

    if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
      return null;
    }

    try {
      const rawMeta = await fs.promises.readFile(metaPath, 'utf-8');
      const metadata: StoredFileMetadata = JSON.parse(rawMeta);

      const now = Date.now();
      const expiresAtMs = new Date(metadata.expiresAt).getTime();

      if (now > expiresAtMs) {
        // Expired - clean up immediately
        await fs.promises.unlink(filePath).catch(() => {});
        await fs.promises.unlink(metaPath).catch(() => {});
        return null;
      }

      const buffer = await fs.promises.readFile(filePath);
      return { buffer, metadata };
    } catch (err) {
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
          const expiresAtMs = new Date(meta.expiresAt).getTime();

          if (now > expiresAtMs) {
            const dataFile = metaFile.replace(/\.meta\.json$/, '');
            const dataPath = path.join(this.storageDir, dataFile);

            await fs.promises.unlink(dataPath).catch(() => {});
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
