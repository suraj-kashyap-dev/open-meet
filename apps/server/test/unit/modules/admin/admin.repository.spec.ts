import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { AdminRepository } from '@/modules/admin/repositories/admin.repository';

describe('AdminRepository', () => {
  let repo: AdminRepository;
  let admin: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    admin = {
      findUnique: vi.fn().mockResolvedValue({ id: 'a1' }),
      update: vi.fn().mockResolvedValue({ id: 'a1' }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'a1' }),
      delete: vi.fn().mockResolvedValue({ id: 'a1' }),
      count: vi.fn().mockResolvedValue(1),
    };

    repo = new AdminRepository({ admin } as unknown as PrismaService);
  });

  describe('searchWhere()', () => {
    it('returns an empty object when search is undefined', () => {
      expect(repo.searchWhere(undefined)).toEqual({});
    });

    it('returns a case-insensitive OR filter for name and email', () => {
      const w = repo.searchWhere('alice');

      expect(w).toEqual({
        OR: [
          { name: { contains: 'alice', mode: 'insensitive' } },
          { email: { contains: 'alice', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('listWith()', () => {
    it('passes skip, take, where, and orderBy to findMany', async () => {
      const where = { name: { contains: 'alice', mode: 'insensitive' as const } };
      const orderBy = { name: 'asc' as const };

      await repo.listWith({ skip: 0, take: 10, where, orderBy });

      expect(admin.findMany).toHaveBeenCalledWith({ skip: 0, take: 10, where, orderBy });
    });
  });

  describe('countWith()', () => {
    it('passes the where clause to count', async () => {
      const where = { email: { contains: 'x', mode: 'insensitive' as const } };

      await repo.countWith(where);

      expect(admin.count).toHaveBeenCalledWith({ where });
    });
  });

  describe('findByEmail()', () => {
    it('should lowercase the email before querying', async () => {
      await repo.findByEmail('Admin@X.COM');

      expect(admin.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@x.com' } });
    });
  });

  describe('touchLastLogin()', () => {
    it('should stamp lastLoginAt with the current time', async () => {
      await repo.touchLastLogin('a1');

      expect(admin.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('countByRoleRecord()', () => {
    it('should filter the count by RBAC role id', async () => {
      await expect(repo.countByRoleRecord('role_sys_admin')).resolves.toBe(1);

      expect(admin.count).toHaveBeenCalledWith({ where: { roleRecordId: 'role_sys_admin' } });
    });
  });

  describe('delete()', () => {
    it('should remove the admin by id', async () => {
      await repo.delete('a1');

      expect(admin.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });
  });
});
