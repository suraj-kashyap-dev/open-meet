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

    await this.roles.upsertSystem({
      id: SYSTEM_USER_RESTRICTED_ROLE_ID,
      name: 'Restricted',
      description: 'No capabilities — assign to chat-disabled / banned users.',
      permissionType: PermissionType.CUSTOM,
      defaultPermissions: DEFAULT_USER_RESTRICTED_PERMISSIONS,
    });

    this.logger.log('User RBAC system roles reconciled.');
  }
}
