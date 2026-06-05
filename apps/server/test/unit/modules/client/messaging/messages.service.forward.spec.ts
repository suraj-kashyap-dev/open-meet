import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { MessagesService } from '@/modules/client/messaging/messages.service';
import { type MessagesRepository } from '@/modules/client/messaging/messages.repository';
import { type ConversationsRepository } from '@/modules/client/messaging/conversations.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import { type UploadsService } from '@/modules/uploads/uploads.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type ChatBus, conversationRoom } from '@/modules/client/messaging/chat-bus.service';

describe('MessagesService.forward()', () => {
  let messages: { findById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let conversations: { touch: ReturnType<typeof vi.fn> };
  let conversationsService: { revealOnActivity: ReturnType<typeof vi.fn> };
  let permissions: {
    assertConversationMember: ReturnType<typeof vi.fn>;
    assertCanPost: ReturnType<typeof vi.fn>;
    assertDirectConversationAllowed: ReturnType<typeof vi.fn>;
  };
  let serializer: { message: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let service: MessagesService;

  const source = {
    id: 'm1',
    conversationId: 'c1',
    content: 'hello there',
    deletedAt: null,
    createdAt: new Date(),
  };
  const created = { id: 'm2', conversationId: 'c2', createdAt: new Date() };

  beforeEach(() => {
    messages = {
      findById: vi.fn(async (id: string) => (id === 'm1' ? source : created)),
      create: vi.fn().mockResolvedValue(created),
    };
    conversations = { touch: vi.fn() };
    conversationsService = { revealOnActivity: vi.fn() };
    permissions = {
      assertConversationMember: vi.fn(),
      assertCanPost: vi.fn(),
      assertDirectConversationAllowed: vi.fn(),
    };
    serializer = { message: vi.fn().mockReturnValue({ id: 'm2', content: 'hello there' }) };
    bus = { emit: vi.fn() };

    const config = { getOrThrow: () => 8000 };

    service = new MessagesService(
      messages as unknown as MessagesRepository,
      conversations as unknown as ConversationsRepository,
      conversationsService as never,
      permissions as unknown as ChatPermissionsService,
      {} as unknown as UploadsService,
      serializer as unknown as MessagingSerializer,
      bus as unknown as ChatBus,
      { pinnedIdsForConversation: vi.fn().mockResolvedValue([]) } as never,
      { savedIdsForViewer: vi.fn().mockResolvedValue([]) } as never,
      config as never,
      { add: vi.fn() } as never,
    );
  });

  it('should copy the source content into the target conversation and broadcast it', async () => {
    await service.forward('m1', 'u1', 'c2');

    expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');
    expect(permissions.assertCanPost).toHaveBeenCalledWith('c2', 'u1');
    expect(messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c2', senderId: 'u1', content: 'hello there' }),
    );
    expect(conversations.touch).toHaveBeenCalledWith('c2', created.createdAt);
    expect(bus.emit).toHaveBeenCalledWith(
      conversationRoom('c2'),
      ChatServerEvent.MESSAGE_NEW,
      expect.objectContaining({ id: 'm2' }),
    );
  });

  it('should reject forwarding a missing message', async () => {
    messages.findById.mockResolvedValue(null);
    await expect(service.forward('mX', 'u1', 'c2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject forwarding an empty (attachment-only) message', async () => {
    messages.findById.mockImplementation(async (id: string) =>
      id === 'm1' ? { ...source, content: '   ' } : created,
    );
    await expect(service.forward('m1', 'u1', 'c2')).rejects.toBeInstanceOf(BadRequestException);
  });
});
