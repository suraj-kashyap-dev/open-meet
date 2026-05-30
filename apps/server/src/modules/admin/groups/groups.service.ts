import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ApiErrorCode,
  type AdminGroupDetailDto,
  type AdminGroupDto,
  type AdminGroupListResponseDto,
  type AdminGroupMemberDto,
} from '@open-meet/types';

import { StorageService } from '../../../storage/storage.service';

import { AdminGroupsRepository, type GroupDetail, type GroupListRow } from './groups.repository';

@Injectable()
export class AdminGroupsService {
  constructor(
    private readonly groups: AdminGroupsRepository,
    private readonly storage: StorageService,
  ) {}

  async list(): Promise<AdminGroupListResponseDto> {
    const rows = await this.groups.list();
    return { items: rows.map((g) => this.toDto(g)) };
  }

  async create(
    createdByAdminId: string,
    title: string,
    memberIds: string[],
  ): Promise<AdminGroupDetailDto> {
    const trimmed = title.trim();

    if (trimmed.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Group name is required.',
      });
    }

    const unique = [...new Set(memberIds)];

    if (unique.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'A group needs at least one member.',
      });
    }

    const group = await this.groups.create(trimmed, createdByAdminId, unique);
    return this.toDetailDto(group);
  }

  async detail(id: string): Promise<AdminGroupDetailDto> {
    return this.toDetailDto(await this.require(id));
  }

  async update(id: string, title?: string): Promise<AdminGroupDetailDto> {
    await this.require(id);

    const trimmed = title?.trim();

    if (!trimmed) {
      return this.toDetailDto(await this.require(id));
    }

    return this.toDetailDto(await this.groups.update(id, trimmed));
  }

  async addMembers(id: string, userIds: string[]): Promise<AdminGroupDetailDto> {
    await this.require(id);
    await this.groups.addMembers(id, [...new Set(userIds)]);
    return this.detail(id);
  }

  async removeMember(id: string, userId: string): Promise<{ removed: true }> {
    await this.require(id);
    await this.groups.removeMember(id, userId);
    return { removed: true };
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.require(id);
    await this.groups.delete(id);
    return { deleted: true };
  }

  private async require(id: string): Promise<GroupDetail> {
    const group = await this.groups.findDetail(id);

    if (!group) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Group not found.',
      });
    }

    return group;
  }

  private toDto(group: GroupListRow): AdminGroupDto {
    return {
      id: group.id,
      title: group.title ?? '',
      memberCount: group._count.members,
      createdAt: group.createdAt.toISOString(),
    };
  }

  private toDetailDto(group: GroupDetail): AdminGroupDetailDto {
    const members: AdminGroupMemberDto[] = group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatarKey ? this.storage.publicUrl(m.user.avatarKey) : null,
    }));

    return {
      id: group.id,
      title: group.title ?? '',
      memberCount: group._count.members,
      createdAt: group.createdAt.toISOString(),
      members,
    };
  }
}
