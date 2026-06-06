import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ApiErrorCode,
  type AdminGroupDetailDto,
  type AdminGroupDto,
  type AdminGroupMemberDto,
  type DatagridResponseDto,
} from '@open-meet/types';

import type { Prisma } from '@prisma/client';

import { DatagridService, buildOrderBy, paginate } from '../../../common/datagrid';
import { StorageService } from '../../../storage/storage.service';

import type { AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';
import { ChatPermissionsService } from '../../client/messaging/chat-permissions.service';

import { AdminGroupsRepository, type GroupDetail, type GroupListRow } from './groups.repository';
import { AdminGroupsDatagridQueryDto } from './dto/groups-datagrid-query.dto';
import { GROUPS_DATAGRID } from './groups.datagrid';

@Injectable()
export class AdminGroupsService {
  constructor(
    private readonly groups: AdminGroupsRepository,
    private readonly storage: StorageService,
    private readonly permissions: ChatPermissionsService,
    private readonly grid: DatagridService,
  ) {}

  async datagrid(query: AdminGroupsDatagridQueryDto): Promise<DatagridResponseDto<AdminGroupDto>> {
    const { skip, take } = paginate(query);
    const search = query.search?.trim() || undefined;
    const where = this.groups.searchWhere(search);
    const orderBy = buildOrderBy(
      GROUPS_DATAGRID,
      query,
    ) as Prisma.ConversationOrderByWithRelationInput;

    const [rows, total] = await Promise.all([
      this.groups.listWith({ skip, take, where, orderBy }),
      this.groups.countWith(where),
    ]);

    return this.grid.build(GROUPS_DATAGRID, {
      rows: rows.map((g) => this.toDto(g)),
      total,
      query,
    });
  }

  async create(
    admin: AdminRequestUser,
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
    await this.assertMembersCanChat(unique);

    const group = await this.groups.create(trimmed, admin.id, unique);
    return this.toDetailDto(group);
  }

  async detail(id: string): Promise<AdminGroupDetailDto> {
    const group = await this.require(id);
    return this.toDetailDto(group);
  }

  async update(id: string, title: string | undefined): Promise<AdminGroupDetailDto> {
    await this.require(id);

    const trimmed = title?.trim();

    if (!trimmed) {
      return this.toDetailDto(await this.require(id));
    }

    return this.toDetailDto(await this.groups.update(id, trimmed));
  }

  async addMembers(id: string, userIds: string[]): Promise<AdminGroupDetailDto> {
    const group = await this.require(id);
    const unique = [...new Set(userIds)];
    await this.assertMembersCanChat([...group.members.map((member) => member.user.id), ...unique]);
    await this.groups.addMembers(id, unique);
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
      memberCount: members.length,
      createdAt: group.createdAt.toISOString(),
      members,
    };
  }

  private async assertMembersCanChat(memberIds: string[]): Promise<void> {
    const unique = [...new Set(memberIds.filter(Boolean))];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        if (!(await this.permissions.canDirectMessage(unique[i]!, unique[j]!))) {
          throw new BadRequestException({
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Every group member must be a distinct user.',
          });
        }
      }
    }
  }
}
