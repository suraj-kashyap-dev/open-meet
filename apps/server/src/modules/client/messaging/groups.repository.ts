import { Injectable } from '@nestjs/common';
import {
  ConversationMemberRole,
  ConversationType,
  type Conversation,
  type ConversationMember,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import {
  conversationInclude,
  conversationListInclude,
  type ConversationListRow,
  type ConversationWithMembers,
} from './messaging.includes';

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    creatorId: string;
    title: string;
    description: string | null;
    memberIds: string[];
  }): Promise<ConversationWithMembers> {
    const memberRows = [
      { userId: input.creatorId, role: ConversationMemberRole.ADMIN },
      ...input.memberIds
        .filter((id) => id !== input.creatorId)
        .map((userId) => ({ userId, role: ConversationMemberRole.MEMBER })),
    ];

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title: input.title,
        description: input.description,
        members: { create: memberRows },
      },
      include: conversationInclude,
    });
  }

  async pickInvitableUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds }, chatDisabled: false },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  findById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id } });
  }

  async update(
    id: string,
    fields: { title?: string; description?: string | null },
  ): Promise<ConversationWithMembers> {
    return this.prisma.conversation.update({
      where: { id },
      data: fields,
      include: conversationInclude,
    });
  }

  async addMembers(id: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    await this.prisma.conversationMember.createMany({
      data: userIds.map((userId) => ({
        conversationId: id,
        userId,
        role: ConversationMemberRole.MEMBER,
      })),
      skipDuplicates: true,
    });
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.deleteMany({
      where: { conversationId: id, userId },
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

  async delete(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } });
  }

  findWithMembers(id: string): Promise<ConversationListRow | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
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
}
