import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { PinsService } from '@/modules/client/messaging/pins.service';
import { type PinsRepository } from '@/modules/client/messaging/pins.repository';
import { type MessagesRepository } from '@/modules/client/messaging/messages.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type ChatBus, conversationRoom } from '@/modules/client/messaging/chat-bus.service';

describe('PinsService', () => {
  let pins: { pin: ReturnType<typeof vi.fn>; unpin: ReturnType<typeof vi.fn>; listPinned: ReturnType<typeof vi.fn> };
  let messages: { findMeta: ReturnType<typeof vi.fn> };
  let permissions: { assertConversationMember: ReturnType<typeof vi.fn> };
  let serializer: { message: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let service: PinsService;

  const meta = { id: 'm1', conversationId: 'c1', senderId: 'u2', deletedAt: null, createdAt: new Date() };

  beforeEach(() => {
    pins = { pin: vi.fn(), unpin: vi.fn(), listPinned: vi.fn() };
    messages = { findMeta: vi.fn().mockResolvedValue(meta) };
    permissions = { assertConversationMember: vi.fn() };
    serializer = { message: vi.fn() };
    bus = { emit: vi.fn() };
    service = new PinsService(
      pins as unknown as PinsRepository,
      messages as unknown as MessagesRepository,
      permissions as unknown as ChatPermissionsService,
      serializer as unknown as MessagingSerializer,
      bus as unknown as ChatBus,
    );
  });

  describe('pin()', () => {
    it('should gate on membership, persist the pin, and broadcast pinned:true', async () => {
      await service.pin('m1', 'u1');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');
      expect(pins.pin).toHaveBeenCalledWith('c1', 'm1', 'u1');
      expect(bus.emit).toHaveBeenCalledWith(conversationRoom('c1'), ChatServerEvent.PIN_UPDATE, {
        conversationId: 'c1',
        messageId: 'm1',
        pinned: true,
      });
    });

    it('should reject when the message does not exist', async () => {
      messages.findMeta.mockResolvedValue(null);
      await expect(service.pin('mX', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unpin()', () => {
    it('should remove the pin and broadcast pinned:false', async () => {
      await service.unpin('m1', 'u1');

      expect(pins.unpin).toHaveBeenCalledWith('c1', 'm1');
      expect(bus.emit).toHaveBeenCalledWith(conversationRoom('c1'), ChatServerEvent.PIN_UPDATE, {
        conversationId: 'c1',
        messageId: 'm1',
        pinned: false,
      });
    });
  });

  describe('list()', () => {
    it('should gate on membership and serialize pinned messages with pinned=true', async () => {
      const row = { id: 'm1', conversationId: 'c1' };
      pins.listPinned.mockResolvedValue([row]);
      serializer.message.mockReturnValue({ id: 'm1', pinned: true });

      const result = await service.list('c1', 'u1');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');
      expect(serializer.message).toHaveBeenCalledWith(row, 'u1', {
        pinnedMessageIds: expect.any(Set),
      });
      expect(result).toEqual({ items: [{ id: 'm1', pinned: true }] });
    });
  });
});
