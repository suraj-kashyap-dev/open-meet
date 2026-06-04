import { Injectable } from '@nestjs/common';
import type { PermissionType } from '@prisma/client';

import { AdminRoleRepository } from './admin-role.repository';

interface ResolvedRole {
  rev: number;
  permissionType: PermissionType;
  granted: ReadonlySet<string>;
}

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

  async isSuper(roleId: string | null): Promise<boolean> {
    if (!roleId) return false;
    const resolved = await this.resolve(roleId);
    return resolved?.permissionType === 'ALL';
  }

  invalidate(roleId: string): void {
    this.cache.delete(roleId);
  }

  clear(): void {
    this.cache.clear();
  }
}
