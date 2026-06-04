import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StorageService } from '@/storage/storage.service';
import type { AdminUsersRepository, UserWithCounts } from '@/modules/admin/users/users.repository';
import { AdminUsersService } from '@/modules/admin/users/users.service';

vi.mock('argon2', () => ({ hash: vi.fn().mockResolvedValue('HASH'), argon2id: 2 }));

function makeUser(over: Partial<UserWithCounts> = {}): UserWithCounts {
  return {
    id: 'u1',
    name: 'Jane',
    email: 'jane@x.com',
    avatarKey: null,
    timezone: 'UTC',
    language: 'en',
    bio: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    _count: { hostedMeetings: 2, meetings: 5 },
    canCreateGroups: true,
    ...over,
  } as UserWithCounts;
}

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let users: Record<string, ReturnType<typeof vi.fn>>;
  let storage: {
    publicUrl: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    users = {
      list: vi.fn().mockResolvedValue([makeUser()]),
      count: vi.fn().mockResolvedValue(1),
      findById: vi.fn().mockResolvedValue(makeUser()),
      emailTaken: vi.fn().mockResolvedValue(null),
      emailTakenByOther: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(makeUser()),
      update: vi.fn().mockResolvedValue(makeUser()),
      delete: vi.fn().mockResolvedValue(makeUser()),
    };
    storage = {
      publicUrl: vi.fn((k: string) => `pub:${k}`),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    service = new AdminUsersService(
      users as unknown as AdminUsersRepository,
      storage as unknown as StorageService,
    );
  });

  describe('list()', () => {
    it('should clamp paging, trim the search, and return meeting counts in the DTO', async () => {
      const res = await service.list({ page: 0, pageSize: 999, search: '  jane ' } as never);
      expect(users.list).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
        search: 'jane',
      });
      expect(res).toMatchObject({ total: 1, page: 1, pageSize: 100 });
      expect(res.items[0]).toMatchObject({ meetingsHosted: 2, meetingsAttended: 5 });
    });

    it('should resolve a stored avatar to a public url', async () => {
      users.list.mockResolvedValueOnce([makeUser({ avatarKey: 'avatars/u1/a.png' })]);
      const res = await service.list({} as never);
      expect(res.items[0].avatar).toBe('pub:avatars/u1/a.png');
    });
  });

  describe('create()', () => {
    it('should reject an email already used by an existing account', async () => {
      users.emailTaken.mockResolvedValueOnce({ id: 'other' });
      await expect(
        service.create({
          name: 'Jane',
          email: 'jane@x.com',
          password: 'changeme',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('should normalize the email, hash the password, and create the user', async () => {
      const res = await service.create({
        name: '  Jane ',
        email: 'NEW@X.com',
        password: 'changeme',
      } as never);

      expect(users.emailTaken).toHaveBeenCalledWith('new@x.com');
      expect(users.create).toHaveBeenCalledWith({
        name: 'Jane',
        email: 'new@x.com',
        passwordHash: 'HASH',
        timezone: undefined,
        language: undefined,
        bio: null,
        canCreateGroups: undefined,
      });
      expect(res).toMatchObject({ id: 'u1' });
    });
  });

  describe('getById()', () => {
    it('should throw when the user is missing', async () => {
      users.findById.mockResolvedValueOnce(null);
      await expect(service.getById('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should reject an email already used by another account', async () => {
      users.emailTakenByOther.mockResolvedValueOnce({ id: 'other' });
      await expect(service.update('u1', { email: 'taken@x.com' } as never)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should normalize fields, default a blank timezone, null an empty bio, and hash a new password', async () => {
      await service.update('u1', {
        name: '  New ',
        email: 'NEW@X.com',
        timezone: '   ',
        bio: '   ',
        newPassword: 'changeme',
      } as never);
      expect(users.update).toHaveBeenCalledWith('u1', {
        name: 'New',
        email: 'new@x.com',
        timezone: 'UTC',
        bio: null,
        passwordHash: 'HASH',
      });
    });

    it('should set the per-user canCreateGroups flag', async () => {
      await service.update('u1', { canCreateGroups: false } as never);
      expect(users.update).toHaveBeenCalledWith('u1', { canCreateGroups: false });
    });
  });

  describe('delete()', () => {
    it('should throw when missing and remove the user otherwise', async () => {
      users.findById.mockResolvedValueOnce(null);
      await expect(service.delete('nope')).rejects.toBeInstanceOf(NotFoundException);

      users.findById.mockResolvedValueOnce(makeUser());
      await expect(service.delete('u1')).resolves.toEqual({ deleted: true });
      expect(users.delete).toHaveBeenCalledWith('u1');
    });
  });

  describe('uploadAvatar()', () => {
    it('should reject an empty file', async () => {
      await expect(service.uploadAvatar('u1', Buffer.alloc(0), 'image/png')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject a file over the size limit', async () => {
      const tooBig = Buffer.alloc(5 * 1024 * 1024 + 1);
      await expect(service.uploadAvatar('u1', tooBig, 'image/png')).rejects.toBeInstanceOf(
        PayloadTooLargeException,
      );
    });

    it('should reject an unsupported mime type', async () => {
      await expect(
        service.uploadAvatar('u1', Buffer.from('x'), 'application/pdf'),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });

    it('should throw when the user is missing', async () => {
      users.findById.mockResolvedValueOnce(null);
      await expect(
        service.uploadAvatar('nope', Buffer.from('x'), 'image/png'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should store the image, persist a namespaced key, and delete the previous avatar', async () => {
      users.findById.mockResolvedValueOnce(makeUser({ avatarKey: 'avatars/u1/old.png' }));

      const res = await service.uploadAvatar('u1', Buffer.from('img'), 'image/png');

      const putArg = storage.put.mock.calls[0]?.[0] as {
        key: string;
        buffer: Buffer;
        mime: string;
      };
      expect(putArg.key).toMatch(/^avatars\/u1\/[0-9a-f]+\.png$/);
      expect(putArg.mime).toBe('image/png');
      expect(users.update).toHaveBeenCalledWith('u1', { avatarKey: putArg.key });
      expect(storage.delete).toHaveBeenCalledWith('avatars/u1/old.png');
      expect(res).toMatchObject({ id: 'u1' });
    });

    it('should not delete anything when the user had no previous avatar', async () => {
      users.findById.mockResolvedValueOnce(makeUser({ avatarKey: null }));

      await service.uploadAvatar('u1', Buffer.from('img'), 'image/webp');

      expect(storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeAvatar()', () => {
    it('should throw when the user is missing', async () => {
      users.findById.mockResolvedValueOnce(null);
      await expect(service.removeAvatar('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should be a no-op when no avatar is set', async () => {
      users.findById.mockResolvedValueOnce(makeUser({ avatarKey: null }));

      await service.removeAvatar('u1');

      expect(users.update).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('should clear the stored key and delete the object', async () => {
      users.findById.mockResolvedValueOnce(makeUser({ avatarKey: 'avatars/u1/a.png' }));

      await service.removeAvatar('u1');

      expect(users.update).toHaveBeenCalledWith('u1', { avatarKey: null });
      expect(storage.delete).toHaveBeenCalledWith('avatars/u1/a.png');
    });
  });
});
