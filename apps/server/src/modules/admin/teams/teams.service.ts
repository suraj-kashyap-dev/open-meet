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
import type { CreateTeamBodyDto, UpdateTeamBodyDto } from './dto/team.dto';

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

  async create(input: CreateTeamBodyDto): Promise<AdminTeamDto> {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Team name is required.',
      });
    }

    const responsibleAdminId = this.normalizeNullable(input.responsibleAdminId);
    if (responsibleAdminId) await this.ensureAdminExists(responsibleAdminId);

    const team = await this.teams.create({
      name,
      description: this.normalizeNullable(input.description),
      responsibleAdminId,
    });
    return this.toDto(team);
  }

  async detail(id: string): Promise<AdminTeamDetailDto> {
    const team = await this.require(id);
    const members = await this.teams.members(id);

    return { ...this.toDto(team), members: members.map((m) => this.toMemberDto(m)) };
  }

  async update(id: string, input: UpdateTeamBodyDto): Promise<AdminTeamDto> {
    await this.require(id);

    const data: { name?: string; description?: string | null; responsibleAdminId?: string | null } =
      {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length === 0) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Team name is required.',
        });
      }
      data.name = name;
    }
    if (input.description !== undefined) {
      data.description = this.normalizeNullable(input.description);
    }
    if (input.responsibleAdminId !== undefined) {
      const responsibleAdminId = this.normalizeNullable(input.responsibleAdminId);
      if (responsibleAdminId) await this.ensureAdminExists(responsibleAdminId);
      data.responsibleAdminId = responsibleAdminId;
    }

    if (Object.keys(data).length === 0) {
      return this.toDto(await this.require(id));
    }

    return this.toDto(await this.teams.update(id, data));
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
    return this.detail(id);
  }

  async removeMember(id: string, userId: string): Promise<{ removed: true }> {
    await this.require(id);
    await this.teams.removeMember(id, userId);
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

  private async ensureAdminExists(id: string): Promise<void> {
    if (!(await this.teams.adminExists(id))) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Selected responsible admin does not exist.',
      });
    }
  }

  private normalizeNullable(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toDto(team: TeamWithCount): AdminTeamDto {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      responsibleAdminId: team.responsibleAdminId,
      responsibleAdminName: team.responsibleAdmin?.name ?? null,
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
