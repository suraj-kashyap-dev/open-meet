import { Injectable } from '@nestjs/common';
import type { Message } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type MessageWithSender = Message & {
  sender: { id: string; name: string; avatar: string | null };
};

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    meetingId: string;
    senderId: string;
    content: string;
  }): Promise<MessageWithSender> {
    return this.prisma.message.create({
      data: input,
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  listForMeeting(meetingId: string, limit = 100): Promise<MessageWithSender[]> {
    return this.prisma.message.findMany({
      where: { meetingId },
      orderBy: { sentAt: 'asc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });
  }
}
