import { Injectable } from '@nestjs/common';
import type { PermissionType } from '@prisma/client';

import { UserRoleRepository } from './user-role.repository';

interface ResolvedUserRole {
  rev: number;
  permissionType: PermissionType;
  granted: ReadonlySet<string>;
}

/** Mirrors {@link AdminPermissionResolver} but against `UserRoleRecord`. */
@Injectable()
export class UserPermissionResolver {
  private readonly cache = new Map<string, ResolvedUserRole>();

  constructor(private readonly roles: UserRoleRepository) {}

  async resolve(roleId: string): Promise<ResolvedUserRole | null> {
    const role = await this.roles.findById(roleId);
    if (!role) return null;
    const cached = this.cache.get(roleId);
    if (cached && cached.rev === role.cacheRev) return cached;
    const resolved: ResolvedUserRole = {
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
