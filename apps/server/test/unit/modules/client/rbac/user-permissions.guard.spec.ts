import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import type { UserPermissionResolver } from '@/modules/client/rbac/user-permission-resolver.service';
import { UserPermissionsGuard } from '@/modules/client/rbac/user-permissions.guard';

function makeCtx(user: { id: string; roleId: string | null } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function makeGuard(
  metadata: string[] | undefined,
  resolved: { permissionType: 'ALL' | 'CUSTOM'; granted: Set<string> } | null,
): UserPermissionsGuard {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(metadata),
  } as unknown as Reflector;
  const resolver = {
    resolve: vi.fn().mockResolvedValue(resolved),
  } as unknown as UserPermissionResolver;
  return new UserPermissionsGuard(reflector, resolver);
}

describe('UserPermissionsGuard', () => {
  describe('canActivate()', () => {
    it('should pass when no metadata is set', async () => {
      const guard = makeGuard(undefined, null);
      await expect(guard.canActivate(makeCtx({ id: 'u1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should reject a guest (no roleId) when metadata requires permissions', async () => {
      const guard = makeGuard(['meetings.create'], null);
      await expect(guard.canActivate(makeCtx({ id: 'u1', roleId: null }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should pass for ALL roles regardless of required keys', async () => {
      const guard = makeGuard(['meetings.create', 'chat.send'], {
        permissionType: 'ALL',
        granted: new Set<string>(),
      });
      await expect(guard.canActivate(makeCtx({ id: 'u1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should pass when every required key is granted', async () => {
      const guard = makeGuard(['chat.send', 'chat.react'], {
        permissionType: 'CUSTOM',
        granted: new Set(['chat.send', 'chat.react', 'meetings.create']),
      });
      await expect(guard.canActivate(makeCtx({ id: 'u1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should reject when any required key is missing', async () => {
      const guard = makeGuard(['chat.send', 'chat.upload'], {
        permissionType: 'CUSTOM',
        granted: new Set(['chat.send']),
      });
      await expect(guard.canActivate(makeCtx({ id: 'u1', roleId: 'r1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
