import { Injectable } from '@nestjs/common';
import { ChatMessagePriority, ChatMessageType, type MentionKind } from '@prisma/client';

import { PrismaService } from '../../../../database/services/prisma.service';

import { chatMessageInclude, type ChatMessageWithRelations } from '../messaging.includes';

export interface ChatMessageMeta {
  id: string;
  conversationId: string;
  senderId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface MentionInput {
  kind: MentionKind;
  mentionedUserId: string | null;
}

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    conversationId: string;
    senderId: string;
    content: string;
    type?: ChatMessageType;
    parentId?: string | null;
    priority?: ChatMessagePriority;
    mentions?: MentionInput[];
  }): Promise<ChatMessageWithRelations> {
    const mentions = input.mentions ?? [];

    return this.prisma.chatMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        type: input.type ?? ChatMessageType.TEXT,
        priority: input.priority ?? ChatMessagePriority.NORMAL,
        parentId: input.parentId ?? null,
        ...(mentions.length > 0
          ? {
              mentions: {
                create: mentions.map((m) => ({
                  kind: m.kind,
                  mentionedUserId: m.mentionedUserId,
                })),
              },
            }
          : {}),
      },
      include: chatMessageInclude,
    });
  }

  findById(id: string): Promise<ChatMessageWithRelations | null> {
    return this.prisma.chatMessage.findUnique({ where: { id }, include: chatMessageInclude });
  }

  findMeta(id: string): Promise<ChatMessageMeta | null> {
    return this.prisma.chatMessage.findUnique({
      where: { id },
      select: { id: true, conversationId: true, senderId: true, deletedAt: true, createdAt: true },
    });
  }

  listReplies(parentId: string): Promise<ChatMessageWithRelations[]> {
    return this.prisma.chatMessage.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      include: chatMessageInclude,
    });
  }

  async bumpReplyCount(parentId: string, at: Date): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id: parentId },
      data: { replyCount: { increment: 1 }, lastReplyAt: at },
    });
  }

  async listHistory(params: {
    conversationId: string;
    clearedAt: Date | null;
    cursor?: string;
    limit: number;
  }): Promise<ChatMessageWithRelations[]> {
    const createdAt =
      params.clearedAt || params.cursor
        ? {
            ...(params.clearedAt ? { gt: params.clearedAt } : {}),
            ...(params.cursor ? { lt: new Date(params.cursor) } : {}),
          }
        : undefined;

    const rows = await this.prisma.chatMessage.findMany({
      where: {
        conversationId: params.conversationId,
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      include: chatMessageInclude,
    });

    return rows.reverse();
  }

  updateContent(
    id: string,
    content: string,
    mentions: MentionInput[],
  ): Promise<ChatMessageWithRelations> {
    return this.prisma.chatMessage.update({
      where: { id },
      data: {
        content,
        editedAt: new Date(),
        mentions: {
          deleteMany: {},
          create: mentions.map((m) => ({ kind: m.kind, mentionedUserId: m.mentionedUserId })),
        },
      },
      include: chatMessageInclude,
    });
  }

  softDelete(id: string): Promise<ChatMessageWithRelations> {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { deletedAt: new Date(), content: '' },
      include: chatMessageInclude,
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji } });
  }
}
