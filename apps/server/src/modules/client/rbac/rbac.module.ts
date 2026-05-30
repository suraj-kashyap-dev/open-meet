import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { UserPermissionResolver } from './user-permission-resolver.service';
import { UserPermissionsGuard } from './user-permissions.guard';
import { UserRbacSeedService } from './user-rbac-seed.service';
import { UserRoleRepository } from './user-role.repository';

/**
 * RBAC for the user-facing app. {@link UserPermissionsGuard} is registered as
 * an APP_GUARD because the global `JwtAuthGuard` already populates `req.user`
 * for every authenticated request. The guard is a no-op on routes lacking
 * `@RequireUserPermissions` metadata, so admin routes pass through untouched.
 */
@Module({
  providers: [
    UserRoleRepository,
    UserPermissionResolver,
    UserRbacSeedService,
    { provide: APP_GUARD, useClass: UserPermissionsGuard },
  ],
  exports: [UserRoleRepository, UserPermissionResolver],
})
export class ClientRbacModule {}
