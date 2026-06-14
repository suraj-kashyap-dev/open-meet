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

import type { AdminGroupDetailDto, AdminGroupDto, DatagridResponseDto } from '@open-meet/types';

import { Public } from '../../../../common/decorators/public.decorator';

import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { type AdminRequestUser } from '../../auth/strategies/admin-jwt.strategy';
import { AdminPermissionsGuard } from '../../rbac/admin-permissions.guard';
import { RequirePermissions } from '../../rbac/decorators/require-permissions.decorator';

import { AddGroupMembersBodyDto, CreateGroupBodyDto, UpdateGroupBodyDto } from '../dto/group.dto';
import { AdminGroupsDatagridQueryDto } from '../dto/groups-datagrid-query.dto';
import { AdminGroupsService } from '../services/groups.service';

@ApiTags('admin-groups')
@Controller('admin/groups')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminGroupsController {
  constructor(private readonly groups: AdminGroupsService) {}

  @Get('datagrid')
  @RequirePermissions('groups.view')
  @ApiOperation({ summary: 'Server-driven datagrid (schema + rows) for groups' })
  datagrid(
    @Query() query: AdminGroupsDatagridQueryDto,
  ): Promise<DatagridResponseDto<AdminGroupDto>> {
    return this.groups.datagrid(query);
  }

  @Post()
  @RequirePermissions('groups.create')
  @ApiOperation({ summary: 'Create a group conversation (admin only)' })
  create(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: CreateGroupBodyDto,
  ): Promise<AdminGroupDetailDto> {
    return this.groups.create(admin, dto.title, dto.memberIds);
  }

  @Get(':id')
  @RequirePermissions('groups.view')
  @ApiOperation({ summary: 'Get a group with its members' })
  detail(@Param('id') id: string): Promise<AdminGroupDetailDto> {
    return this.groups.detail(id);
  }

  @Patch(':id')
  @RequirePermissions('groups.update')
  @ApiOperation({ summary: 'Rename a group' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupBodyDto): Promise<AdminGroupDetailDto> {
    return this.groups.update(id, dto.title);
  }

  @Post(':id/members')
  @RequirePermissions('groups.manage-members')
  @ApiOperation({ summary: 'Add members to a group' })
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddGroupMembersBodyDto,
  ): Promise<AdminGroupDetailDto> {
    return this.groups.addMembers(id, dto.userIds, dto.history);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('groups.manage-members')
  @ApiOperation({ summary: 'Remove a member from a group' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ removed: true }> {
    return this.groups.removeMember(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('groups.delete')
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.groups.remove(id);
  }
}
