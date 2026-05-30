import { Module } from '@nestjs/common';

import { ClientRbacModule } from '../../client/rbac/rbac.module';

import { AdminPermissionResolver } from './admin-permission-resolver.service';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminRbacSeedService } from './admin-rbac-seed.service';
import { AdminRoleRepository } from './admin-role.repository';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';
import {
  AdminUserPermissionsController,
  AdminUserRolesController,
} from './admin-user-roles.controller';
import { AdminUserRolesService } from './admin-user-roles.service';

/**
 * RBAC for the admin console. {@link AdminPermissionsGuard} is NOT registered as
 * an APP_GUARD on purpose: registering it globally would make it run on every
 * request — including client routes — before any controller-scoped auth guard
 * populates `req.user`. Instead, each annotated admin controller declares
 * `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)` so the chain runs in order.
 */
@Module({
  imports: [ClientRbacModule],
  controllers: [
    AdminRolesController,
    AdminPermissionsController,
    AdminUserRolesController,
    AdminUserPermissionsController,
  ],
  providers: [
    AdminRoleRepository,
    AdminPermissionResolver,
    AdminRolesService,
    AdminRbacSeedService,
    AdminPermissionsGuard,
    AdminUserRolesService,
  ],
  exports: [AdminRoleRepository, AdminPermissionResolver, AdminPermissionsGuard],
})
export class AdminRbacModule {}
