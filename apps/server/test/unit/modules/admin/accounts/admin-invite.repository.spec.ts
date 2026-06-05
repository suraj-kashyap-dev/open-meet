import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { AdminInviteRepository } from '@/modules/admin/accounts/admin-invite.repository';

describe('AdminInviteRepository', () => {
  let repo: AdminInviteRepository;
  let adminInvite: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: 'inv1' };

  beforeEach(() => {
    adminInvite = {
      upsert: vi.fn().mockResolvedValue(sentinel),
      findUnique: vi.fn().mockResolvedValue(sentinel),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(sentinel),
      delete: vi.fn().mockResolvedValue(sentinel),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    repo = new AdminInviteRepository({ adminInvite } as unknown as PrismaService);
  });

  describe('upsertByEmail()', () => {
    it('should create with all fields and update without email', async () => {
      const expiresAt = new Date('2026-01-01T00:00:00Z');
      const input = {
        email: 'a@x.com',
        name: 'Admin',
        roleRecordId: 'role1',
        tokenHash: 'hash',
        invitedById: 'admin1',
        expiresAt,
      };
      await expect(repo.upsertByEmail(input)).resolves.toBe(sentinel);
      expect(adminInvite.upsert).toHaveBeenCalledWith({
        where: { email: 'a@x.com' },
        create: {
          email: 'a@x.com',
          name: 'Admin',
          roleRecordId: 'role1',
          tokenHash: 'hash',
          invitedById: 'admin1',
          expiresAt,
        },
        update: {
          name: 'Admin',
          roleRecordId: 'role1',
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
      expect(adminInvite.findUnique).toHaveBeenCalledWith({ where: { id: 'inv1' } });
    });
  });

  describe('findByTokenHash()', () => {
    it('should query by token hash', async () => {
      await repo.findByTokenHash('hash');
      expect(adminInvite.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'hash' } });
    });
  });

  describe('listPending()', () => {
    it('should order by createdAt desc and include inviter and role', async () => {
      await repo.listPending();
      expect(adminInvite.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: {
          invitedBy: { select: { name: true } },
          roleRecord: { select: { id: true, name: true, permissionType: true } },
        },
      });
    });
  });

  describe('refreshToken()', () => {
    it('should update token hash and expiry', async () => {
      const expiresAt = new Date('2026-02-01T00:00:00Z');
      await repo.refreshToken('inv1', 'newhash', expiresAt);
      expect(adminInvite.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { tokenHash: 'newhash', expiresAt },
      });
    });
  });

  describe('delete()', () => {
    it('should delete by id', async () => {
      await repo.delete('inv1');
      expect(adminInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv1' } });
    });
  });

  describe('deleteByEmail()', () => {
    it('should deleteMany by email and resolve void', async () => {
      await expect(repo.deleteByEmail('a@x.com')).resolves.toBeUndefined();
      expect(adminInvite.deleteMany).toHaveBeenCalledWith({ where: { email: 'a@x.com' } });
    });
  });
});
