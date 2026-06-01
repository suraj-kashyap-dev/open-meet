import { Module } from '@nestjs/common';

import { AdminPermissionResolver } from './admin-permission-resolver.service';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminRbacSeedService } from './admin-rbac-seed.service';
import { AdminRoleRepository } from './admin-role.repository';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';

/**
 * RBAC for the admin console. {@link AdminPermissionsGuard} is NOT registered as
 * an APP_GUARD on purpose: registering it globally would make it run on every
 * request - including client routes - before any controller-scoped auth guard
 * populates `req.user`. Instead, each annotated admin controller declares
 * `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)` so the chain runs in order.
 */
@Module({
  controllers: [AdminRolesController, AdminPermissionsController],
  providers: [
    AdminRoleRepository,
    AdminPermissionResolver,
    AdminRolesService,
    AdminRbacSeedService,
    AdminPermissionsGuard,
  ],
  exports: [AdminRoleRepository, AdminPermissionResolver, AdminPermissionsGuard],
})
export class AdminRbacModule {}
