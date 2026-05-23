import { ConflictException, NotFoundException } from '@nestjs/common';
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
    ...over,
  } as UserWithCounts;
}

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let users: Record<string, ReturnType<typeof vi.fn>>;
  let storage: { publicUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    users = {
      list: vi.fn().mockResolvedValue([makeUser()]),
      count: vi.fn().mockResolvedValue(1),
      findById: vi.fn().mockResolvedValue(makeUser()),
      emailTakenByOther: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(makeUser()),
      delete: vi.fn().mockResolvedValue(makeUser()),
    };
    storage = { publicUrl: vi.fn((k: string) => `pub:${k}`) };
    service = new AdminUsersService(
      users as unknown as AdminUsersRepository,
      storage as unknown as StorageService,
    );
  });

  describe('list()', () => {
    it('should clamp paging, trim the search, and return meeting counts in the DTO', async () => {
      const res = await service.list({ page: 0, pageSize: 999, search: '  jane ' } as never);
      expect(users.list).toHaveBeenCalledWith({ skip: 0, take: 100, search: 'jane' });
      expect(res).toMatchObject({ total: 1, page: 1, pageSize: 100 });
      expect(res.items[0]).toMatchObject({ meetingsHosted: 2, meetingsAttended: 5 });
    });

    it('should resolve a stored avatar to a public url', async () => {
      users.list.mockResolvedValueOnce([makeUser({ avatarKey: 'avatars/u1/a.png' })]);
      const res = await service.list({} as never);
      expect(res.items[0].avatar).toBe('pub:avatars/u1/a.png');
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
});
