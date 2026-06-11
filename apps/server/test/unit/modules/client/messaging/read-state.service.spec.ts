import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { ReadStateService } from '@/modules/client/messaging/services/read-state.service';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type MessagesRepository } from '@/modules/client/messaging/repositories/messages.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';
import {
  conversationRoom,
  type ChatBus,
} from '@/modules/client/messaging/services/chat-bus.service';

describe('ReadStateService.summary', () => {
  let repo: {
    membershipsForUser: ReturnType<typeof vi.fn>;
    unreadCount: ReturnType<typeof vi.fn>;
  };
  let service: ReadStateService;

  beforeEach(() => {
    repo = {
      membershipsForUser: vi.fn(),
      unreadCount: vi.fn(),
    };

    service = new ReadStateService(
      repo as unknown as ConversationsRepository,
      {} as unknown as MessagesRepository,
      {} as unknown as ChatPermissionsService,
      {} as unknown as ChatBus,
    );
  });

  it('should count a manually-unread conversation as at least 1 even with no new messages', async () => {
    repo.membershipsForUser.mockResolvedValue([
      { conversationId: 'c1', lastReadAt: null, clearedAt: null, manualUnread: true },
    ]);

    repo.unreadCount.mockResolvedValue(0);

    const summary = await service.summary('u1');

    expect(summary.byConversation).toEqual({ c1: 1 });

    expect(summary.total).toBe(1);
  });

  it('should use the real unread count when not manually unread', async () => {
    repo.membershipsForUser.mockResolvedValue([
      { conversationId: 'c1', lastReadAt: null, clearedAt: null, manualUnread: false },
      { conversationId: 'c2', lastReadAt: null, clearedAt: null, manualUnread: false },
    ]);

    repo.unreadCount.mockImplementation((id: string) => Promise.resolve(id === 'c1' ? 3 : 0));

    const summary = await service.summary('u1');

    expect(summary.byConversation).toEqual({ c1: 3 });

    expect(summary.total).toBe(3);
  });

  it('should keep the real count when manually unread but messages exist', async () => {
    repo.membershipsForUser.mockResolvedValue([
      { conversationId: 'c1', lastReadAt: null, clearedAt: null, manualUnread: true },
    ]);

    repo.unreadCount.mockResolvedValue(4);

    const summary = await service.summary('u1');

    expect(summary.byConversation).toEqual({ c1: 4 });
  });
});

describe('ReadStateService.markDelivered', () => {
  it('should gate on membership, advance lastDeliveredAt, and broadcast a delivery receipt', async () => {
    const conversations = {
      markDelivered: vi.fn().mockResolvedValue(undefined),
    };
    const permissions = { assertConversationMember: vi.fn().mockResolvedValue({}) };
    const bus = { emit: vi.fn() };

    const service = new ReadStateService(
      conversations as unknown as ConversationsRepository,
      {} as unknown as MessagesRepository,
      permissions as unknown as ChatPermissionsService,
      bus as unknown as ChatBus,
    );

    await service.markDelivered('c1', 'u1');

    expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

    expect(conversations.markDelivered).toHaveBeenCalledWith('c1', 'u1', expect.any(Date));

    const [room, event, payload] = bus.emit.mock.calls[0];

    expect(room).toBe(conversationRoom('c1'));

    expect(event).toBe(ChatServerEvent.DELIVERY_RECEIPT);

    expect(payload).toMatchObject({ conversationId: 'c1', userId: 'u1' });

    expect(typeof payload.lastDeliveredAt).toBe('string');
  });
});
