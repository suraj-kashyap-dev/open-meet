import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { AdminRoleRepository } from '@/modules/admin/rbac/repositories/admin-role.repository';

const memberCountInclude = { _count: { select: { admins: true } } };

describe('AdminRoleRepository', () => {
  let repo: AdminRoleRepository;
  let adminRoleRecord: Record<string, ReturnType<typeof vi.fn>>;
  let admin: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: 'role1' };

  beforeEach(() => {
    adminRoleRecord = {
      findUnique: vi.fn().mockResolvedValue(sentinel),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(sentinel),
      update: vi.fn().mockResolvedValue(sentinel),
      delete: vi.fn().mockResolvedValue(sentinel),
      upsert: vi.fn().mockResolvedValue(sentinel),
    };
    admin = { count: vi.fn().mockResolvedValue(3) };
    repo = new AdminRoleRepository({ adminRoleRecord, admin } as unknown as PrismaService);
  });

  describe('findById()', () => {
    it('should query by id', async () => {
      await repo.findById('role1');
      expect(adminRoleRecord.findUnique).toHaveBeenCalledWith({ where: { id: 'role1' } });
    });
  });

  describe('findByName()', () => {
    it('should query by name', async () => {
      await repo.findByName('Administrator');
      expect(adminRoleRecord.findUnique).toHaveBeenCalledWith({
        where: { name: 'Administrator' },
      });
    });
  });

  describe('list()', () => {
    it('should order system-first then by name and include member counts', async () => {
      await repo.list();
      expect(adminRoleRecord.findMany).toHaveBeenCalledWith({
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        include: memberCountInclude,
      });
    });
  });

  describe('findWithMemberCount()', () => {
    it('should query by id and include member counts', async () => {
      await repo.findWithMemberCount('role1');
      expect(adminRoleRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'role1' },
        include: memberCountInclude,
      });
    });
  });

  describe('create()', () => {
    it('should forward the role data', async () => {
      const data = {
        name: 'Editor',
        description: 'desc',
        permissionType: 'CUSTOM' as const,
        permissions: ['users.read'],
      };
      await repo.create(data);
      expect(adminRoleRecord.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update()', () => {
    it('should bump the cache revision', async () => {
      await repo.update('role1', { name: 'New' });
      expect(adminRoleRecord.update).toHaveBeenCalledWith({
        where: { id: 'role1' },
        data: { name: 'New', cacheRev: { increment: 1 } },
      });
    });
  });

  describe('delete()', () => {
    it('should delete by id', async () => {
      await repo.delete('role1');
      expect(adminRoleRecord.delete).toHaveBeenCalledWith({ where: { id: 'role1' } });
    });
  });

  describe('countAdminsForRole()', () => {
    it('should count admins by role record id', async () => {
      await expect(repo.countAdminsForRole('role1')).resolves.toBe(3);
      expect(admin.count).toHaveBeenCalledWith({ where: { roleRecordId: 'role1' } });
    });
  });

  describe('upsertSystem()', () => {
    it('should create a system role with permissions and only update meta', async () => {
      const input = {
        id: 'sys',
        name: 'Administrator',
        description: 'd',
        permissionType: 'ALL' as const,
        defaultPermissions: ['a', 'b'] as const,
      };
      await repo.upsertSystem(input);
      expect(adminRoleRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'sys' },
        create: {
          id: 'sys',
          name: 'Administrator',
          description: 'd',
          permissionType: 'ALL',
          permissions: ['a', 'b'],
          isSystem: true,
        },
        update: {
          description: 'd',
          permissionType: 'ALL',
          isSystem: true,
        },
      });
    });
  });

  describe('ensureDefault()', () => {
    it('should create a non-system role and only re-flag isSystem false on update', async () => {
      const input = {
        id: 'def',
        name: 'Member',
        description: 'd',
        permissionType: 'CUSTOM' as const,
        defaultPermissions: ['x'] as const,
      };
      await repo.ensureDefault(input);
      expect(adminRoleRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'def' },
        create: {
          id: 'def',
          name: 'Member',
          description: 'd',
          permissionType: 'CUSTOM',
          permissions: ['x'],
          isSystem: false,
        },
        update: { isSystem: false },
      });
    });
  });
});
