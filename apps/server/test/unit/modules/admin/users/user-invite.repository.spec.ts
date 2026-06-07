import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { AdminUserInviteRepository } from '@/modules/admin/users/repositories/user-invite.repository';

describe('AdminUserInviteRepository', () => {
  let repo: AdminUserInviteRepository;
  let userInvite: Record<string, ReturnType<typeof vi.fn>>;
  let user: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: 'inv1' };

  beforeEach(() => {
    userInvite = {
      upsert: vi.fn().mockResolvedValue(sentinel),
      findUnique: vi.fn().mockResolvedValue(sentinel),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(sentinel),
      delete: vi.fn().mockResolvedValue(sentinel),
    };
    user = { count: vi.fn().mockResolvedValue(0) };
    repo = new AdminUserInviteRepository({ userInvite, user } as unknown as PrismaService);
  });

  describe('userExistsByEmail()', () => {
    it('should lowercase the email and return false when count is zero', async () => {
      await expect(repo.userExistsByEmail('Foo@Bar.com')).resolves.toBe(false);
      expect(user.count).toHaveBeenCalledWith({ where: { email: 'foo@bar.com' } });
    });

    it('should return true when a user exists', async () => {
      user.count.mockResolvedValueOnce(1);
      await expect(repo.userExistsByEmail('foo@bar.com')).resolves.toBe(true);
    });
  });

  describe('upsertByEmail()', () => {
    it('should create with all fields and update without email', async () => {
      const expiresAt = new Date('2026-01-01T00:00:00Z');
      const input = {
        email: 'u@x.com',
        name: 'User',
        tokenHash: 'hash',
        invitedById: 'admin1',
        expiresAt,
      };
      await expect(repo.upsertByEmail(input)).resolves.toBe(sentinel);
      expect(userInvite.upsert).toHaveBeenCalledWith({
        where: { email: 'u@x.com' },
        create: {
          email: 'u@x.com',
          name: 'User',
          tokenHash: 'hash',
          invitedById: 'admin1',
          expiresAt,
        },
        update: {
          name: 'User',
          tokenHash: 'hash',
          invitedById: 'admin1',
          expiresAt,
        },
      });
    });
  });

  describe('findById()', () => {
    it('should query by id', async () => {
      await repo.findById('inv1');
      expect(userInvite.findUnique).toHaveBeenCalledWith({ where: { id: 'inv1' } });
    });
  });

  describe('listPending()', () => {
    it('should order by createdAt desc and include the inviter name', async () => {
      await repo.listPending();
      expect(userInvite.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { invitedBy: { select: { name: true } } },
      });
    });
  });

  describe('refreshToken()', () => {
    it('should update token hash and expiry', async () => {
      const expiresAt = new Date('2026-02-01T00:00:00Z');
      await repo.refreshToken('inv1', 'newhash', expiresAt);
      expect(userInvite.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { tokenHash: 'newhash', expiresAt },
      });
    });
  });

  describe('delete()', () => {
    it('should delete by id and resolve void', async () => {
      await expect(repo.delete('inv1')).resolves.toBeUndefined();
      expect(userInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv1' } });
    });
  });
});
