import { ChatMessagePriority, ChatMessageType, MentionKind } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { chatMessageInclude } from '@/modules/client/messaging/messaging.includes';
import { MessagesRepository } from '@/modules/client/messaging/repositories/messages.repository';

describe('MessagesRepository', () => {
  let repo: MessagesRepository;
  let chatMessage: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let messageReaction: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    chatMessage = {
      create: vi.fn().mockResolvedValue({ id: 'm1' }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'm1' }),
    };

    messageReaction = {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    };

    repo = new MessagesRepository({
      chatMessage,
      messageReaction,
    } as unknown as PrismaService);
  });

  describe('create()', () => {
    it('should apply defaults for optional fields when not supplied', async () => {
      await repo.create({ conversationId: 'c1', senderId: 'u1', content: 'hi' });

      expect(chatMessage.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'c1',
          senderId: 'u1',
          content: 'hi',
          type: ChatMessageType.TEXT,
          priority: ChatMessagePriority.NORMAL,
          parentId: null,
        },
        include: chatMessageInclude,
      });
    });

    it('should pass through provided overrides and nested mention creates', async () => {
      await repo.create({
        conversationId: 'c1',
        senderId: 'u1',
        content: 'hey @bob',
        type: ChatMessageType.SYSTEM,
        parentId: 'p1',
        priority: ChatMessagePriority.URGENT,
        mentions: [{ kind: MentionKind.USER, mentionedUserId: 'bob' }],
      });

      expect(chatMessage.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'c1',
          senderId: 'u1',
          content: 'hey @bob',
          type: ChatMessageType.SYSTEM,
          priority: ChatMessagePriority.URGENT,
          parentId: 'p1',
          mentions: {
            create: [{ kind: MentionKind.USER, mentionedUserId: 'bob' }],
          },
        },
        include: chatMessageInclude,
      });
    });

    it('should omit the mentions key when the mentions array is empty', async () => {
      await repo.create({ conversationId: 'c1', senderId: 'u1', content: 'hi', mentions: [] });
      const arg = chatMessage.create.mock.calls[0][0];

      expect(arg.data).not.toHaveProperty('mentions');
    });
  });

  describe('findById()', () => {
    it('should query a message by id with relations', async () => {
      await repo.findById('m1');

      expect(chatMessage.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        include: chatMessageInclude,
      });
    });
  });

  describe('findMeta()', () => {
    it('should select only meta fields', async () => {
      await repo.findMeta('m1');

      expect(chatMessage.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          deletedAt: true,
          createdAt: true,
        },
      });
    });
  });

  describe('listReplies()', () => {
    it('should list replies ordered ascending with relations', async () => {
      await repo.listReplies('p1');

      expect(chatMessage.findMany).toHaveBeenCalledWith({
        where: { parentId: 'p1' },
        orderBy: { createdAt: 'asc' },
        include: chatMessageInclude,
      });
    });
  });

  describe('bumpReplyCount()', () => {
    it('should increment replyCount and set lastReplyAt', async () => {
      const at = new Date('2026-01-01T00:00:00Z');

      await repo.bumpReplyCount('p1', at);

      expect(chatMessage.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { replyCount: { increment: 1 }, lastReplyAt: at },
      });
    });
  });

  describe('listHistory()', () => {
    it('should reverse the descending page so callers get ascending order', async () => {
      chatMessage.findMany.mockResolvedValue([{ id: 'm3' }, { id: 'm2' }, { id: 'm1' }]);
      const rows = await repo.listHistory({ conversationId: 'c1', clearedAt: null, limit: 30 });

      expect(rows).toEqual([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]);
    });

    it('should omit the createdAt filter when neither clearedAt nor cursor are set', async () => {
      await repo.listHistory({ conversationId: 'c1', clearedAt: null, limit: 30 });

      expect(chatMessage.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: chatMessageInclude,
      });
    });

    it('should combine clearedAt lower-bound and cursor upper-bound into createdAt', async () => {
      const clearedAt = new Date('2026-01-01T00:00:00Z');
      const cursor = '2026-02-01T00:00:00.000Z';

      await repo.listHistory({ conversationId: 'c1', clearedAt, cursor, limit: 10 });

      expect(chatMessage.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'c1',
          createdAt: { gt: clearedAt, lt: new Date(cursor) },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: chatMessageInclude,
      });
    });
  });

  describe('updateContent()', () => {
    it('should set content, mark edited, and replace mentions', async () => {
      await repo.updateContent('m1', 'edited', [
        { kind: MentionKind.USER, mentionedUserId: 'bob' },
      ]);
      const arg = chatMessage.update.mock.calls[0][0];

      expect(arg.where).toEqual({ id: 'm1' });

      expect(arg.include).toBe(chatMessageInclude);

      expect(arg.data.content).toBe('edited');

      expect(arg.data.editedAt).toBeInstanceOf(Date);

      expect(arg.data.mentions).toEqual({
        deleteMany: {},
        create: [{ kind: MentionKind.USER, mentionedUserId: 'bob' }],
      });
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt and blank the content', async () => {
      await repo.softDelete('m1');
      const arg = chatMessage.update.mock.calls[0][0];

      expect(arg.where).toEqual({ id: 'm1' });

      expect(arg.include).toBe(chatMessageInclude);

      expect(arg.data.content).toBe('');

      expect(arg.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('addReaction()', () => {
    it('should upsert a reaction keyed by message, user and emoji', async () => {
      await repo.addReaction('m1', 'u1', '👍');

      expect(messageReaction.upsert).toHaveBeenCalledWith({
        where: { messageId_userId_emoji: { messageId: 'm1', userId: 'u1', emoji: '👍' } },
        create: { messageId: 'm1', userId: 'u1', emoji: '👍' },
        update: {},
      });
    });
  });

  describe('removeReaction()', () => {
    it('should delete the matching reaction', async () => {
      await repo.removeReaction('m1', 'u1', '👍');

      expect(messageReaction.deleteMany).toHaveBeenCalledWith({
        where: { messageId: 'm1', userId: 'u1', emoji: '👍' },
      });
    });
  });
});
