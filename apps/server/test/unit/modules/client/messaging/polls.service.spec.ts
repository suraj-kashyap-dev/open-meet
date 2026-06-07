import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { PollsService } from '@/modules/client/messaging/services/polls.service';
import { type PollsRepository } from '@/modules/client/messaging/repositories/polls.repository';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';
import { type MessagesService } from '@/modules/client/messaging/services/messages.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import {
  type ChatBus,
  conversationRoom,
} from '@/modules/client/messaging/services/chat-bus.service';

describe('PollsService', () => {
  let polls: {
    createPollMessage: ReturnType<typeof vi.fn>;
    findContext: ReturnType<typeof vi.fn>;
    optionIdsForPoll: ReturnType<typeof vi.fn>;
    setVotes: ReturnType<typeof vi.fn>;
    findWithOptions: ReturnType<typeof vi.fn>;
  };
  let conversations: { touch: ReturnType<typeof vi.fn> };
  let permissions: { assertCanPost: ReturnType<typeof vi.fn> };
  let messages: { broadcastNew: ReturnType<typeof vi.fn> };
  let serializer: { poll: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let service: PollsService;

  beforeEach(() => {
    polls = {
      createPollMessage: vi.fn().mockResolvedValue({ id: 'm1', createdAt: new Date('2026-01-01') }),
      findContext: vi.fn(),
      optionIdsForPoll: vi.fn().mockResolvedValue(['o1', 'o2', 'o3']),
      setVotes: vi.fn(),
      findWithOptions: vi.fn().mockResolvedValue({ id: 'p1' }),
    };
    conversations = { touch: vi.fn() };
    permissions = { assertCanPost: vi.fn() };
    messages = { broadcastNew: vi.fn().mockResolvedValue({ id: 'm1' }) };
    serializer = { poll: vi.fn().mockReturnValue({ id: 'p1', options: [] }) };
    bus = { emit: vi.fn() };
    service = new PollsService(
      polls as unknown as PollsRepository,
      conversations as unknown as ConversationsRepository,
      permissions as unknown as ChatPermissionsService,
      messages as unknown as MessagesService,
      serializer as unknown as MessagingSerializer,
      bus as unknown as ChatBus,
    );
  });

  describe('create()', () => {
    const validDto = { question: 'Lunch?', options: ['Pizza', 'Sushi'], multiple: false };

    it('should gate on post permission, persist, touch the conversation, and broadcast', async () => {
      const result = await service.create('c1', 'u1', validDto);

      expect(permissions.assertCanPost).toHaveBeenCalledWith('c1', 'u1');
      expect(polls.createPollMessage).toHaveBeenCalledWith({
        conversationId: 'c1',
        senderId: 'u1',
        question: 'Lunch?',
        options: ['Pizza', 'Sushi'],
        multiple: false,
      });
      expect(conversations.touch).toHaveBeenCalledWith('c1', expect.any(Date));
      expect(messages.broadcastNew).toHaveBeenCalledWith(
        { id: 'm1', createdAt: expect.any(Date) },
        'u1',
      );
      expect(result).toEqual({ id: 'm1' });
    });

    it('should trim the question and options and drop blank options', async () => {
      await service.create('c1', 'u1', {
        question: '  Lunch?  ',
        options: ['  Pizza  ', '', '  Sushi'],
        multiple: false,
      });

      expect(polls.createPollMessage).toHaveBeenCalledWith(
        expect.objectContaining({ question: 'Lunch?', options: ['Pizza', 'Sushi'] }),
      );
    });

    it('should default multiple to false when omitted', async () => {
      await service.create('c1', 'u1', { question: 'Q?', options: ['a', 'b'] } as never);

      expect(polls.createPollMessage).toHaveBeenCalledWith(
        expect.objectContaining({ multiple: false }),
      );
    });

    it('should reject a blank question', async () => {
      await expect(
        service.create('c1', 'u1', { question: '   ', options: ['a', 'b'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(polls.createPollMessage).not.toHaveBeenCalled();
    });

    it('should reject fewer than two options', async () => {
      await expect(
        service.create('c1', 'u1', { question: 'Q?', options: ['only one'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject more than ten options', async () => {
      const options = Array.from({ length: 11 }, (_, i) => `opt${i}`);
      await expect(service.create('c1', 'u1', { question: 'Q?', options })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should treat missing options as an empty list and reject', async () => {
      await expect(service.create('c1', 'u1', { question: 'Q?' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('vote()', () => {
    const context = {
      conversationId: 'c1',
      messageId: 'm1',
      closedAt: null,
      multiple: false,
    };

    beforeEach(() => {
      polls.findContext.mockResolvedValue(context);
    });

    it('should record the vote and broadcast the updated poll', async () => {
      const result = await service.vote('p1', 'u1', ['o1']);

      expect(permissions.assertCanPost).toHaveBeenCalledWith('c1', 'u1');
      expect(polls.setVotes).toHaveBeenCalledWith('p1', 'u1', ['o1']);
      expect(serializer.poll).toHaveBeenCalledWith({ id: 'p1' }, 'u1');
      expect(bus.emit).toHaveBeenCalledWith(conversationRoom('c1'), ChatServerEvent.POLL_UPDATE, {
        conversationId: 'c1',
        messageId: 'm1',
        poll: { id: 'p1', options: [] },
      });
      expect(result).toEqual({ id: 'p1', options: [] });
    });

    it('should de-duplicate option ids before persisting', async () => {
      await service.vote('p1', 'u1', ['o1', 'o1']);

      expect(polls.setVotes).toHaveBeenCalledWith('p1', 'u1', ['o1']);
    });

    it('should reject when the poll does not exist', async () => {
      polls.findContext.mockResolvedValue(null);
      await expect(service.vote('p1', 'u1', ['o1'])).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject voting on a closed poll', async () => {
      polls.findContext.mockResolvedValue({ ...context, closedAt: new Date() });
      await expect(service.vote('p1', 'u1', ['o1'])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should reject when no options are selected', async () => {
      await expect(service.vote('p1', 'u1', [])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject multiple selections on a single-choice poll', async () => {
      await expect(service.vote('p1', 'u1', ['o1', 'o2'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should allow multiple selections on a multi-choice poll', async () => {
      polls.findContext.mockResolvedValue({ ...context, multiple: true });

      await service.vote('p1', 'u1', ['o1', 'o2']);

      expect(polls.setVotes).toHaveBeenCalledWith('p1', 'u1', ['o1', 'o2']);
    });

    it('should reject options that are not part of the poll', async () => {
      polls.optionIdsForPoll.mockResolvedValue(['o1']);
      await expect(service.vote('p1', 'u1', ['oX'])).rejects.toBeInstanceOf(BadRequestException);
      expect(polls.setVotes).not.toHaveBeenCalled();
    });

    it('should reject when the poll cannot be reloaded after voting', async () => {
      polls.findWithOptions.mockResolvedValue(null);
      await expect(service.vote('p1', 'u1', ['o1'])).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
