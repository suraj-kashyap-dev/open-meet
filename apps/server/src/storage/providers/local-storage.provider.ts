import { Logger } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import type {
  PutInput,
  PutResult,
  ReadRangeOptions,
  ReadRangeResult,
  ReadResult,
  StorageProvider,
} from './storage-provider.interface';

const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);

  private readonly rootDir: string;

  private readonly apiPublicUrl: string;

  constructor(rootDir: string, apiPublicUrl: string) {
    this.rootDir = resolve(rootDir);

    this.apiPublicUrl = apiPublicUrl.replace(/\/$/, '');
  }

  publicUrl(key: string): string {
    return `${this.apiPublicUrl}/api/uploads/public/${key}`;
  }

  private resolveKey(key: string): string {
    const parts = key.split('/');

    for (const part of parts) {
      if (!SAFE_SEGMENT.test(part)) {
        throw new Error(`Invalid storage key segment: ${part}`);
      }
    }

    const target = resolve(this.rootDir, ...parts);

    if (!target.startsWith(this.rootDir + sep) && target !== this.rootDir) {
      throw new Error('Storage key escapes root directory');
    }

    return target;
  }

  async put({ key, buffer, mime }: PutInput): Promise<PutResult> {
    const target = this.resolveKey(key);
    const dir = target.substring(0, target.lastIndexOf(sep));

    await mkdir(dir, { recursive: true });

    await writeFile(target, buffer);

    this.logger.debug(`Wrote ${buffer.length} bytes to ${target} (${mime})`);

    return { url: `/api/uploads/files/${key}` };
  }

  async read(key: string): Promise<ReadResult | null> {
    let target: string;

    try {
      target = this.resolveKey(key);
    } catch {
      return null;
    }

    try {
      const stats = await stat(target);

      if (!stats.isFile()) {
        return null;
      }

      return {
        stream: createReadStream(target),
        size: stats.size,
        mime: 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async readRange(key: string, options: ReadRangeOptions): Promise<ReadRangeResult | null> {
    let target: string;

    try {
      target = this.resolveKey(key);
    } catch {
      return null;
    }

    try {
      const stats = await stat(target);

      if (!stats.isFile()) {
        return null;
      }

      const totalSize = stats.size;
      const start = Math.max(0, options.start);
      const end = Math.min(totalSize - 1, options.end);

      if (start > end || start >= totalSize) {
        return null;
      }

      return {
        stream: createReadStream(target, { start, end }),
        size: end - start + 1,
        totalSize,
        start,
        end,
        mime: 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const target = this.resolveKey(key);

      await unlink(target);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
