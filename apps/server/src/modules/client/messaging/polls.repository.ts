import { Injectable } from '@nestjs/common';
import { ChatMessageType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import {
  chatMessageInclude,
  pollInclude,
  type ChatMessageWithRelations,
  type PollWithOptions,
} from './messaging.includes';

export interface PollContext {
  id: string;
  multiple: boolean;
  closedAt: Date | null;
  messageId: string;
  conversationId: string;
}

@Injectable()
export class PollsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPollMessage(input: {
    conversationId: string;
    senderId: string;
    question: string;
    options: string[];
    multiple: boolean;
  }): Promise<ChatMessageWithRelations> {
    const messageId = await this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          content: input.question,
          type: ChatMessageType.POLL,
        },
      });

      await tx.poll.create({
        data: {
          messageId: message.id,
          question: input.question,
          multiple: input.multiple,
          options: { create: input.options.map((text, i) => ({ text, order: i })) },
        },
      });

      return message.id;
    });

    const full = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: chatMessageInclude,
    });

    return full as ChatMessageWithRelations;
  }

  async findContext(pollId: string): Promise<PollContext | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        multiple: true,
        closedAt: true,
        messageId: true,
        message: { select: { conversationId: true } },
      },
    });

    if (!poll) {
      return null;
    }

    return {
      id: poll.id,
      multiple: poll.multiple,
      closedAt: poll.closedAt,
      messageId: poll.messageId,
      conversationId: poll.message.conversationId,
    };
  }

  async optionIdsForPoll(pollId: string): Promise<string[]> {
    const rows = await this.prisma.pollOption.findMany({
      where: { pollId },
      select: { id: true },
    });

    return rows.map((r) => r.id);
  }

  async setVotes(pollId: string, userId: string, optionIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.pollVote.deleteMany({ where: { pollId, userId } }),
      this.prisma.pollVote.createMany({
        data: optionIds.map((pollOptionId) => ({ pollOptionId, pollId, userId })),
      }),
    ]);
  }

  findWithOptions(pollId: string): Promise<PollWithOptions | null> {
    return this.prisma.poll.findUnique({ where: { id: pollId }, include: pollInclude });
  }
}
