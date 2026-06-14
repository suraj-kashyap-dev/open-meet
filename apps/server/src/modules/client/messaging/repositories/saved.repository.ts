import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/database/services/prisma.service';

import { chatMessageInclude } from '@/modules/client/messaging/messaging.includes';

const savedInclude = {
  message: {
    include: { ...chatMessageInclude, conversation: { select: { id: true, title: true } } },
  },
} satisfies Prisma.SavedMessageInclude;

export type SavedMessageRow = Prisma.SavedMessageGetPayload<{ include: typeof savedInclude }>;

@Injectable()
export class SavedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, messageId: string): Promise<void> {
    await this.prisma.savedMessage.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId },
      update: {},
    });
  }

  async unsave(userId: string, messageId: string): Promise<void> {
    await this.prisma.savedMessage.deleteMany({ where: { userId, messageId } });
  }

  listSaved(userId: string): Promise<SavedMessageRow[]> {
    return this.prisma.savedMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: savedInclude,
    });
  }

  async savedIdsForViewer(userId: string, messageIds: string[]): Promise<string[]> {
    if (messageIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.savedMessage.findMany({
      where: { userId, messageId: { in: messageIds } },
      select: { messageId: true },
    });

    return rows.map((r) => r.messageId);
  }
}
