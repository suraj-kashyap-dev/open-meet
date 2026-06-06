import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

import { chatMessageInclude, type ChatMessageWithRelations } from './messaging.includes';

@Injectable()
export class PinsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async pin(conversationId: string, messageId: string, pinnedById: string): Promise<void> {
    await this.prisma.pinnedMessage.upsert({
      where: { messageId_pinnedById: { messageId, pinnedById } },
      create: { conversationId, messageId, pinnedById },
      update: {},
    });
  }

  async unpin(messageId: string, pinnedById: string): Promise<void> {
    await this.prisma.pinnedMessage.deleteMany({ where: { messageId, pinnedById } });
  }

  async listPinned(conversationId: string, userId: string): Promise<ChatMessageWithRelations[]> {
    const rows = await this.prisma.pinnedMessage.findMany({
      where: { conversationId, pinnedById: userId },
      orderBy: { createdAt: 'desc' },
      include: { message: { include: chatMessageInclude } },
    });

    return rows.map((row) => row.message);
  }

  async pinnedIdsForUser(conversationId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.pinnedMessage.findMany({
      where: { conversationId, pinnedById: userId },
      select: { messageId: true },
    });

    return rows.map((r) => r.messageId);
  }
}
