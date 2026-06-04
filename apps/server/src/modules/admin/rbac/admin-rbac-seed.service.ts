import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { DEFAULT_ADMIN_MEMBER_PERMISSIONS, PermissionType } from '@open-meet/types';

import { AdminRoleRepository } from './admin-role.repository';

export const SYSTEM_ADMIN_ROLE_ID = 'role_sys_admin';
export const SYSTEM_MEMBER_ROLE_ID = 'role_sys_member';

@Injectable()
export class AdminRbacSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminRbacSeedService.name);

  constructor(private readonly roles: AdminRoleRepository) {}

  async onModuleInit(): Promise<void> {
    await this.roles.upsertSystem({
      id: SYSTEM_ADMIN_ROLE_ID,
      name: 'Administrator',
      description: 'Full access - grants every permission, current and future.',
      permissionType: PermissionType.ALL,
      defaultPermissions: [],
    });

    await this.roles.ensureDefault({
      id: SYSTEM_MEMBER_ROLE_ID,
      name: 'Member',
      description: 'Read-only baseline. Extend via custom roles.',
      permissionType: PermissionType.CUSTOM,
      defaultPermissions: DEFAULT_ADMIN_MEMBER_PERMISSIONS,
    });

    this.logger.log('Admin RBAC roles reconciled.');
  }
}
