import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import {
  DEFAULT_USER_MEMBER_PERMISSIONS,
  DEFAULT_USER_RESTRICTED_PERMISSIONS,
  PermissionType,
} from '@open-meet/types';

import { UserRoleRepository } from './user-role.repository';

export const SYSTEM_USER_MEMBER_ROLE_ID = 'urole_sys_member';
export const SYSTEM_USER_RESTRICTED_ROLE_ID = 'urole_sys_restricted';

@Injectable()
export class UserRbacSeedService implements OnModuleInit {
  private readonly logger = new Logger(UserRbacSeedService.name);

  constructor(private readonly roles: UserRoleRepository) {}

  async onModuleInit(): Promise<void> {
    await this.roles.upsertSystem({
      id: SYSTEM_USER_MEMBER_ROLE_ID,
      name: 'Member',
      description: 'Default user role — can host meetings, create teams, and chat normally.',
      permissionType: PermissionType.CUSTOM,
      defaultPermissions: DEFAULT_USER_MEMBER_PERMISSIONS,
    });

    // Restricted backs ephemeral guest users (see auth.repository.createGuest).
    // It is seeded but NOT a system role, so operators can rename, re-scope, or
    // delete it — Member is the only immutable system role.
    await this.roles.ensureDefault({
      id: SYSTEM_USER_RESTRICTED_ROLE_ID,
      name: 'Restricted',
      description: 'No capabilities — assign to chat-disabled / banned users.',
      permissionType: PermissionType.CUSTOM,
      defaultPermissions: DEFAULT_USER_RESTRICTED_PERMISSIONS,
    });

    this.logger.log('User RBAC roles reconciled.');
  }
}
