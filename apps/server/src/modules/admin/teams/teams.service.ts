import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ApiErrorCode,
  type AdminTeamDetailDto,
  type AdminTeamDto,
  type AdminTeamListResponseDto,
  type AdminTeamMemberDto,
} from '@open-meet/types';

import { StorageService } from '../../../storage/storage.service';

import {
  AdminTeamsRepository,
  type TeamMemberWithUser,
  type TeamWithCount,
} from './teams.repository';

@Injectable()
export class AdminTeamsService {
  constructor(
    private readonly teams: AdminTeamsRepository,
    private readonly storage: StorageService,
  ) {}

  async list(): Promise<AdminTeamListResponseDto> {
    const rows = await this.teams.list();
    return { items: rows.map((t) => this.toDto(t)) };
  }

  async create(name: string): Promise<AdminTeamDto> {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Team name is required.',
      });
    }

    const team = await this.teams.create(trimmed);
    return this.toDto(team);
  }

  async detail(id: string): Promise<AdminTeamDetailDto> {
    const team = await this.require(id);
    const members = await this.teams.members(id);

    return { ...this.toDto(team), members: members.map((m) => this.toMemberDto(m)) };
  }

  async update(id: string, name?: string): Promise<AdminTeamDto> {
    await this.require(id);

    const trimmed = name?.trim();

    if (!trimmed) {
      return this.toDto(await this.require(id));
    }

    return this.toDto(await this.teams.update(id, trimmed));
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.require(id);
    await this.teams.delete(id);
    return { deleted: true };
  }

  async addMembers(id: string, userIds: string[]): Promise<AdminTeamDetailDto> {
    await this.require(id);
    const unique = [...new Set(userIds)];
    await this.teams.addMembers(id, unique);
    await this.teams.addMembersToChannels(id, unique);
    return this.detail(id);
  }

  async removeMember(id: string, userId: string): Promise<{ removed: true }> {
    await this.require(id);
    await this.teams.removeMember(id, userId);
    await this.teams.removeMemberFromChannels(id, userId);
    return { removed: true };
  }

  private async require(id: string): Promise<TeamWithCount> {
    const team = await this.teams.findWithCount(id);

    if (!team) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Team not found.',
      });
    }

    return team;
  }

  private toDto(team: TeamWithCount): AdminTeamDto {
    return {
      id: team.id,
      name: team.name,
      memberCount: team._count.members,
      createdAt: team.createdAt.toISOString(),
    };
  }

  private toMemberDto(member: TeamMemberWithUser): AdminTeamMemberDto {
    return {
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatarKey ? this.storage.publicUrl(member.user.avatarKey) : null,
      joinedAt: member.joinedAt.toISOString(),
    };
  }
}
