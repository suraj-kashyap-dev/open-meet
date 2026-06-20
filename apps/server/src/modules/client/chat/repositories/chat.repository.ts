import { Injectable } from '@nestjs/common';
import type { Attachment, Message } from '@prisma/client';

import { PrismaService } from '../../../../database/services/prisma.service';

export type MessageWithSender = Message & {
  sender: { id: string; name: string; avatarKey: string | null };
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
        sender: { select: { id: true, name: true, avatarKey: true } },
        attachments: true,
      },
    });
  }

  findById(id: string): Promise<MessageWithSender | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, avatarKey: true } },
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
        sender: { select: { id: true, name: true, avatarKey: true } },
        attachments: true,
      },
    });
  }

  async listMeetingHistory(params: {
    meetingId: string;
    cursor?: string;
    limit: number;
  }): Promise<MessageWithSender[]> {
    const rows = await this.prisma.message.findMany({
      where: {
        meetingId: params.meetingId,
        ...(params.cursor ? { sentAt: { lt: new Date(params.cursor) } } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: params.limit,
      include: {
        sender: { select: { id: true, name: true, avatarKey: true } },
        attachments: true,
      },
    });

    return rows.reverse();
  }
}
