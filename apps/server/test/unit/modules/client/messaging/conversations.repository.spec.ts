import { ConversationType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { ConversationsRepository } from '@/modules/client/messaging/conversations.repository';
import {
  chatMessageInclude,
  conversationInclude,
  conversationListInclude,
} from '@/modules/client/messaging/messaging.includes';

describe('ConversationsRepository', () => {
  let repo: ConversationsRepository;
  let conversation: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let conversationMember: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  let chatMessage: {
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    conversation = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'c1' }),
      update: vi.fn().mockResolvedValue({ id: 'c1' }),
    };
    conversationMember = {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    chatMessage = {
      count: vi.fn().mockResolvedValue(3),
      findFirst: vi.fn().mockResolvedValue(null),
    };
    repo = new ConversationsRepository({
      conversation,
      conversationMember,
      chatMessage,
    } as unknown as PrismaService);
  });

  describe('listForUser()', () => {
    it('should query active memberships for direct and group conversations ordered by recency', async () => {
      await repo.listForUser('u1');
      expect(conversation.findMany).toHaveBeenCalledWith({
        where: {
          members: { some: { userId: 'u1', removedAt: null } },
          type: { in: [ConversationType.DIRECT, ConversationType.GROUP] },
        },
        include: conversationListInclude,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('findById()', () => {
    it('should query a conversation by id with members include', async () => {
      await repo.findById('c1');
      expect(conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        include: conversationInclude,
      });
    });
  });

  describe('findDirectByKey()', () => {
    it('should query a conversation by directKey with members include', async () => {
      await repo.findDirectByKey('a:b');
      expect(conversation.findUnique).toHaveBeenCalledWith({
        where: { directKey: 'a:b' },
        include: conversationInclude,
      });
    });
  });

  describe('createDirect()', () => {
    it('should create a direct conversation with both members', async () => {
      await repo.createDirect('a', 'b', 'a:b');
      expect(conversation.create).toHaveBeenCalledWith({
        data: {
          type: ConversationType.DIRECT,
          directKey: 'a:b',
          members: { create: [{ userId: 'a' }, { userId: 'b' }] },
        },
        include: conversationInclude,
      });
    });
  });

  describe('memberUserIds()', () => {
    it('should select userIds for the conversation and map to a string array', async () => {
      conversationMember.findMany.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]);
      const ids = await repo.memberUserIds('c1');
      expect(conversationMember.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        select: { userId: true },
      });
      expect(ids).toEqual(['a', 'b']);
    });
  });

  describe('membersWithMuteState()', () => {
    it('should select active members with mute state', async () => {
      const rows = [{ userId: 'a', muted: true }];
      conversationMember.findMany.mockResolvedValue(rows);
      const result = await repo.membersWithMuteState('c1');
      expect(conversationMember.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1', removedAt: null },
        select: { userId: true, muted: true },
      });
      expect(result).toBe(rows);
    });
  });

  describe('conversationIdsForUser()', () => {
    it('should select conversationIds for the user and map them', async () => {
      conversationMember.findMany.mockResolvedValue([
        { conversationId: 'c1' },
        { conversationId: 'c2' },
      ]);
      const ids = await repo.conversationIdsForUser('u1');
      expect(conversationMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        select: { conversationId: true },
      });
      expect(ids).toEqual(['c1', 'c2']);
    });
  });

  describe('membershipsForUser()', () => {
    it('should select read-state fields for active memberships', async () => {
      await repo.membershipsForUser('u1');
      expect(conversationMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', removedAt: null },
        select: {
          conversationId: true,
          lastReadAt: true,
          clearedAt: true,
          manualUnread: true,
        },
      });
    });
  });

  describe('touch()', () => {
    it('should update lastMessageAt', async () => {
      const at = new Date('2026-01-01T00:00:00Z');
      await repo.touch('c1', at);
      expect(conversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { lastMessageAt: at },
      });
    });
  });

  describe('markRead()', () => {
    it('should set lastReadAt and clear manualUnread', async () => {
      const at = new Date('2026-01-01T00:00:00Z');
      await repo.markRead('c1', 'u1', at);
      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
        data: { lastReadAt: at, manualUnread: false },
      });
    });
  });

  describe('clearForViewer()', () => {
    it('should set clearedAt, lastReadAt and reset manualUnread', async () => {
      const at = new Date('2026-01-01T00:00:00Z');
      await repo.clearForViewer('c1', 'u1', at);
      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
        data: { clearedAt: at, lastReadAt: at, manualUnread: false },
      });
    });
  });

  describe('removeForViewer()', () => {
    it('should mark the membership removed and reset visibility flags', async () => {
      const at = new Date('2026-01-01T00:00:00Z');
      await repo.removeForViewer('c1', 'u1', at);
      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
        data: {
          removedAt: at,
          clearedAt: at,
          lastReadAt: at,
          hidden: false,
          manualUnread: false,
        },
      });
    });
  });

  describe('restoreForViewer()', () => {
    it('should forward the supplied restore data', async () => {
      await repo.restoreForViewer('c1', 'u1', { hidden: false, removedAt: null });
      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
        data: { hidden: false, removedAt: null },
      });
    });
  });

  describe('activityVisibilityChanges()', () => {
    it('should revive removed members, unhide the sender, and report changes', async () => {
      conversationMember.findMany.mockResolvedValue([
        { userId: 'u1', hidden: true, removedAt: null },
        { userId: 'u2', hidden: false, removedAt: new Date('2026-01-01T00:00:00Z') },
      ]);

      const result = await repo.activityVisibilityChanges('c1', 'u1');

      expect(conversationMember.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        select: { userId: true, hidden: true, removedAt: true },
      });
      expect(conversationMember.updateMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1', removedAt: { not: null } },
        data: { removedAt: null },
      });
      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
        data: { hidden: false, removedAt: null },
      });
      expect(result).toEqual({ revivedUserIds: ['u2'], senderNeedsUpdate: true });
    });

    it('should not run updates when nobody is removed and the sender is visible', async () => {
      conversationMember.findMany.mockResolvedValue([
        { userId: 'u1', hidden: false, removedAt: null },
      ]);

      const result = await repo.activityVisibilityChanges('c1', 'u1');

      expect(conversationMember.updateMany).not.toHaveBeenCalled();
      expect(conversationMember.update).not.toHaveBeenCalled();
      expect(result).toEqual({ revivedUserIds: [], senderNeedsUpdate: false });
    });

    it('should report senderNeedsUpdate false when the hidden sender is also among revived members', async () => {
      conversationMember.findMany.mockResolvedValue([
        { userId: 'u1', hidden: true, removedAt: new Date('2026-01-01T00:00:00Z') },
      ]);

      const result = await repo.activityVisibilityChanges('c1', 'u1');

      expect(result).toEqual({ revivedUserIds: ['u1'], senderNeedsUpdate: false });
    });
  });

  describe('updateMemberFlags()', () => {
    it('should forward the flag data to the membership update', async () => {
      await repo.updateMemberFlags('c1', 'u1', { muted: true, pinned: false });
      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
        data: { muted: true, pinned: false },
      });
    });
  });

  describe('unreadCount()', () => {
    it('should count non-self, non-deleted messages after the cursor when provided', async () => {
      const after = new Date('2026-01-01T00:00:00Z');
      const count = await repo.unreadCount('c1', 'u1', after);
      expect(chatMessage.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'c1',
          deletedAt: null,
          senderId: { not: 'u1' },
          createdAt: { gt: after },
        },
      });
      expect(count).toBe(3);
    });

    it('should omit the createdAt filter when no cursor is given', async () => {
      await repo.unreadCount('c1', 'u1', null);
      expect(chatMessage.count).toHaveBeenCalledWith({
        where: { conversationId: 'c1', deletedAt: null, senderId: { not: 'u1' } },
      });
    });
  });

  describe('lastVisibleMessage()', () => {
    it('should find the newest message after clearedAt with relations', async () => {
      const clearedAt = new Date('2026-01-01T00:00:00Z');
      await repo.lastVisibleMessage('c1', clearedAt);
      expect(chatMessage.findFirst).toHaveBeenCalledWith({
        where: { conversationId: 'c1', createdAt: { gt: clearedAt } },
        orderBy: { createdAt: 'desc' },
        include: chatMessageInclude,
      });
    });

    it('should omit the createdAt filter when clearedAt is null', async () => {
      await repo.lastVisibleMessage('c1', null);
      expect(chatMessage.findFirst).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        orderBy: { createdAt: 'desc' },
        include: chatMessageInclude,
      });
    });
  });
});
