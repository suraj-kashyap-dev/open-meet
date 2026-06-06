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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { DatagridResponseDto, RoleDto, RoleListResponseDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { type AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';

import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminRolesService } from './admin-roles.service';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { AdminRolesDatagridQueryDto } from './dto/roles-datagrid-query.dto';
import { CreateRoleBodyDto, UpdateRoleBodyDto } from './dto/role.dto';

@ApiTags('admin-roles')
@Controller('admin/roles')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminRolesController {
  constructor(private readonly roles: AdminRolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'List every admin role with member counts' })
  list(): Promise<RoleListResponseDto> {
    return this.roles.list();
  }

  @Get('datagrid')
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'Server-driven datagrid (schema + rows) for roles' })
  datagrid(@Query() query: AdminRolesDatagridQueryDto): Promise<DatagridResponseDto<RoleDto>> {
    return this.roles.datagrid(query);
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'Get a single admin role' })
  get(@Param('id') id: string): Promise<RoleDto> {
    return this.roles.get(id);
  }

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a new admin role' })
  create(@Body() dto: CreateRoleBodyDto): Promise<RoleDto> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: 'Update an admin role (system roles are partially locked)' })
  update(
    @CurrentAdmin() admin: AdminRequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleBodyDto,
  ): Promise<RoleDto> {
    return this.roles.update(id, dto, admin.roleId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Delete an admin role (must have zero members)' })
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    await this.roles.remove(id);
    return { deleted: true };
  }
}
