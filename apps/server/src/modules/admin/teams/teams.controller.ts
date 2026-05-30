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

import type {
  AdminTeamDetailDto,
  AdminTeamDto,
  AdminTeamListResponseDto,
} from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminPermissionsGuard } from '../rbac/admin-permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

import {
  AddTeamMembersBodyDto,
  CreateTeamBodyDto,
  UpdateTeamBodyDto,
} from './dto/team.dto';
import { AdminTeamsService } from './teams.service';

@ApiTags('admin-teams')
@Controller('admin/teams')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminTeamsController {
  constructor(private readonly teams: AdminTeamsService) {}

  @Get()
  @RequirePermissions('teams.view')
  @ApiOperation({ summary: 'List all teams' })
  list(): Promise<AdminTeamListResponseDto> {
    return this.teams.list();
  }

  @Post()
  @RequirePermissions('teams.create')
  @ApiOperation({ summary: 'Create a team' })
  create(@Body() dto: CreateTeamBodyDto): Promise<AdminTeamDto> {
    return this.teams.create(dto.name);
  }

  @Get(':id')
  @RequirePermissions('teams.view')
  @ApiOperation({ summary: 'Get a team with its members' })
  detail(@Param('id') id: string): Promise<AdminTeamDetailDto> {
    return this.teams.detail(id);
  }

  @Patch(':id')
  @RequirePermissions('teams.update')
  @ApiOperation({ summary: 'Rename a team' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamBodyDto): Promise<AdminTeamDto> {
    return this.teams.update(id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('teams.delete')
  @ApiOperation({ summary: 'Delete a team' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.teams.remove(id);
  }

  @Post(':id/members')
  @RequirePermissions('teams.manage-members')
  @ApiOperation({ summary: 'Add members to a team' })
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddTeamMembersBodyDto,
  ): Promise<AdminTeamDetailDto> {
    return this.teams.addMembers(id, dto.userIds);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('teams.manage-members')
  @ApiOperation({ summary: 'Remove a member from a team' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ removed: true }> {
    return this.teams.removeMember(id, userId);
  }
}
