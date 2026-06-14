import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { ActivityFeedDto } from '@open-meet/types';

import { PrismaService } from '@/database/services/prisma.service';

import { chatMessageInclude } from '@/modules/client/messaging/messaging.includes';
import { MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';

const activityInclude = {
  ...chatMessageInclude,
  conversation: { select: { id: true, title: true } },
} satisfies Prisma.ChatMessageInclude;

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serializer: MessagingSerializer,
  ) {}

  async feed(userId: string): Promise<ActivityFeedDto> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { deletedAt: null, mentions: { some: { mentionedUserId: userId } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: activityInclude,
    });

    return {
      items: rows.map((row) => ({
        message: this.serializer.message(row, userId),
        conversationId: row.conversationId,
        conversationTitle: row.conversation.title,
      })),
    };
  }
}
