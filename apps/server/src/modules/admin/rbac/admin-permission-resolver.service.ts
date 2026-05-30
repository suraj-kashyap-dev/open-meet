import { Injectable } from '@nestjs/common';
import type { PermissionType } from '@prisma/client';

import { AdminRoleRepository } from './admin-role.repository';

interface ResolvedRole {
  rev: number;
  permissionType: PermissionType;
  granted: ReadonlySet<string>;
}

/**
 * Loads the effective permission set for an admin's role, with an in-process cache
 * keyed by `(roleId, cacheRev)`. The repository bumps `cacheRev` on every update,
 * so a stale entry is recognised on the very next request.
 */
@Injectable()
export class AdminPermissionResolver {
  private readonly cache = new Map<string, ResolvedRole>();

  constructor(private readonly roles: AdminRoleRepository) {}

  async resolve(roleId: string): Promise<ResolvedRole | null> {
    const role = await this.roles.findById(roleId);
    if (!role) return null;
    const cached = this.cache.get(roleId);
    if (cached && cached.rev === role.cacheRev) return cached;
    const resolved: ResolvedRole = {
      rev: role.cacheRev,
      permissionType: role.permissionType,
      granted: new Set(role.permissions),
    };
    this.cache.set(roleId, resolved);
    return resolved;
  }

  invalidate(roleId: string): void {
    this.cache.delete(roleId);
  }

  clear(): void {
    this.cache.clear();
  }
}
