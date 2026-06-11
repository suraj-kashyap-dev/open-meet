import {
  BadRequestException,
  PayloadTooLargeException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { StorageService } from '@/storage/services/storage.service';
import type { AuthRepository } from '@/modules/client/auth/repositories/auth.repository';
import { AvatarsService } from '@/modules/client/auth/services/avatars.service';

const MAX = 1000;

describe('AvatarsService', () => {
  let service: AvatarsService;
  let storage: {
    put: ReturnType<typeof vi.fn>;
    publicUrl: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let users: { findById: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = {
      put: vi.fn().mockResolvedValue({ url: '/x' }),
      publicUrl: vi.fn((k: string) => `pub:${k}`),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    users = {
      findById: vi.fn().mockResolvedValue({ id: 'u1', avatarKey: null } as User),
      update: vi.fn().mockResolvedValue({ id: 'u1' } as User),
    };
    const config = { get: () => MAX } as unknown as ConfigService<ApiEnv, true>;

    service = new AvatarsService(
      storage as unknown as StorageService,
      users as unknown as AuthRepository,
      config,
    );
  });

  const upload = (over: Partial<{ buffer: Buffer; mime: string }> = {}) =>
    service.upload({ userId: 'u1', buffer: Buffer.from('img'), mime: 'image/png', ...over });

  describe('upload()', () => {
    it('should reject an empty file', async () => {
      await expect(upload({ buffer: Buffer.alloc(0) })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a file over the size cap', async () => {
      await expect(upload({ buffer: Buffer.alloc(MAX + 1) })).rejects.toBeInstanceOf(
        PayloadTooLargeException,
      );
    });

    it('should reject an unsupported mime type', async () => {
      await expect(upload({ mime: 'application/pdf' })).rejects.toBeInstanceOf(
        UnsupportedMediaTypeException,
      );
    });

    it('should reject when the user does not exist', async () => {
      users.findById.mockResolvedValueOnce(null);

      await expect(upload()).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should store the avatar under a per-user key and persist avatarKey', async () => {
      const { key } = await service.upload({
        userId: 'u1',
        buffer: Buffer.from('img'),
        mime: 'image/jpeg',
      });

      expect(key).toMatch(/^avatars\/u1\/[a-f0-9]{24}\.jpg$/);

      expect(storage.put).toHaveBeenCalledWith(
        expect.objectContaining({ key, mime: 'image/jpeg' }),
      );

      expect(users.update).toHaveBeenCalledWith('u1', { avatarKey: key });
    });

    it('should delete the previous avatar when it is replaced', async () => {
      users.findById.mockResolvedValueOnce({ id: 'u1', avatarKey: 'avatars/u1/old.png' } as User);

      await service.upload({ userId: 'u1', buffer: Buffer.from('img'), mime: 'image/png' });

      expect(storage.delete).toHaveBeenCalledWith('avatars/u1/old.png');
    });
  });

  describe('remove()', () => {
    it('should be a no-op when the user has no avatar', async () => {
      users.findById.mockResolvedValueOnce({ id: 'u1', avatarKey: null } as User);

      await service.remove('u1');

      expect(users.update).not.toHaveBeenCalled();

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('should clear avatarKey and delete the stored file', async () => {
      users.findById.mockResolvedValueOnce({ id: 'u1', avatarKey: 'avatars/u1/old.png' } as User);

      await service.remove('u1');

      expect(users.update).toHaveBeenCalledWith('u1', { avatarKey: null });

      expect(storage.delete).toHaveBeenCalledWith('avatars/u1/old.png');
    });
  });

  describe('resolveUrl()', () => {
    it('should return null for no key and a public url otherwise', () => {
      expect(service.resolveUrl(null)).toBeNull();

      expect(service.resolveUrl('avatars/u1/x.png')).toBe('pub:avatars/u1/x.png');
    });
  });
});
