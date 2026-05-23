import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalStorageProvider } from '@/storage/providers/local-storage.provider';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

describe('LocalStorageProvider', () => {
  let dir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'om-storage-'));
    provider = new LocalStorageProvider(dir, 'http://api/');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('publicUrl()', () => {
    it('should strip a trailing slash and build the public path', () => {
      expect(provider.publicUrl('avatars/u1/x.png')).toBe(
        'http://api/api/uploads/public/avatars/u1/x.png',
      );
    });
  });

  describe('put() / read()', () => {
    it('should write the file, return a files url, and read it back', async () => {
      const res = await provider.put({
        key: 'attachments/u1/f.txt',
        buffer: Buffer.from('hello'),
        mime: 'text/plain',
      });
      expect(res.url).toBe('/api/uploads/files/attachments/u1/f.txt');
      const read = await provider.read('attachments/u1/f.txt');
      expect(read).not.toBeNull();
      expect(read!.size).toBe(5);
      expect(await streamToString(read!.stream)).toBe('hello');
    });

    it('should return null when reading a missing key', async () => {
      await expect(provider.read('nope/missing.bin')).resolves.toBeNull();
    });
  });

  describe('readRange()', () => {
    it('should return the requested byte slice', async () => {
      await provider.put({
        key: 'a/data.bin',
        buffer: Buffer.from('abcdefghij'),
        mime: 'application/octet-stream',
      });
      const slice = await provider.readRange('a/data.bin', { start: 2, end: 5 });
      expect(slice).not.toBeNull();
      expect(slice!.start).toBe(2);
      expect(slice!.end).toBe(5);
      expect(slice!.size).toBe(4);
      expect(slice!.totalSize).toBe(10);
      expect(await streamToString(slice!.stream)).toBe('cdef');
    });

    it('should return null when the range starts past the end of the file', async () => {
      await provider.put({
        key: 'a/data.bin',
        buffer: Buffer.from('abc'),
        mime: 'application/octet-stream',
      });
      await expect(provider.readRange('a/data.bin', { start: 100, end: 200 })).resolves.toBeNull();
    });
  });

  describe('path safety', () => {
    it('should refuse to read a key that escapes the root directory', async () => {
      await expect(provider.read('../escape.txt')).resolves.toBeNull();
    });

    it('should reject writing a key with an unsafe path segment', async () => {
      await expect(
        provider.put({ key: 'bad seg', buffer: Buffer.from('x'), mime: 'text/plain' }),
      ).rejects.toThrow();
    });
  });

  describe('delete()', () => {
    it('should remove the file and be a no-op for a missing key', async () => {
      await provider.put({ key: 'a/del.txt', buffer: Buffer.from('x'), mime: 'text/plain' });
      await provider.delete('a/del.txt');
      await expect(provider.read('a/del.txt')).resolves.toBeNull();
      await expect(provider.delete('a/del.txt')).resolves.toBeUndefined();
    });
  });
});
