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

import type { AdminGroupDetailDto, AdminGroupListResponseDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { type AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';

import { AddGroupMembersBodyDto, CreateGroupBodyDto, UpdateGroupBodyDto } from './dto/group.dto';
import { AdminGroupsService } from './groups.service';

@ApiTags('admin-groups')
@Controller('admin/groups')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminGroupsController {
  constructor(private readonly groups: AdminGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List group conversations' })
  list(): Promise<AdminGroupListResponseDto> {
    return this.groups.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a group conversation (admin only)' })
  create(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: CreateGroupBodyDto,
  ): Promise<AdminGroupDetailDto> {
    return this.groups.create(admin.id, dto.title, dto.memberIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group with its members' })
  detail(@Param('id') id: string): Promise<AdminGroupDetailDto> {
    return this.groups.detail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a group' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupBodyDto): Promise<AdminGroupDetailDto> {
    return this.groups.update(id, dto.title);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a group' })
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddGroupMembersBodyDto,
  ): Promise<AdminGroupDetailDto> {
    return this.groups.addMembers(id, dto.userIds);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a group' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ removed: true }> {
    return this.groups.removeMember(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.groups.remove(id);
  }
}
