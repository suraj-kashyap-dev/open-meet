import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ADMIN_PERMISSION_KEYS,
  PERMISSION_TREE_USER,
  USER_PERMISSION_KEYS,
  type PermissionCatalogResponseDto,
  type RoleDto,
  type RoleListResponseDto,
  buildCatalogTree,
} from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminUserRolesService } from './admin-user-roles.service';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CreateRoleBodyDto, UpdateRoleBodyDto } from './dto/role.dto';

void ADMIN_PERMISSION_KEYS;

@ApiTags('admin-user-roles')
@Controller('admin/user-roles')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminUserRolesController {
  constructor(private readonly roles: AdminUserRolesService) {}

  @Get()
  @RequirePermissions('user-roles.view')
  @ApiOperation({ summary: 'List every user role with member counts' })
  list(): Promise<RoleListResponseDto> {
    return this.roles.list();
  }

  @Get(':id')
  @RequirePermissions('user-roles.view')
  @ApiOperation({ summary: 'Get a single user role' })
  get(@Param('id') id: string): Promise<RoleDto> {
    return this.roles.get(id);
  }

  @Post()
  @RequirePermissions('user-roles.create')
  @ApiOperation({ summary: 'Create a new user role' })
  create(@Body() dto: CreateRoleBodyDto): Promise<RoleDto> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('user-roles.update')
  @ApiOperation({ summary: 'Update a user role' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleBodyDto): Promise<RoleDto> {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user-roles.delete')
  @ApiOperation({ summary: 'Delete a user role (must have zero members)' })
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    await this.roles.remove(id);
    return { deleted: true };
  }
}

@ApiTags('admin-permissions')
@Controller('admin/permissions')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminUserPermissionsController {
  @Get('user-catalog')
  @RequirePermissions('user-roles.view')
  @ApiOperation({ summary: 'Hierarchical catalog of all user permission keys' })
  catalog(): PermissionCatalogResponseDto {
    return {
      tree: buildCatalogTree(PERMISSION_TREE_USER, 'rbac.user-permissions'),
      keys: [...USER_PERMISSION_KEYS],
    };
  }
}
