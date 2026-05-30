import { Injectable } from '@nestjs/common';
import { ConversationType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import {
  conversationInclude,
  conversationListInclude,
  type ConversationListRow,
  type ConversationWithMembers,
} from './messaging.includes';

@Injectable()
export class ConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string): Promise<ConversationListRow[]> {
    return this.prisma.conversation.findMany({
      // DMs + group chats.
      where: {
        members: { some: { userId } },
        type: { in: [ConversationType.DIRECT, ConversationType.GROUP] },
      },
      include: conversationListInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(conversationId: string): Promise<ConversationWithMembers | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
  }

  findDirectByKey(directKey: string): Promise<ConversationWithMembers | null> {
    return this.prisma.conversation.findUnique({
      where: { directKey },
      include: conversationInclude,
    });
  }

  createDirect(
    userAId: string,
    userBId: string,
    directKey: string,
  ): Promise<ConversationWithMembers> {
    return this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        directKey,
        members: { create: [{ userId: userAId }, { userId: userBId }] },
      },
      include: conversationInclude,
    });
  }

  async memberUserIds(conversationId: string): Promise<string[]> {
    const rows = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    return rows.map((r) => r.userId);
  }

  async conversationIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    return rows.map((r) => r.conversationId);
  }

  membershipsForUser(
    userId: string,
  ): Promise<{ conversationId: string; lastReadAt: Date | null }[]> {
    return this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });
  }

  async touch(conversationId: string, at: Date): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: at },
    });
  }

  async markRead(conversationId: string, userId: string, at: Date): Promise<void> {
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: at, manualUnread: false },
    });
  }

  async updateMemberFlags(
    conversationId: string,
    userId: string,
    data: { muted?: boolean; pinned?: boolean; hidden?: boolean; manualUnread?: boolean },
  ): Promise<void> {
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data,
    });
  }

  unreadCount(conversationId: string, userId: string, after: Date | null): Promise<number> {
    return this.prisma.chatMessage.count({
      where: {
        conversationId,
        deletedAt: null,
        senderId: { not: userId },
        ...(after ? { createdAt: { gt: after } } : {}),
      },
    });
  }
}
