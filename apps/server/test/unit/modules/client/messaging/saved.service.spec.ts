import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SavedService } from '@/modules/client/messaging/saved.service';
import { type SavedRepository } from '@/modules/client/messaging/saved.repository';
import { type MessagesRepository } from '@/modules/client/messaging/messages.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';

describe('SavedService', () => {
  let saved: {
    save: ReturnType<typeof vi.fn>;
    unsave: ReturnType<typeof vi.fn>;
    listSaved: ReturnType<typeof vi.fn>;
  };
  let messages: { findMeta: ReturnType<typeof vi.fn> };
  let permissions: { assertConversationMember: ReturnType<typeof vi.fn> };
  let serializer: { message: ReturnType<typeof vi.fn> };
  let service: SavedService;

  const meta = {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u2',
    deletedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    saved = { save: vi.fn(), unsave: vi.fn(), listSaved: vi.fn() };
    messages = { findMeta: vi.fn().mockResolvedValue(meta) };
    permissions = { assertConversationMember: vi.fn() };
    serializer = { message: vi.fn() };
    service = new SavedService(
      saved as unknown as SavedRepository,
      messages as unknown as MessagesRepository,
      permissions as unknown as ChatPermissionsService,
      serializer as unknown as MessagingSerializer,
    );
  });

  describe('save()', () => {
    it('should gate on membership and persist a saved row', async () => {
      const result = await service.save('m1', 'u1');

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');
      expect(saved.save).toHaveBeenCalledWith('u1', 'm1');
      expect(result).toEqual({ saved: true });
    });

    it('should reject when the message does not exist', async () => {
      messages.findMeta.mockResolvedValue(null);
      await expect(service.save('mX', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unsave()', () => {
    it('should remove the saved row', async () => {
      const result = await service.unsave('m1', 'u1');
      expect(saved.unsave).toHaveBeenCalledWith('u1', 'm1');
      expect(result).toEqual({ saved: false });
    });
  });

  describe('list()', () => {
    it('should serialize saved messages (saved=true) with their conversation title', async () => {
      saved.listSaved.mockResolvedValue([
        {
          message: { id: 'm1', conversationId: 'c1', conversation: { id: 'c1', title: 'Department A' } },
        },
      ]);
      serializer.message.mockReturnValue({ id: 'm1', saved: true });

      const result = await service.list('u1');

      expect(result).toEqual({
        items: [
          { message: { id: 'm1', saved: true }, conversationId: 'c1', conversationTitle: 'Department A' },
        ],
      });
    });
  });
});
