import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ADMIN_PERMISSION_KEYS,
  PERMISSION_TREE_ADMIN,
  type PermissionCatalogResponseDto,
  buildCatalogTree,
} from '@open-meet/types';

import { Public } from '../../../../common/decorators/public.decorator';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';

import { AdminPermissionsGuard } from '../admin-permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';

@ApiTags('admin-permissions')
@Controller('admin/permissions')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminPermissionsController {
  @Get('catalog')
  @RequirePermissions('roles.view')
  @ApiOperation({
    summary: 'Hierarchical catalog of all admin permission keys (for the role picker)',
  })
  catalog(): PermissionCatalogResponseDto {
    return {
      tree: buildCatalogTree(PERMISSION_TREE_ADMIN, 'rbac.permissions'),
      keys: [...ADMIN_PERMISSION_KEYS],
    };
  }
}
