import { AdminRole } from '@prisma/client';
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
    it('should order by role then creation date', async () => {
      await repo.list();
      expect(admin.findMany).toHaveBeenCalledWith({
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    });
  });

  describe('countByRole()', () => {
    it('should filter the count by role', async () => {
      await expect(repo.countByRole(AdminRole.SUPERADMIN)).resolves.toBe(1);
      expect(admin.count).toHaveBeenCalledWith({ where: { role: AdminRole.SUPERADMIN } });
    });
  });

  describe('delete()', () => {
    it('should remove the admin by id', async () => {
      await repo.delete('a1');
      expect(admin.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });
  });
});
