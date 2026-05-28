import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

import { chatMessageInclude, type ChatMessageWithRelations } from './messaging.includes';

@Injectable()
export class PinsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async pin(conversationId: string, messageId: string, pinnedById: string): Promise<void> {
    await this.prisma.pinnedMessage.upsert({
      where: { conversationId_messageId: { conversationId, messageId } },
      create: { conversationId, messageId, pinnedById },
      update: {},
    });
  }

  async unpin(conversationId: string, messageId: string): Promise<void> {
    await this.prisma.pinnedMessage.deleteMany({ where: { conversationId, messageId } });
  }

  async listPinned(conversationId: string): Promise<ChatMessageWithRelations[]> {
    const rows = await this.prisma.pinnedMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: { message: { include: chatMessageInclude } },
    });

    return rows.map((row) => row.message);
  }

  async pinnedIdsForConversation(conversationId: string): Promise<string[]> {
    const rows = await this.prisma.pinnedMessage.findMany({
      where: { conversationId },
      select: { messageId: true },
    });

    return rows.map((r) => r.messageId);
  }
}
