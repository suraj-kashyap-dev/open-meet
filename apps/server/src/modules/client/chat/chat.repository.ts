import { Injectable } from '@nestjs/common';
import type { Attachment, Message } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export type MessageWithSender = Message & {
  sender: { id: string; name: string; avatar: string | null };
  attachments: Attachment[];
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
        attachments: true,
      },
    });
  }

  findById(id: string): Promise<MessageWithSender | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        attachments: true,
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
        attachments: true,
      },
    });
  }
}
