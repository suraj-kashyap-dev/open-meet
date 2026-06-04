import {
  ForbiddenException,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import type { AdminPermissionResolver } from '@/modules/admin/rbac/admin-permission-resolver.service';
import { AdminPermissionsGuard } from '@/modules/admin/rbac/admin-permissions.guard';

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
): AdminPermissionsGuard {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(metadata),
  } as unknown as Reflector;
  const resolver = {
    resolve: vi.fn().mockResolvedValue(resolved),
  } as unknown as AdminPermissionResolver;
  return new AdminPermissionsGuard(reflector, resolver);
}

describe('AdminPermissionsGuard', () => {
  describe('canActivate()', () => {
    it('should allow the request when the handler has no @RequirePermissions metadata', async () => {
      const guard = makeGuard(undefined, null);
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should allow the request when metadata is an empty array', async () => {
      const guard = makeGuard([], null);
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should throw InternalServerError when no admin is on the request', async () => {
      const guard = makeGuard(['users.view'], null);
      await expect(guard.canActivate(makeCtx(undefined))).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('should throw 403 when the admin has no role assigned', async () => {
      const guard = makeGuard(['users.view'], null);
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: null }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should throw 403 when the role record is missing', async () => {
      const guard = makeGuard(['users.view'], null);
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should allow the request when permissionType is ALL regardless of required keys', async () => {
      const guard = makeGuard(['users.delete', 'roles.delete'], {
        permissionType: 'ALL',
        granted: new Set<string>(),
      });
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should allow the request when every required key is in the granted set', async () => {
      const guard = makeGuard(['users.view', 'users.invite'], {
        permissionType: 'CUSTOM',
        granted: new Set(['users.view', 'users.invite', 'meetings.view']),
      });
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).resolves.toBe(true);
    });

    it('should throw 403 when one required key is missing', async () => {
      const guard = makeGuard(['users.view', 'users.delete'], {
        permissionType: 'CUSTOM',
        granted: new Set(['users.view']),
      });
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should not auto-grant parents to children (flat-leaves semantics)', async () => {
      const guard = makeGuard(['departments.manage-members'], {
        permissionType: 'CUSTOM',
        granted: new Set(['departments']),
      });
      await expect(guard.canActivate(makeCtx({ id: 'a1', roleId: 'r1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
