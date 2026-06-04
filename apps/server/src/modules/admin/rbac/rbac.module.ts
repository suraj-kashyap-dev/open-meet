import { Module } from '@nestjs/common';

import { AdminPermissionResolver } from './admin-permission-resolver.service';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminRbacSeedService } from './admin-rbac-seed.service';
import { AdminRoleRepository } from './admin-role.repository';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';

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
