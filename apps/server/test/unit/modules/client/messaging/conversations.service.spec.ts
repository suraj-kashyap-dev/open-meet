import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { ConversationsService } from '@/modules/client/messaging/services/conversations.service';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';
import { type PresenceService } from '@/modules/client/messaging/services/presence.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type ChatBus, userRoom } from '@/modules/client/messaging/services/chat-bus.service';

function member(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    userId,
    hidden: false,
    removedAt: null,
    clearedAt: null,
    lastReadAt: null,
    manualUnread: false,
    ...overrides,
  };
}

describe('ConversationsService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let permissions: Record<string, ReturnType<typeof vi.fn>>;
  let presence: { snapshot: ReturnType<typeof vi.fn> };
  let serializer: { conversation: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let service: ConversationsService;

  beforeEach(() => {
    repo = {
      membersWithMuteState: vi.fn(),
      listForUser: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findDirectByKey: vi.fn(),
      createDirect: vi.fn(),
      restoreForViewer: vi.fn(),
      clearForViewer: vi.fn(),
      removeForViewer: vi.fn(),
      activityVisibilityChanges: vi.fn(),
      lastVisibleMessage: vi.fn().mockResolvedValue(null),
      unreadCount: vi.fn().mockResolvedValue(0),
    };

    permissions = {
      assertConversationMember: vi.fn(),
      assertDirectConversationAllowed: vi.fn(),
      assertCanDirectMessage: vi.fn(),
    };

    presence = { snapshot: vi.fn().mockResolvedValue(new Map()) };

    serializer = {
      conversation: vi.fn((conv, opts) => ({
        id: conv.id,
        pinned: false,
        createdAt: conv.createdAt ?? new Date(0).toISOString(),
        lastMessageAt: opts.lastMessageAt,
        unreadCount: opts.unreadCount,
      })),
    };

    bus = { emit: vi.fn() };

    service = new ConversationsService(
      repo as unknown as ConversationsRepository,
      permissions as unknown as ChatPermissionsService,
      presence as unknown as PresenceService,
      serializer as unknown as MessagingSerializer,
      bus as unknown as ChatBus,
    );
  });

  describe('membersWithMuteState()', () => {
    it('should delegate to the repository', async () => {
      repo.membersWithMuteState.mockResolvedValue([{ userId: 'u1', muted: true }]);

      await expect(service.membersWithMuteState('c1')).resolves.toEqual([
        { userId: 'u1', muted: true },
      ]);

      expect(repo.membersWithMuteState).toHaveBeenCalledWith('c1');
    });
  });

  describe('list()', () => {
    it('should hide conversations the viewer has hidden by default', async () => {
      repo.listForUser.mockResolvedValue([
        { id: 'c1', createdAt: '2026-01-01', members: [member('u1', { hidden: true })] },
        { id: 'c2', createdAt: '2026-01-01', members: [member('u1')] },
      ]);

      const result = await service.list('u1');

      expect(result.items.map((i) => i.id)).toEqual(['c2']);
    });

    it('should include hidden conversations when includeHidden is set', async () => {
      repo.listForUser.mockResolvedValue([
        { id: 'c1', createdAt: '2026-01-01', members: [member('u1', { hidden: true })] },
      ]);

      const result = await service.list('u1', { includeHidden: true });

      expect(result.items.map((i) => i.id)).toEqual(['c1']);
    });

    it('should sort pinned conversations first then by recency', async () => {
      repo.listForUser.mockResolvedValue([
        { id: 'old', createdAt: '2026-01-01', members: [member('u1')] },
        { id: 'new', createdAt: '2026-01-01', members: [member('u1')] },
        { id: 'pin', createdAt: '2026-01-01', members: [member('u1')] },
      ]);

      serializer.conversation.mockImplementation((conv) => {
        const lastMessageAt =
          conv.id === 'new' ? '2026-03-01' : conv.id === 'old' ? '2026-01-15' : '2026-01-10';

        return {
          id: conv.id,
          pinned: conv.id === 'pin',
          createdAt: '2026-01-01',
          lastMessageAt,
        };
      });

      const result = await service.list('u1');

      expect(result.items.map((i) => i.id)).toEqual(['pin', 'new', 'old']);
    });

    it('should snapshot presence for the union of member ids', async () => {
      repo.listForUser.mockResolvedValue([
        { id: 'c1', createdAt: '2026-01-01', members: [member('u1'), member('u2')] },
      ]);

      await service.list('u1');

      expect(presence.snapshot).toHaveBeenCalledWith(['u1', 'u2']);
    });
  });

  describe('getById()', () => {
    it('should gate on membership and direct-conversation access then serialize', async () => {
      const conv = { id: 'c1', createdAt: '2026-01-01', members: [member('u1')] };

      repo.findById.mockResolvedValue(conv);

      const result = await service.getById('c1', 'u1');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

      expect(permissions.assertDirectConversationAllowed).toHaveBeenCalledWith('c1', 'u1');

      expect(result.id).toBe('c1');
    });

    it('should throw NotFound when the conversation is missing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById('c1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('openDirect()', () => {
    it('should return the existing conversation without restoring when visible', async () => {
      const existing = {
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1'), member('u2')],
      };

      repo.findDirectByKey.mockResolvedValue(existing);

      const result = await service.openDirect('u1', 'u2');

      expect(permissions.assertCanDirectMessage).toHaveBeenCalledWith('u1', 'u2');

      expect(repo.restoreForViewer).not.toHaveBeenCalled();

      expect(bus.emit).not.toHaveBeenCalled();

      expect(result.id).toBe('c1');
    });

    it('should restore and emit CONVERSATION_NEW when the actor had removed it', async () => {
      const existing = {
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1', { removedAt: new Date() }), member('u2')],
      };
      const restored = {
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1'), member('u2')],
      };

      repo.findDirectByKey.mockResolvedValueOnce(existing).mockResolvedValueOnce(restored);

      await service.openDirect('u1', 'u2');

      expect(repo.restoreForViewer).toHaveBeenCalledWith('c1', 'u1', {
        hidden: false,
        removedAt: null,
      });

      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u1'),
        ChatServerEvent.CONVERSATION_NEW,
        expect.objectContaining({ id: 'c1' }),
      );
    });

    it('should restore and emit CONVERSATION_UPDATE when the actor had only hidden it', async () => {
      const existing = {
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1', { hidden: true }), member('u2')],
      };

      repo.findDirectByKey.mockResolvedValue(existing);

      await service.openDirect('u1', 'u2');

      expect(repo.restoreForViewer).toHaveBeenCalled();

      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u1'),
        ChatServerEvent.CONVERSATION_UPDATE,
        expect.objectContaining({ id: 'c1' }),
      );
    });

    it('should create a new direct conversation and notify the target', async () => {
      repo.findDirectByKey.mockResolvedValue(null);
      const created = {
        id: 'c9',
        createdAt: '2026-01-01',
        members: [member('u1'), member('u2')],
      };

      repo.createDirect.mockResolvedValue(created);

      const result = await service.openDirect('u1', 'u2');

      expect(repo.createDirect).toHaveBeenCalledWith('u1', 'u2', 'u1:u2');

      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u2'),
        ChatServerEvent.CONVERSATION_NEW,
        expect.objectContaining({ id: 'c9' }),
      );

      expect(result.id).toBe('c9');
    });

    it('should build the direct key from sorted user ids', async () => {
      repo.findDirectByKey.mockResolvedValue(null);

      repo.createDirect.mockResolvedValue({
        id: 'c9',
        createdAt: '2026-01-01',
        members: [member('z'), member('a')],
      });

      await service.openDirect('z', 'a');

      expect(repo.createDirect).toHaveBeenCalledWith('z', 'a', 'a:z');
    });

    it('should recover from a unique-violation race by returning the concurrently-created row', async () => {
      const { Prisma } = await import('@prisma/client');
      const conflict = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      });

      repo.findDirectByKey.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1'), member('u2')],
      });

      repo.createDirect.mockRejectedValue(conflict);

      const result = await service.openDirect('u1', 'u2');

      expect(result.id).toBe('c1');
    });

    it('should rethrow non-unique creation errors', async () => {
      repo.findDirectByKey.mockResolvedValue(null);

      repo.createDirect.mockRejectedValue(new Error('boom'));

      await expect(service.openDirect('u1', 'u2')).rejects.toThrow('boom');
    });
  });

  describe('clearForViewer()', () => {
    it('should clear, reload, and emit CONVERSATION_UPDATE to the viewer', async () => {
      repo.findById.mockResolvedValue({
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1')],
      });

      const result = await service.clearForViewer('c1', 'u1');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

      expect(repo.clearForViewer).toHaveBeenCalledWith('c1', 'u1', expect.any(Date));

      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u1'),
        ChatServerEvent.CONVERSATION_UPDATE,
        expect.objectContaining({ id: 'c1' }),
      );

      expect(result).toEqual({ ok: true });
    });

    it('should throw NotFound when the conversation disappears after clearing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.clearForViewer('c1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteForViewer()', () => {
    it('should remove for the viewer and emit CONVERSATION_REMOVED', async () => {
      const result = await service.deleteForViewer('c1', 'u1');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

      expect(repo.removeForViewer).toHaveBeenCalledWith('c1', 'u1', expect.any(Date));

      expect(bus.emit).toHaveBeenCalledWith(userRoom('u1'), ChatServerEvent.CONVERSATION_REMOVED, {
        conversationId: 'c1',
      });

      expect(result).toEqual({ ok: true });
    });
  });

  describe('revealOnActivity()', () => {
    it('should do nothing when there are no revived users and the sender needs no update', async () => {
      repo.activityVisibilityChanges.mockResolvedValue({
        revivedUserIds: [],
        senderNeedsUpdate: false,
      });

      await service.revealOnActivity('c1', 'u1');

      expect(repo.findById).not.toHaveBeenCalled();

      expect(bus.emit).not.toHaveBeenCalled();
    });

    it('should bail out when the conversation cannot be loaded', async () => {
      repo.activityVisibilityChanges.mockResolvedValue({
        revivedUserIds: ['u2'],
        senderNeedsUpdate: false,
      });

      repo.findById.mockResolvedValue(null);

      await service.revealOnActivity('c1', 'u1');

      expect(bus.emit).not.toHaveBeenCalled();
    });

    it('should emit CONVERSATION_NEW per revived user and CONVERSATION_UPDATE for the sender', async () => {
      repo.activityVisibilityChanges.mockResolvedValue({
        revivedUserIds: ['u2'],
        senderNeedsUpdate: true,
      });

      repo.findById.mockResolvedValue({
        id: 'c1',
        createdAt: '2026-01-01',
        members: [member('u1'), member('u2')],
      });

      await service.revealOnActivity('c1', 'u1');

      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u2'),
        ChatServerEvent.CONVERSATION_NEW,
        expect.objectContaining({ id: 'c1' }),
      );

      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u1'),
        ChatServerEvent.CONVERSATION_UPDATE,
        expect.objectContaining({ id: 'c1' }),
      );
    });
  });

  describe('unread counting', () => {
    it('should bump a manually-unread conversation to at least 1', async () => {
      repo.listForUser.mockResolvedValue([
        { id: 'c1', createdAt: '2026-01-01', members: [member('u1', { manualUnread: true })] },
      ]);

      repo.unreadCount.mockResolvedValue(0);

      const result = await service.list('u1');

      expect(result.items[0].unreadCount).toBe(1);
    });

    it('should pass through the real unread count when not manually unread', async () => {
      repo.listForUser.mockResolvedValue([
        { id: 'c1', createdAt: '2026-01-01', members: [member('u1')] },
      ]);

      repo.unreadCount.mockResolvedValue(5);

      const result = await service.list('u1');

      expect(result.items[0].unreadCount).toBe(5);
    });
  });
});
