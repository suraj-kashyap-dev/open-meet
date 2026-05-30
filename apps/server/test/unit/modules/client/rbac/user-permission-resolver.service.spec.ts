import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserPermissionResolver } from '@/modules/client/rbac/user-permission-resolver.service';
import type { UserRoleRepository } from '@/modules/client/rbac/user-role.repository';

function makeRole(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'urole_x',
    name: 'Member',
    description: null,
    permissionType: 'CUSTOM' as const,
    permissions: ['chat.send'],
    isSystem: false,
    cacheRev: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('UserPermissionResolver', () => {
  let repo: { findById: ReturnType<typeof vi.fn> };
  let resolver: UserPermissionResolver;

  beforeEach(() => {
    repo = { findById: vi.fn() };
    resolver = new UserPermissionResolver(repo as unknown as UserRoleRepository);
  });

  it('should return null when the role is missing', async () => {
    repo.findById.mockResolvedValueOnce(null);
    expect(await resolver.resolve('missing')).toBeNull();
  });

  it('should cache when cacheRev matches between calls', async () => {
    repo.findById
      .mockResolvedValueOnce(makeRole({ cacheRev: 7 }))
      .mockResolvedValueOnce(makeRole({ cacheRev: 7, permissions: ['DROPPED'] }));
    await resolver.resolve('urole_x');
    const next = await resolver.resolve('urole_x');
    expect(next!.granted.has('chat.send')).toBe(true);
    expect(next!.granted.has('DROPPED')).toBe(false);
  });

  it('should refresh when cacheRev changes', async () => {
    repo.findById
      .mockResolvedValueOnce(makeRole({ cacheRev: 1, permissions: ['chat.send'] }))
      .mockResolvedValueOnce(makeRole({ cacheRev: 2, permissions: ['meetings.host'] }));
    await resolver.resolve('urole_x');
    const next = await resolver.resolve('urole_x');
    expect(next!.granted.has('chat.send')).toBe(false);
    expect(next!.granted.has('meetings.host')).toBe(true);
  });
});
