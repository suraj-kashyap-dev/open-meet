import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Attachment } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { StorageService } from '@/storage/services/storage.service';
import type { UploadsRepository } from '@/modules/uploads/repositories/uploads.repository';
import { UploadsService } from '@/modules/uploads/services/uploads.service';

const MAX_SIZE = 1000;

describe('UploadsService', () => {
  let service: UploadsService;
  let storage: { put: ReturnType<typeof vi.fn>; publicUrl: ReturnType<typeof vi.fn> };
  let repo: { create: ReturnType<typeof vi.fn>; claim: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = {
      put: vi.fn().mockResolvedValue({ url: '/api/uploads/files/x' }),
      publicUrl: vi.fn((key: string) => `http://api/api/uploads/public/${key}`),
    };

    repo = {
      create: vi.fn(
        async (input: Record<string, unknown>): Promise<Attachment> =>
          ({
            id: 'att1',
            messageId: null,
            createdAt: new Date(),
            ...input,
          }) as unknown as Attachment,
      ),
      claim: vi.fn().mockResolvedValue(1),
    };

    const config = {
      getOrThrow: (key: string) => (key === 'UPLOAD_MAX_SIZE_BYTES' ? MAX_SIZE : undefined),
    } as unknown as ConfigService<ApiEnv, true>;

    service = new UploadsService(
      storage as unknown as StorageService,
      repo as unknown as UploadsRepository,
      config,
    );
  });

  describe('upload', () => {
    it('stores the file and returns an AttachmentDto with an absolute url', async () => {
      const buffer = Buffer.from('hello');

      const dto = await service.upload({
        uploaderId: 'u1',
        filename: 'photo.PNG',
        buffer,
        mime: 'image/png',
      });

      expect(storage.put).toHaveBeenCalledTimes(1);
      const putArg = storage.put.mock.calls[0][0] as { key: string; mime: string };

      expect(putArg.key).toMatch(/^attachments\/u1\/[a-f0-9]{24}\.png$/);

      expect(putArg.mime).toBe('image/png');

      expect(dto).toEqual({
        id: 'att1',
        url: `http://api/api/uploads/public/${putArg.key}`,
        mime: 'image/png',
        size: buffer.length,
        width: null,
        height: null,
      });
    });

    it('derives the extension from the filename for unknown mime types', async () => {
      await service.upload({
        uploaderId: 'u1',
        filename: 'archive.tar.gz',
        buffer: Buffer.from('z'),
        mime: 'application/x-gzip',
      });

      const putArg = storage.put.mock.calls[0][0] as { key: string };

      expect(putArg.key).toMatch(/\.gz$/);
    });

    it('rejects an empty file', async () => {
      await expect(
        service.upload({ uploaderId: 'u1', filename: 'f', buffer: Buffer.alloc(0), mime: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storage.put).not.toHaveBeenCalled();
    });

    it('rejects a file larger than the configured max size', async () => {
      await expect(
        service.upload({
          uploaderId: 'u1',
          filename: 'big.bin',
          buffer: Buffer.alloc(MAX_SIZE + 1),
          mime: 'application/octet-stream',
        }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);

      expect(storage.put).not.toHaveBeenCalled();
    });
  });

  describe('claim', () => {
    it('delegates to the repository when ids are present', async () => {
      await service.claim(['a', 'b'], 'u1', 'm1');

      expect(repo.claim).toHaveBeenCalledWith(['a', 'b'], 'u1', 'm1');
    });

    it('is a no-op when no ids are given', async () => {
      await service.claim([], 'u1', 'm1');

      expect(repo.claim).not.toHaveBeenCalled();
    });
  });

  describe('toDto', () => {
    it('maps the prisma row to the public DTO shape', () => {
      const row = {
        id: 'att1',
        url: 'http://api/api/uploads/public/k',
        mime: 'image/png',
        size: 42,
        width: 100,
        height: 200,
        storageKey: 'k',
        uploaderId: 'u1',
        messageId: null,
        createdAt: new Date(),
      } as unknown as Attachment;

      expect(service.toDto(row)).toEqual({
        id: 'att1',
        url: 'http://api/api/uploads/public/k',
        mime: 'image/png',
        size: 42,
        width: 100,
        height: 200,
      });
    });
  });
});
