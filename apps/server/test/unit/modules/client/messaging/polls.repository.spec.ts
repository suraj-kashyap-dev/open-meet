import { ChatMessageType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { chatMessageInclude, pollInclude } from '@/modules/client/messaging/messaging.includes';
import { PollsRepository } from '@/modules/client/messaging/repositories/polls.repository';

describe('PollsRepository', () => {
  let repo: PollsRepository;
  let chatMessage: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  let poll: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  let pollOption: { findMany: ReturnType<typeof vi.fn> };
  let pollVote: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  let $transaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chatMessage = {
      create: vi.fn().mockResolvedValue({ id: 'm1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'm1' }),
    };
    poll = {
      create: vi.fn().mockResolvedValue({ id: 'p1' }),
      findUnique: vi.fn().mockResolvedValue(null),
    };
    pollOption = { findMany: vi.fn().mockResolvedValue([]) };
    pollVote = {
      deleteMany: vi.fn().mockReturnValue('delete-op'),
      createMany: vi.fn().mockReturnValue('create-op'),
    };
    $transaction = vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)({ chatMessage, poll });
      }
      return arg;
    });
    repo = new PollsRepository({
      chatMessage,
      poll,
      pollOption,
      pollVote,
      $transaction,
    } as unknown as PrismaService);
  });

  describe('createPollMessage()', () => {
    it('should create a POLL message and poll with ordered options, then fetch the full message', async () => {
      const result = await repo.createPollMessage({
        conversationId: 'c1',
        senderId: 'u1',
        question: 'Lunch?',
        options: ['Pizza', 'Sushi'],
        multiple: true,
      });

      expect(chatMessage.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'c1',
          senderId: 'u1',
          content: 'Lunch?',
          type: ChatMessageType.POLL,
        },
      });
      expect(poll.create).toHaveBeenCalledWith({
        data: {
          messageId: 'm1',
          question: 'Lunch?',
          multiple: true,
          options: {
            create: [
              { text: 'Pizza', order: 0 },
              { text: 'Sushi', order: 1 },
            ],
          },
        },
      });
      expect(chatMessage.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        include: chatMessageInclude,
      });
      expect(result).toEqual({ id: 'm1' });
    });
  });

  describe('findContext()', () => {
    it('should return null when the poll is missing', async () => {
      poll.findUnique.mockResolvedValue(null);
      const result = await repo.findContext('p1');
      expect(poll.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        select: {
          id: true,
          multiple: true,
          closedAt: true,
          messageId: true,
          message: { select: { conversationId: true } },
        },
      });
      expect(result).toBeNull();
    });

    it('should flatten the conversationId from the nested message', async () => {
      poll.findUnique.mockResolvedValue({
        id: 'p1',
        multiple: false,
        closedAt: null,
        messageId: 'm1',
        message: { conversationId: 'c1' },
      });
      const result = await repo.findContext('p1');
      expect(result).toEqual({
        id: 'p1',
        multiple: false,
        closedAt: null,
        messageId: 'm1',
        conversationId: 'c1',
      });
    });
  });

  describe('optionIdsForPoll()', () => {
    it('should select and map option ids', async () => {
      pollOption.findMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }]);
      const ids = await repo.optionIdsForPoll('p1');
      expect(pollOption.findMany).toHaveBeenCalledWith({
        where: { pollId: 'p1' },
        select: { id: true },
      });
      expect(ids).toEqual(['o1', 'o2']);
    });
  });

  describe('setVotes()', () => {
    it('should clear prior votes then insert the new ones in one transaction', async () => {
      await repo.setVotes('p1', 'u1', ['o1', 'o2']);
      expect(pollVote.deleteMany).toHaveBeenCalledWith({ where: { pollId: 'p1', userId: 'u1' } });
      expect(pollVote.createMany).toHaveBeenCalledWith({
        data: [
          { pollOptionId: 'o1', pollId: 'p1', userId: 'u1' },
          { pollOptionId: 'o2', pollId: 'p1', userId: 'u1' },
        ],
      });
      expect($transaction).toHaveBeenCalledWith(['delete-op', 'create-op']);
    });
  });

  describe('findWithOptions()', () => {
    it('should query the poll with options include', async () => {
      await repo.findWithOptions('p1');
      expect(poll.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' }, include: pollInclude });
    });
  });
});
