import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityService } from '@/modules/client/messaging/services/activity.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type PrismaService } from '@/database/services/prisma.service';

describe('ActivityService', () => {
  let prisma: { chatMessage: { findMany: ReturnType<typeof vi.fn> } };
  let serializer: { message: ReturnType<typeof vi.fn> };
  let service: ActivityService;

  beforeEach(() => {
    prisma = { chatMessage: { findMany: vi.fn() } };

    serializer = { message: vi.fn((row) => ({ id: row.id })) };

    service = new ActivityService(
      prisma as unknown as PrismaService,
      serializer as unknown as MessagingSerializer,
    );
  });

  describe('feed()', () => {
    it('should query the latest 50 messages that mention the user', async () => {
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await service.feed('u1');

      const arg = prisma.chatMessage.findMany.mock.calls[0]?.[0];

      expect(arg).toMatchObject({
        where: { deletedAt: null, mentions: { some: { mentionedUserId: 'u1' } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should serialize each row and expose the conversation id and title', async () => {
      prisma.chatMessage.findMany.mockResolvedValue([
        { id: 'm1', conversationId: 'c1', conversation: { id: 'c1', title: 'General' } },
        { id: 'm2', conversationId: 'c2', conversation: { id: 'c2', title: null } },
      ]);

      const result = await service.feed('u1');

      expect(serializer.message).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: 'm1' }),
        'u1',
      );

      expect(result.items).toEqual([
        { message: { id: 'm1' }, conversationId: 'c1', conversationTitle: 'General' },
        { message: { id: 'm2' }, conversationId: 'c2', conversationTitle: null },
      ]);
    });

    it('should return an empty feed when there are no mentions', async () => {
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await expect(service.feed('u1')).resolves.toEqual({ items: [] });
    });
  });
});
