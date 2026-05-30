import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { AdminRepository } from '@/modules/admin/admin.repository';

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

  describe('list()', () => {
    it('should order by creation date', async () => {
      await repo.list();
      expect(admin.findMany).toHaveBeenCalledWith({
        orderBy: [{ createdAt: 'asc' }],
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
