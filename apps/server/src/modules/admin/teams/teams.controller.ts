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
  AdminChannelDto,
  AdminChannelListResponseDto,
  AdminTeamDetailDto,
  AdminTeamDto,
  AdminTeamListResponseDto,
} from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { type AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';

import { AdminChannelsService } from './channels.service';
import {
  AddTeamMembersBodyDto,
  CreateChannelBodyDto,
  CreateTeamBodyDto,
  UpdateChannelBodyDto,
  UpdateTeamBodyDto,
} from './dto/team.dto';
import { AdminTeamsService } from './teams.service';

@ApiTags('admin-teams')
@Controller('admin/teams')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminTeamsController {
  constructor(
    private readonly teams: AdminTeamsService,
    private readonly channels: AdminChannelsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  list(): Promise<AdminTeamListResponseDto> {
    return this.teams.list();
  }

  @Get(':id/channels')
  @ApiOperation({ summary: "List a team's channels" })
  listChannels(@Param('id') id: string): Promise<AdminChannelListResponseDto> {
    return this.channels.list(id);
  }

  @Post(':id/channels')
  @ApiOperation({ summary: 'Create a channel in a team' })
  createChannel(
    @CurrentAdmin() admin: AdminRequestUser,
    @Param('id') id: string,
    @Body() dto: CreateChannelBodyDto,
  ): Promise<AdminChannelDto> {
    return this.channels.create(id, admin.id, dto);
  }

  @Patch(':id/channels/:channelId')
  @ApiOperation({ summary: 'Rename or describe a channel' })
  updateChannel(
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelBodyDto,
  ): Promise<AdminChannelDto> {
    return this.channels.update(channelId, dto);
  }

  @Delete(':id/channels/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a channel' })
  deleteChannel(@Param('channelId') channelId: string): Promise<{ deleted: true }> {
    return this.channels.remove(channelId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a team' })
  create(@Body() dto: CreateTeamBodyDto): Promise<AdminTeamDto> {
    return this.teams.create(dto.name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team with its members' })
  detail(@Param('id') id: string): Promise<AdminTeamDetailDto> {
    return this.teams.detail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a team' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamBodyDto): Promise<AdminTeamDto> {
    return this.teams.update(id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a team' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.teams.remove(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a team' })
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddTeamMembersBodyDto,
  ): Promise<AdminTeamDetailDto> {
    return this.teams.addMembers(id, dto.userIds);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a team' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ removed: true }> {
    return this.teams.removeMember(id, userId);
  }
}
