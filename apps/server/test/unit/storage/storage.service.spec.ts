import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { StorageService } from '@/storage/storage.service';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

describe('StorageService', () => {
  let dir: string;
  let service: StorageService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'om-storage-svc-'));
    const config = {
      getOrThrow: (k: string) => ({ LOCAL_STORAGE_DIR: dir, API_PUBLIC_URL: 'http://api' })[k],
    } as unknown as ConfigService<ApiEnv, true>;
    service = new StorageService(config);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('publicUrl()', () => {
    it('should build public urls from the configured API_PUBLIC_URL', () => {
      expect(service.publicUrl('avatars/u1/x.png')).toBe(
        'http://api/api/uploads/public/avatars/u1/x.png',
      );
    });
  });

  describe('put() / read() / delete()', () => {
    it('should round-trip a stored object and remove it on delete', async () => {
      await service.put({ key: 'a/f.txt', buffer: Buffer.from('hello'), mime: 'text/plain' });
      const read = await service.read('a/f.txt');
      expect(read).not.toBeNull();
      expect(await streamToString(read!.stream)).toBe('hello');
      await service.delete('a/f.txt');
      await expect(service.read('a/f.txt')).resolves.toBeNull();
    });
  });
});
