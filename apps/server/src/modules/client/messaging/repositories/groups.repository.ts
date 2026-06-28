import { Injectable } from '@nestjs/common';
import {
  ConversationMemberRole,
  ConversationType,
  Prisma,
  type Conversation,
  type ConversationMember,
} from '@prisma/client';

import { PrismaService } from '../../../../database/services/prisma.service';

import {
  conversationInclude,
  conversationListInclude,
  type ConversationListRow,
  type ConversationWithMembers,
} from '../messaging.includes';

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    creatorId: string;
    creatorName: string;
    title: string;
    description: string | null;
    memberIds: string[];
  }): Promise<ConversationWithMembers> {
    const memberRows: Prisma.ConversationMemberUncheckedCreateWithoutConversationInput[] = [
      { userId: input.creatorId, role: 'OWNER' },
      ...input.memberIds
        .filter((id) => id !== input.creatorId)
        .map((userId) => ({ userId, role: ConversationMemberRole.MEMBER })),
    ];

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title: input.title,
        description: input.description,
        origin: 'USER_CREATED',
        createdByActorType: 'USER',
        createdByUserId: input.creatorId,
        createdByDisplayName: input.creatorName,
        createdVia: 'WEB_CHAT',
        ownerUserId: input.creatorId,
        members: { create: memberRows },
      },
      include: conversationInclude,
    });
  }

  async pickInvitableUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds }, chatDisabled: false },
      select: { id: true },
    });

    return rows.map((r) => r.id);
  }

  findById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: { id, status: 'ACTIVE' },
    });
  }

  async update(
    id: string,
    fields: { title?: string; description?: string | null; avatarKey?: string | null },
  ): Promise<ConversationWithMembers> {
    return this.prisma.conversation.update({
      where: { id },
      data: fields,
      include: conversationInclude,
    });
  }

  async addMembers(id: string, userIds: string[], historyVisibleFrom: Date | null): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.prisma.conversationMember.createMany({
      data: userIds.map((userId) => ({
        conversationId: id,
        userId,
        role: ConversationMemberRole.MEMBER,
        historyVisibleFrom,
      })),
      skipDuplicates: true,
    });
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.deleteMany({
      where: { conversationId: id, userId },
    });
  }

  async transferOwnership(id: string, currentOwnerId: string | null, nextOwnerId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (currentOwnerId) {
        await tx.conversationMember.updateMany({
          where: { conversationId: id, userId: currentOwnerId, role: 'OWNER' },
          data: { role: ConversationMemberRole.ADMIN },
        });
      }

      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId: id, userId: nextOwnerId } },
        data: { role: 'OWNER' },
      });

      return tx.conversation.update({
        where: { id },
        data: { ownerUserId: nextOwnerId },
        include: conversationInclude,
      });
    });
  }

  async setMemberRole(
    id: string,
    userId: string,
    role: ConversationMemberRole,
  ): Promise<ConversationMember> {
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { role },
    });
  }

  async delete(id: string, actorId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedByActorType: 'USER',
        deletedByActorId: actorId,
      },
    });
  }

  findWithMembers(id: string): Promise<ConversationListRow | null> {
    return this.prisma.conversation.findFirst({
      where: { id, status: 'ACTIVE' },
      include: conversationListInclude,
    });
  }

  async memberUserIds(id: string): Promise<string[]> {
    const rows = await this.prisma.conversationMember.findMany({
      where: { conversationId: id },
      select: { userId: true },
    });

    return rows.map((r) => r.userId);
  }

  findUserName(id: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  async audit(input: {
    conversationId: string;
    action: string;
    actorUserId: string;
    actorLabel?: string | null;
    targetUserId?: string | null;
    metadata?: Prisma.InputJsonValue;
    reason?: string | null;
  }): Promise<void> {
    await this.prisma.groupAuditEvent.create({
      data: {
        conversationId: input.conversationId,
        action: input.action,
        actorType: 'USER',
        actorUserId: input.actorUserId,
        actorLabel: input.actorLabel ?? null,
        targetUserId: input.targetUserId ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
        reason: input.reason ?? null,
      },
    });
  }
}
