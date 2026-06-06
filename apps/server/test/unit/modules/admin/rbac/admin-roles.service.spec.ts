import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatagridService } from '@/common/datagrid';
import type { AdminPermissionResolver } from '@/modules/admin/rbac/admin-permission-resolver.service';
import type { AdminRoleRepository } from '@/modules/admin/rbac/admin-role.repository';
import { AdminRolesService } from '@/modules/admin/rbac/admin-roles.service';

function makeRole(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'role_custom_1',
    name: 'Analyst',
    description: null,
    permissionType: 'CUSTOM' as const,
    permissions: ['users.view'],
    isSystem: false,
    cacheRev: 1,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
    _count: { admins: 2 },
    ...overrides,
  };
}

describe('AdminRolesService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let resolver: { invalidate: ReturnType<typeof vi.fn> };
  let grid: { build: ReturnType<typeof vi.fn> };
  let service: AdminRolesService;

  beforeEach(() => {
    repo = {
      list: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      findWithMemberCount: vi.fn(),
      searchWhere: vi.fn().mockReturnValue({ _w: true }),
      listWith: vi.fn().mockResolvedValue([makeRole()]),
      countWith: vi.fn().mockResolvedValue(1),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countAdminsForRole: vi.fn(),
      upsertSystem: vi.fn(),
    };
    resolver = { invalidate: vi.fn() };
    grid = { build: vi.fn().mockReturnValue({ ok: true }) };
    service = new AdminRolesService(
      repo as unknown as AdminRoleRepository,
      resolver as unknown as AdminPermissionResolver,
      grid as unknown as DatagridService,
    );
  });

  describe('datagrid()', () => {
    it('clamps paging, trims search, builds an allow-listed orderBy, and maps rows to the grid', async () => {
      const res = await service.datagrid({
        page: 2,
        pageSize: 5,
        sort: 'name',
        dir: 'asc',
        search: '  Analyst ',
      } as never);

      expect(repo.searchWhere).toHaveBeenCalledWith('Analyst');
      expect(repo.listWith).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        where: { _w: true },
        orderBy: { name: 'asc' },
      });
      expect(repo.countWith).toHaveBeenCalledWith({ _w: true });

      const [def, data] = grid.build.mock.calls[0];
      expect(def.resource).toBe('roles');
      expect(data.total).toBe(1);
      expect(data.rows[0]).toMatchObject({ memberCount: 2, permissions: ['users.view'] });
      expect(res).toEqual({ ok: true });
    });

    it('ignores a non-sortable column and falls back to the default sort', async () => {
      await service.datagrid({ sort: 'actions' } as never);
      expect(repo.listWith).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('passes blank search as undefined to searchWhere', async () => {
      await service.datagrid({ search: '   ' } as never);
      expect(repo.searchWhere).toHaveBeenCalledWith(undefined);
    });
  });

  describe('create()', () => {
    it('should expand parent keys to leaves before storing', async () => {
      repo.findByName.mockResolvedValueOnce(null);
      repo.create.mockImplementationOnce((data: { permissions: string[] }) =>
        Promise.resolve(makeRole({ permissions: data.permissions })),
      );
      const dto = { name: 'Mods', permissions: ['groups'] };
      const created = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [
            'groups.create',
            'groups.delete',
            'groups.manage-members',
            'groups.update',
            'groups.view',
          ],
        }),
      );
      expect(created.permissions).toContain('groups.create');
    });

    it('should reject duplicate names', async () => {
      repo.findByName.mockResolvedValueOnce(makeRole());
      await expect(service.create({ name: 'Analyst' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('should prune unknown permission keys instead of rejecting, keeping valid ones', async () => {
      repo.findByName.mockResolvedValueOnce(null);
      repo.create.mockImplementationOnce((data: { permissions: string[] }) =>
        Promise.resolve(makeRole(data)),
      );
      const created = await service.create({
        name: 'Legacy',
        permissions: ['users.view', 'legacy-feature.removed', 'mystery.key'],
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: ['users.view'] }),
      );
      expect(created.permissions).toEqual(['users.view']);
    });

    it('should store an empty list when permissionType is ALL', async () => {
      repo.findByName.mockResolvedValueOnce(null);
      repo.create.mockImplementationOnce(
        (data: { permissions: string[]; permissionType: string }) =>
          Promise.resolve(makeRole(data)),
      );
      await service.create({ name: 'Super', permissionType: 'ALL', permissions: ['users.view'] });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permissionType: 'ALL', permissions: [] }),
      );
    });
  });

  describe('update()', () => {
    it('should refuse to mutate the Administrator system role', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(
        makeRole({ id: 'role_sys_admin', isSystem: true, permissionType: 'ALL' }),
      );
      await expect(
        service.update('role_sys_admin', { description: 'x' }, null),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should fully edit the Member role since it is no longer a system role', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(
        makeRole({ id: 'role_sys_member', isSystem: false, permissionType: 'CUSTOM' }),
      );
      repo.findByName.mockResolvedValueOnce(null);
      repo.update.mockResolvedValueOnce(makeRole({ id: 'role_sys_member', name: 'Renamed' }));
      await expect(
        service.update('role_sys_member', { name: 'Renamed' }, null),
      ).resolves.toMatchObject({ name: 'Renamed' });
    });

    it('should bump the resolver cache after a successful update', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(makeRole());
      repo.update.mockResolvedValueOnce(makeRole({ description: 'Updated' }));
      await service.update('role_custom_1', { description: 'Updated' }, null);
      expect(resolver.invalidate).toHaveBeenCalledWith('role_custom_1');
    });

    it('should refuse self-lockout when the caller edits their own role and drops critical keys', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(
        makeRole({ permissions: ['roles.view', 'roles.update', 'admin-accounts.update'] }),
      );
      const promise = service.update(
        'role_custom_1',
        { permissions: ['roles.view'] },
        'role_custom_1',
      );
      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should allow editing your own role as long as critical keys remain', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(
        makeRole({
          permissions: ['roles.view', 'roles.update', 'admin-accounts.update', 'users.view'],
        }),
      );
      repo.update.mockImplementationOnce((_: string, data: { permissions: string[] }) =>
        Promise.resolve(makeRole({ permissions: data.permissions })),
      );
      await expect(
        service.update(
          'role_custom_1',
          { permissions: ['roles.view', 'roles.update', 'admin-accounts.update'] },
          'role_custom_1',
        ),
      ).resolves.toBeDefined();
    });

    it('should reject a duplicate name when another role already has it', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(makeRole({ name: 'Old Name' }));
      repo.findByName.mockResolvedValueOnce(makeRole({ id: 'someone-else', name: 'New Name' }));
      await expect(
        service.update('role_custom_1', { name: 'New Name' }, null),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove()', () => {
    it('should refuse to delete a system role', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(makeRole({ isSystem: true }));
      await expect(service.remove('role_sys_admin')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should refuse to delete a role that still has admins', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(makeRole({ _count: { admins: 3 } }));
      await expect(service.remove('role_custom_1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('should delete and invalidate the cache for an empty custom role', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(makeRole({ _count: { admins: 0 } }));
      repo.delete.mockResolvedValueOnce(makeRole());
      await service.remove('role_custom_1');
      expect(repo.delete).toHaveBeenCalledWith('role_custom_1');
      expect(resolver.invalidate).toHaveBeenCalledWith('role_custom_1');
    });

    it('should return NotFound when the id does not exist', async () => {
      repo.findWithMemberCount.mockResolvedValueOnce(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
