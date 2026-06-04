import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPermissionResolver } from '@/modules/admin/rbac/admin-permission-resolver.service';
import type { AdminRoleRepository } from '@/modules/admin/rbac/admin-role.repository';

function makeRole(
  overrides: Partial<{
    id: string;
    permissionType: 'ALL' | 'CUSTOM';
    permissions: string[];
    cacheRev: number;
  }> = {},
) {
  return {
    id: overrides.id ?? 'r1',
    name: 'Role',
    description: null,
    permissionType: overrides.permissionType ?? 'CUSTOM',
    permissions: overrides.permissions ?? ['users.view'],
    isSystem: false,
    cacheRev: overrides.cacheRev ?? 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AdminPermissionResolver', () => {
  let repo: { findById: ReturnType<typeof vi.fn> };
  let resolver: AdminPermissionResolver;

  beforeEach(() => {
    repo = { findById: vi.fn() };
    resolver = new AdminPermissionResolver(repo as unknown as AdminRoleRepository);
  });

  describe('resolve()', () => {
    it('should return null when the role does not exist', async () => {
      repo.findById.mockResolvedValueOnce(null);
      expect(await resolver.resolve('missing')).toBeNull();
    });

    it('should return the granted set as a Set for a CUSTOM role', async () => {
      repo.findById.mockResolvedValueOnce(
        makeRole({ permissions: ['users.view', 'users.invite'] }),
      );
      const resolved = await resolver.resolve('r1');
      expect(resolved).not.toBeNull();
      expect(resolved!.permissionType).toBe('CUSTOM');
      expect(resolved!.granted.has('users.view')).toBe(true);
      expect(resolved!.granted.has('users.invite')).toBe(true);
      expect(resolved!.granted.has('users.delete')).toBe(false);
    });

    it('should return permissionType ALL for ALL roles regardless of stored permissions', async () => {
      repo.findById.mockResolvedValueOnce(makeRole({ permissionType: 'ALL', permissions: [] }));
      const resolved = await resolver.resolve('r1');
      expect(resolved!.permissionType).toBe('ALL');
    });

    it('should serve a second call from the cache when cacheRev matches', async () => {
      repo.findById
        .mockResolvedValueOnce(makeRole({ cacheRev: 5 }))
        .mockResolvedValueOnce(makeRole({ cacheRev: 5, permissions: ['MUTATED.NEVER.SEEN'] }));
      await resolver.resolve('r1');
      const second = await resolver.resolve('r1');
      expect(second!.granted.has('users.view')).toBe(true);
      expect(second!.granted.has('MUTATED.NEVER.SEEN')).toBe(false);
    });

    it('should refresh the cache when cacheRev changes', async () => {
      repo.findById
        .mockResolvedValueOnce(makeRole({ cacheRev: 1, permissions: ['users.view'] }))
        .mockResolvedValueOnce(makeRole({ cacheRev: 2, permissions: ['users.delete'] }));
      await resolver.resolve('r1');
      const refreshed = await resolver.resolve('r1');
      expect(refreshed!.granted.has('users.view')).toBe(false);
      expect(refreshed!.granted.has('users.delete')).toBe(true);
    });
  });

  describe('invalidate()', () => {
    it('should force a fresh load on the next resolve() call', async () => {
      repo.findById
        .mockResolvedValueOnce(makeRole({ cacheRev: 1, permissions: ['users.view'] }))
        .mockResolvedValueOnce(makeRole({ cacheRev: 1, permissions: ['users.invite'] }));
      await resolver.resolve('r1');
      resolver.invalidate('r1');
      const next = await resolver.resolve('r1');
      expect(next!.granted.has('users.invite')).toBe(true);
    });
  });
});
