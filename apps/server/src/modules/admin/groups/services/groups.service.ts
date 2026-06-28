import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ApiErrorCode,
  type ActorType,
  type AdminGroupDetailDto,
  type AdminGroupDto,
  type AdminGroupMemberDto,
  type ConversationLifecycleStatus,
  type ConversationOrigin,
  type DatagridResponseDto,
  type GroupActorSummaryDto,
  type ShareHistoryDto,
} from '@open-meet/types';

import type { Prisma } from '@prisma/client';

import { DatagridService, buildOrderBy, paginate } from '../../../../common/datagrid';
import { resolveHistoryCutoff } from '../../../../common/util/history.util';
import { StorageService } from '../../../../storage/services/storage.service';

import type { AdminRequestUser } from '../../auth/strategies/admin-jwt.strategy';

import {
  AdminGroupsRepository,
  type GroupDetail,
  type GroupListRow,
} from '../repositories/groups.repository';
import { AdminGroupsDatagridQueryDto } from '../dto/groups-datagrid-query.dto';
import { GROUPS_DATAGRID } from '../groups.datagrid';

@Injectable()
export class AdminGroupsService {
  constructor(
    private readonly groups: AdminGroupsRepository,
    private readonly storage: StorageService,
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

    const group = await this.groups.create({
      title: trimmed,
      createdByAdminId: admin.id,
      createdByAdminName: admin.email,
      memberIds: unique,
    });

    await this.groups.audit({
      conversationId: group.id,
      action: 'group.created',
      actorAdminId: admin.id,
      actorLabel: admin.email,
      metadata: { title: trimmed, memberIds: unique },
    });

    return this.toDetailDto(group);
  }

  async detail(id: string): Promise<AdminGroupDetailDto> {
    const group = await this.require(id);

    return this.toDetailDto(group);
  }

  async update(
    id: string,
    title: string | undefined,
    admin: AdminRequestUser,
  ): Promise<AdminGroupDetailDto> {
    await this.require(id);

    const trimmed = title?.trim();

    if (!trimmed) {
      return this.toDetailDto(await this.require(id));
    }

    const updated = await this.groups.update(id, trimmed);

    await this.groups.audit({
      conversationId: id,
      action: 'group.updated',
      actorAdminId: admin.id,
      actorLabel: admin.email,
      metadata: { title: trimmed },
    });

    return this.toDetailDto(updated);
  }

  async addMembers(
    id: string,
    userIds: string[],
    admin: AdminRequestUser,
    history?: ShareHistoryDto,
  ): Promise<AdminGroupDetailDto> {
    await this.require(id);
    const unique = [...new Set(userIds)];
    const historyVisibleFrom = resolveHistoryCutoff(history, new Date());

    await this.groups.addMembers(id, unique, historyVisibleFrom);

    await Promise.all(
      unique.map((userId) =>
        this.groups.audit({
          conversationId: id,
          action: 'group.member_added',
          actorAdminId: admin.id,
          actorLabel: admin.email,
          targetUserId: userId,
          metadata: { historyVisibleFrom: historyVisibleFrom?.toISOString() ?? null },
        }),
      ),
    );

    return this.detail(id);
  }

  async removeMember(
    id: string,
    userId: string,
    admin: AdminRequestUser,
  ): Promise<{ removed: true }> {
    await this.require(id);

    await this.groups.removeMember(id, userId);

    await this.groups.audit({
      conversationId: id,
      action: 'group.member_removed',
      actorAdminId: admin.id,
      actorLabel: admin.email,
      targetUserId: userId,
    });

    return { removed: true };
  }

  async remove(id: string, admin: AdminRequestUser): Promise<{ deleted: true }> {
    await this.require(id);

    await this.groups.delete(id, admin.id);

    await this.groups.audit({
      conversationId: id,
      action: 'group.deleted',
      actorAdminId: admin.id,
      actorLabel: admin.email,
    });

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
      origin: group.origin as ConversationOrigin,
      status: group.status as ConversationLifecycleStatus,
      ownerUserId: group.ownerUserId,
      ownerName: group.ownerUser?.name ?? null,
      createdBy: this.actorSummary(group),
      sourceLabel: this.originLabel(group.origin),
      statusLabel: this.statusLabel(group.status),
      ownerLabel: group.ownerUser?.name ?? 'No owner',
      createdByLabel: this.actorLabel(group),
      createdAt: group.createdAt.toISOString(),
    };
  }

  private toDetailDto(group: GroupDetail): AdminGroupDetailDto {
    const members: AdminGroupMemberDto[] = group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatarKey ? this.storage.publicUrl(m.user.avatarKey) : null,
      role: m.role,
    }));

    return {
      ...this.toDto(group),
      memberCount: members.length,
      members,
    };
  }

  private actorSummary(group: GroupListRow | GroupDetail): GroupActorSummaryDto | null {
    if (!group.createdByActorType) {
      return null;
    }

    const relation =
      group.createdByActorType === 'USER'
        ? (group.createdByUser ?? null)
        : group.createdByActorType === 'ADMIN'
          ? (group.createdByAdmin ?? null)
          : null;

    return {
      type: group.createdByActorType as ActorType,
      id: relation?.id ?? group.createdByUserId ?? group.createdByAdminId ?? null,
      name: relation?.name ?? group.createdByDisplayName ?? null,
    };
  }

  private actorLabel(group: GroupListRow | GroupDetail): string {
    const actor = this.actorSummary(group);

    if (!actor) {
      return 'Not detected yet';
    }

    if (actor.name) {
      return `${actor.name} (${actor.type.toLowerCase()})`;
    }

    return actor.type;
  }

  private originLabel(origin: string): string {
    return origin
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private statusLabel(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
