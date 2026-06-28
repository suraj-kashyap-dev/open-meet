import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { MessagesService } from '@/modules/client/messaging/services/messages.service';
import { type MessagesRepository } from '@/modules/client/messaging/repositories/messages.repository';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type ConversationsService } from '@/modules/client/messaging/services/conversations.service';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';
import { type UploadsService } from '@/modules/uploads/services/uploads.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import {
  type ChatBus,
  conversationRoom,
} from '@/modules/client/messaging/services/chat-bus.service';

const MAX_LENGTH = 8000;

describe('MessagesService', () => {
  let messages: {
    listHistory: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findMeta: ReturnType<typeof vi.fn>;
    bumpReplyCount: ReturnType<typeof vi.fn>;
    updateContent: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let conversationRepo: {
    touch: ReturnType<typeof vi.fn>;
    memberUserIds: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
  };
  let conversationsService: { revealOnActivity: ReturnType<typeof vi.fn> };
  let permissions: {
    assertConversationMember: ReturnType<typeof vi.fn>;
    assertDirectConversationAllowed: ReturnType<typeof vi.fn>;
    assertCanPost: ReturnType<typeof vi.fn>;
  };
  let uploads: { claimForChat: ReturnType<typeof vi.fn> };
  let serializer: { message: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let pins: { pinnedIdsForUser: ReturnType<typeof vi.fn> };
  let saved: { savedIdsForViewer: ReturnType<typeof vi.fn> };
  let pushQueue: { add: ReturnType<typeof vi.fn> };
  let service: MessagesService;

  const createdRow = { id: 'm9', conversationId: 'c1', createdAt: new Date('2026-01-01') };

  beforeEach(() => {
    messages = {
      listHistory: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(createdRow),
      findById: vi.fn().mockResolvedValue(createdRow),
      findMeta: vi.fn(),
      bumpReplyCount: vi.fn(),
      updateContent: vi.fn(),
      softDelete: vi.fn(),
    };

    conversationRepo = {
      touch: vi.fn(),
      memberUserIds: vi.fn().mockResolvedValue(['u1', 'u2']),
      markRead: vi.fn(),
    };

    conversationsService = { revealOnActivity: vi.fn() };

    permissions = {
      assertConversationMember: vi.fn().mockResolvedValue({ clearedAt: null }),
      assertDirectConversationAllowed: vi.fn(),
      assertCanPost: vi.fn(),
    };

    uploads = { claimForChat: vi.fn() };

    serializer = { message: vi.fn((m) => ({ id: m.id, sender: { name: 'Alice' } })) };

    bus = { emit: vi.fn() };

    pins = { pinnedIdsForUser: vi.fn().mockResolvedValue([]) };

    saved = { savedIdsForViewer: vi.fn().mockResolvedValue([]) };

    pushQueue = { add: vi.fn() };

    const config = { getOrThrow: () => MAX_LENGTH };

    service = new MessagesService(
      messages as unknown as MessagesRepository,
      conversationRepo as unknown as ConversationsRepository,
      conversationsService as unknown as ConversationsService,
      permissions as unknown as ChatPermissionsService,
      uploads as unknown as UploadsService,
      serializer as unknown as MessagingSerializer,
      bus as unknown as ChatBus,
      pins as never,
      saved as never,
      config as never,
      pushQueue as never,
    );
  });

  describe('send()', () => {
    it('should reject an empty message with no attachments', async () => {
      await expect(
        service.send({ conversationId: 'c1', senderId: 'u1', content: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(messages.create).not.toHaveBeenCalled();
    });

    it('should reject content over the configured maximum length', async () => {
      await expect(
        service.send({ conversationId: 'c1', senderId: 'u1', content: 'x'.repeat(MAX_LENGTH + 1) }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(messages.create).not.toHaveBeenCalled();
    });

    it('should check post and direct-conversation permissions', async () => {
      await service.send({ conversationId: 'c1', senderId: 'u1', content: 'hi' });

      expect(permissions.assertCanPost).toHaveBeenCalledWith('c1', 'u1');

      expect(permissions.assertDirectConversationAllowed).toHaveBeenCalledWith('c1', 'u1');
    });

    it('should persist a trimmed message, touch the conversation, and broadcast', async () => {
      const dto = await service.send({ conversationId: 'c1', senderId: 'u1', content: '  hi  ' });

      expect(messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'c1',
          senderId: 'u1',
          content: 'hi',
          parentId: null,
        }),
      );

      expect(conversationRepo.touch).toHaveBeenCalledWith('c1', createdRow.createdAt);

      expect(conversationsService.revealOnActivity).toHaveBeenCalledWith('c1', 'u1');

      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.MESSAGE_NEW,
        expect.objectContaining({ id: 'm9', clientNonce: null }),
      );

      expect(dto).toMatchObject({ id: 'm9' });
    });

    it('should mark self-chat messages as read immediately', async () => {
      conversationRepo.memberUserIds.mockResolvedValue(['u1']);

      await service.send({ conversationId: 'c1', senderId: 'u1', content: 'note to self' });

      expect(conversationRepo.markRead).toHaveBeenCalledWith('c1', 'u1', createdRow.createdAt);
    });

    it('should not auto-read messages in multi-member conversations', async () => {
      await service.send({ conversationId: 'c1', senderId: 'u1', content: 'hi' });

      expect(conversationRepo.markRead).not.toHaveBeenCalled();
    });

    it('should pass the clientNonce through to the broadcast payload', async () => {
      await service.send({
        conversationId: 'c1',
        senderId: 'u1',
        content: 'hi',
        clientNonce: 'nonce-1',
      });

      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.MESSAGE_NEW,
        expect.objectContaining({ clientNonce: 'nonce-1' }),
      );
    });

    it('should parse mentions out of the content', async () => {
      await service.send({
        conversationId: 'c1',
        senderId: 'u1',
        content: 'hey [@Bob](u2) and @everyone',
      });

      expect(messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mentions: [
            { kind: 'USER', mentionedUserId: 'u2' },
            { kind: 'EVERYONE', mentionedUserId: null },
          ],
        }),
      );
    });

    it('should claim attachments for an attachment-only message', async () => {
      await service.send({
        conversationId: 'c1',
        senderId: 'u1',
        content: '',
        attachmentIds: ['a1', 'a2'],
      });

      expect(uploads.claimForChat).toHaveBeenCalledWith(['a1', 'a2'], 'u1', 'm9');
    });

    it('should validate the parent belongs to the same conversation', async () => {
      messages.findMeta.mockResolvedValue({ id: 'p1', conversationId: 'other' });

      await expect(
        service.send({ conversationId: 'c1', senderId: 'u1', content: 'hi', parentId: 'p1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should bump the parent reply count when replying', async () => {
      messages.findMeta.mockResolvedValue({ id: 'p1', conversationId: 'c1' });

      await service.send({ conversationId: 'c1', senderId: 'u1', content: 'hi', parentId: 'p1' });

      expect(messages.bumpReplyCount).toHaveBeenCalledWith('p1', createdRow.createdAt);
    });

    it('should enqueue a push job after broadcasting', async () => {
      await service.send({ conversationId: 'c1', senderId: 'u1', content: 'hi' });

      expect(pushQueue.add).toHaveBeenCalledWith(
        'chat-message',
        expect.objectContaining({ conversationId: 'c1', senderId: 'u1', senderName: 'Alice' }),
        expect.objectContaining({ removeOnComplete: true }),
      );
    });
  });

  describe('edit()', () => {
    beforeEach(() => {
      messages.findMeta.mockResolvedValue({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        deletedAt: null,
      });

      messages.updateContent.mockResolvedValue({ id: 'm1', conversationId: 'c1' });
    });

    it('should reject editing to an empty message', async () => {
      await expect(service.edit('m1', 'u1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject content over the maximum length', async () => {
      await expect(service.edit('m1', 'u1', 'x'.repeat(MAX_LENGTH + 1))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject when the message does not exist', async () => {
      messages.findMeta.mockResolvedValue(null);

      await expect(service.edit('m1', 'u1', 'hi')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject when the message is already deleted', async () => {
      messages.findMeta.mockResolvedValue({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        deletedAt: new Date(),
      });

      await expect(service.edit('m1', 'u1', 'hi')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject editing someone else’s message', async () => {
      messages.findMeta.mockResolvedValue({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'other',
        deletedAt: null,
      });

      await expect(service.edit('m1', 'u1', 'hi')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should update content and broadcast the edited event', async () => {
      await service.edit('m1', 'u1', '  updated  ');

      expect(messages.updateContent).toHaveBeenCalledWith('m1', 'updated', expect.any(Array));

      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.MESSAGE_EDITED,
        expect.objectContaining({ id: 'm1' }),
      );
    });
  });

  describe('remove()', () => {
    beforeEach(() => {
      messages.findMeta.mockResolvedValue({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        deletedAt: null,
      });

      messages.softDelete.mockResolvedValue({ id: 'm1', conversationId: 'c1' });
    });

    it('should reject deleting someone else’s message', async () => {
      messages.findMeta.mockResolvedValue({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'other',
        deletedAt: null,
      });

      await expect(service.remove('m1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should soft delete and broadcast the deleted event with ids only', async () => {
      await service.remove('m1', 'u1');

      expect(messages.softDelete).toHaveBeenCalledWith('m1');

      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.MESSAGE_DELETED,
        {
          conversationId: 'c1',
          messageId: 'm1',
        },
      );
    });
  });

  describe('history()', () => {
    it('should assert membership and direct-conversation access', async () => {
      await service.history('c1', 'u1', {});

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

      expect(permissions.assertDirectConversationAllowed).toHaveBeenCalledWith('c1', 'u1');
    });

    it('should clamp the limit and request one extra row', async () => {
      await service.history('c1', 'u1', { limit: 999 });

      expect(messages.listHistory).toHaveBeenCalledWith(expect.objectContaining({ limit: 101 }));
    });

    it('should floor history at the later of clearedAt and historyVisibleFrom', async () => {
      const cleared = new Date('2026-01-01T00:00:00.000Z');
      const visibleFrom = new Date('2026-03-01T00:00:00.000Z');

      permissions.assertConversationMember.mockResolvedValue({
        clearedAt: cleared,
        historyVisibleFrom: visibleFrom,
      });

      await service.history('c1', 'u1', {});

      expect(messages.listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ clearedAt: visibleFrom }),
      );
    });

    it('should leave history unbounded when both cutoffs are absent', async () => {
      permissions.assertConversationMember.mockResolvedValue({
        clearedAt: null,
        historyVisibleFrom: null,
      });

      await service.history('c1', 'u1', {});

      expect(messages.listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ clearedAt: null }),
      );
    });

    it('should return all rows with a null cursor when there is no next page', async () => {
      messages.listHistory.mockResolvedValue([
        { id: 'a', createdAt: new Date('2026-01-01') },
        { id: 'b', createdAt: new Date('2026-01-02') },
      ]);
      const page = await service.history('c1', 'u1', { limit: 50 });

      expect(page.nextCursor).toBeNull();

      expect(page.items).toHaveLength(2);
    });

    it('should trim the extra row and emit a nextCursor when there are more', async () => {
      const rows = Array.from({ length: 3 }, (_, i) => ({
        id: `m${i}`,
        createdAt: new Date(2026, 0, i + 1),
      }));

      messages.listHistory.mockResolvedValue(rows);
      const page = await service.history('c1', 'u1', { limit: 2 });

      expect(page.items).toHaveLength(2);

      expect(page.nextCursor).toBe(rows[1].createdAt.toISOString());
    });

    it('should attach pinned and saved flags to serialized items', async () => {
      messages.listHistory.mockResolvedValue([{ id: 'a', createdAt: new Date('2026-01-01') }]);

      await service.history('c1', 'u1', {});

      expect(pins.pinnedIdsForUser).toHaveBeenCalledWith('c1', 'u1');

      expect(saved.savedIdsForViewer).toHaveBeenCalledWith('u1', ['a']);

      expect(serializer.message).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a' }),
        'u1',
        expect.objectContaining({
          pinnedMessageIds: expect.any(Set),
          savedMessageIds: expect.any(Set),
        }),
      );
    });
  });
});
