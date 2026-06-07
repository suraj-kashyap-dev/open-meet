import { Module } from '@nestjs/common';

import { AdminPermissionResolver } from './services/admin-permission-resolver.service';
import { AdminPermissionsController } from './controllers/admin-permissions.controller';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminRbacSeedService } from './services/admin-rbac-seed.service';
import { AdminRoleRepository } from './repositories/admin-role.repository';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminRolesService } from './services/admin-roles.service';

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
