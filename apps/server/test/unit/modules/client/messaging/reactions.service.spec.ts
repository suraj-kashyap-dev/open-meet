import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { ReactionsService } from '@/modules/client/messaging/reactions.service';
import { type MessagesRepository } from '@/modules/client/messaging/messages.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type ChatBus, conversationRoom } from '@/modules/client/messaging/chat-bus.service';

describe('ReactionsService', () => {
  let messages: {
    findMeta: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    addReaction: ReturnType<typeof vi.fn>;
    removeReaction: ReturnType<typeof vi.fn>;
  };
  let permissions: {
    assertCanPost: ReturnType<typeof vi.fn>;
    assertConversationMember: ReturnType<typeof vi.fn>;
  };
  let serializer: { message: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let service: ReactionsService;

  const meta = { id: 'm1', conversationId: 'c1', senderId: 'u2', deletedAt: null };
  const full = { id: 'm1', conversationId: 'c1' };

  beforeEach(() => {
    messages = {
      findMeta: vi.fn().mockResolvedValue(meta),
      findById: vi.fn().mockResolvedValue(full),
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
    };
    permissions = {
      assertCanPost: vi.fn(),
      assertConversationMember: vi.fn(),
    };
    serializer = {
      message: vi.fn().mockReturnValue({ id: 'm1', reactions: [{ emoji: '👍', count: 1 }] }),
    };
    bus = { emit: vi.fn() };
    service = new ReactionsService(
      messages as unknown as MessagesRepository,
      permissions as unknown as ChatPermissionsService,
      serializer as unknown as MessagingSerializer,
      bus as unknown as ChatBus,
    );
  });

  describe('add()', () => {
    it('should gate on post permission, persist the reaction, and broadcast', async () => {
      const result = await service.add('m1', 'u1', '👍');

      expect(permissions.assertCanPost).toHaveBeenCalledWith('c1', 'u1');
      expect(messages.addReaction).toHaveBeenCalledWith('m1', 'u1', '👍');
      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.REACTION_UPDATED,
        { conversationId: 'c1', messageId: 'm1', reactions: [{ emoji: '👍', count: 1 }] },
      );
      expect(result).toEqual({ id: 'm1', reactions: [{ emoji: '👍', count: 1 }] });
    });

    it('should trim the emoji before persisting', async () => {
      await service.add('m1', 'u1', '  🎉  ');

      expect(messages.addReaction).toHaveBeenCalledWith('m1', 'u1', '🎉');
    });

    it('should reject an empty emoji', async () => {
      await expect(service.add('m1', 'u1', '   ')).rejects.toBeInstanceOf(BadRequestException);
      expect(messages.addReaction).not.toHaveBeenCalled();
    });

    it('should reject an emoji longer than 32 characters', async () => {
      await expect(service.add('m1', 'u1', 'a'.repeat(33))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject when the message does not exist', async () => {
      messages.findMeta.mockResolvedValue(null);
      await expect(service.add('m1', 'u1', '👍')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject when the message has been deleted', async () => {
      messages.findMeta.mockResolvedValue({ ...meta, deletedAt: new Date() });
      await expect(service.add('m1', 'u1', '👍')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject when the full message cannot be loaded for broadcast', async () => {
      messages.findById.mockResolvedValue(null);
      await expect(service.add('m1', 'u1', '👍')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should gate on membership, remove the reaction, and broadcast', async () => {
      await service.remove('m1', 'u1', '👍');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');
      expect(messages.removeReaction).toHaveBeenCalledWith('m1', 'u1', '👍');
      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.REACTION_UPDATED,
        expect.objectContaining({ conversationId: 'c1', messageId: 'm1' }),
      );
    });

    it('should reject when the message does not exist', async () => {
      messages.findMeta.mockResolvedValue(null);
      await expect(service.remove('m1', 'u1', '👍')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
