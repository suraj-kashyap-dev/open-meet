import {
  BadRequestException,
  PayloadTooLargeException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { AdminRepository } from '@/modules/admin/admin.repository';
import { AdminAvatarsService } from '@/modules/admin/auth/admin-avatars.service';
import type { StorageService } from '@/storage/storage.service';

const PNG = Buffer.from('fake-png-bytes');

describe('AdminAvatarsService', () => {
  let service: AdminAvatarsService;
  let admins: Record<string, ReturnType<typeof vi.fn>>;
  let storage: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    admins = {
      findById: vi.fn().mockResolvedValue({ id: 'a1', avatarKey: null }),
      update: vi.fn().mockResolvedValue({ id: 'a1' }),
    };
    storage = {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const config = { get: vi.fn().mockReturnValue(undefined) } as unknown as ConfigService<
      ApiEnv,
      true
    >;
    service = new AdminAvatarsService(
      storage as unknown as StorageService,
      admins as unknown as AdminRepository,
      config,
    );
  });

  describe('upload()', () => {
    it('should reject an empty file', async () => {
      await expect(
        service.upload({ adminId: 'a1', buffer: Buffer.alloc(0), mime: 'image/png' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a file larger than the max size', async () => {
      const huge = Buffer.alloc(6 * 1024 * 1024);
      await expect(
        service.upload({ adminId: 'a1', buffer: huge, mime: 'image/png' }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('should reject an unsupported mime type', async () => {
      await expect(
        service.upload({ adminId: 'a1', buffer: PNG, mime: 'text/plain' }),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });

    it('should throw when the admin no longer exists', async () => {
      admins.findById.mockResolvedValueOnce(null);
      await expect(
        service.upload({ adminId: 'a1', buffer: PNG, mime: 'image/png' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should store the file under an admin-scoped key and persist it', async () => {
      await service.upload({ adminId: 'a1', buffer: PNG, mime: 'image/png' });

      const putArg = storage.put.mock.calls[0][0];
      expect(putArg.key).toMatch(/^avatars\/admins\/a1\/[a-f0-9]{24}\.png$/);
      expect(admins.update).toHaveBeenCalledWith('a1', { avatarKey: putArg.key });
    });

    it('should delete the previous avatar when replacing one', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a1', avatarKey: 'avatars/admins/a1/old.png' });
      await service.upload({ adminId: 'a1', buffer: PNG, mime: 'image/png' });
      expect(storage.delete).toHaveBeenCalledWith('avatars/admins/a1/old.png');
    });
  });

  describe('remove()', () => {
    it('should be a no-op when there is no avatar', async () => {
      await service.remove('a1');
      expect(admins.update).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('should clear the key and delete the stored file', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a1', avatarKey: 'avatars/admins/a1/x.png' });
      await service.remove('a1');
      expect(admins.update).toHaveBeenCalledWith('a1', { avatarKey: null });
      expect(storage.delete).toHaveBeenCalledWith('avatars/admins/a1/x.png');
    });
  });
});
