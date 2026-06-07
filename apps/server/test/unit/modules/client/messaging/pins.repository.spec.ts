import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { chatMessageInclude } from '@/modules/client/messaging/messaging.includes';
import { PinsRepository } from '@/modules/client/messaging/repositories/pins.repository';

describe('PinsRepository', () => {
  let repo: PinsRepository;
  let pinnedMessage: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    pinnedMessage = {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    };
    repo = new PinsRepository({ pinnedMessage } as unknown as PrismaService);
  });

  describe('pin()', () => {
    it('should upsert a per-user pin keyed by message and pinner', async () => {
      await repo.pin('c1', 'm1', 'u1');
      expect(pinnedMessage.upsert).toHaveBeenCalledWith({
        where: { messageId_pinnedById: { messageId: 'm1', pinnedById: 'u1' } },
        create: { conversationId: 'c1', messageId: 'm1', pinnedById: 'u1' },
        update: {},
      });
    });
  });

  describe('unpin()', () => {
    it('should delete only the requesting user pin', async () => {
      await repo.unpin('m1', 'u1');
      expect(pinnedMessage.deleteMany).toHaveBeenCalledWith({
        where: { messageId: 'm1', pinnedById: 'u1' },
      });
    });
  });

  describe('listPinned()', () => {
    it('should query the viewer pins newest-first and map to the nested messages', async () => {
      pinnedMessage.findMany.mockResolvedValue([
        { message: { id: 'm2' } },
        { message: { id: 'm1' } },
      ]);
      const result = await repo.listPinned('c1', 'u1');
      expect(pinnedMessage.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1', pinnedById: 'u1' },
        orderBy: { createdAt: 'desc' },
        include: { message: { include: chatMessageInclude } },
      });
      expect(result).toEqual([{ id: 'm2' }, { id: 'm1' }]);
    });
  });

  describe('pinnedIdsForUser()', () => {
    it('should select and map the viewer pinned message ids', async () => {
      pinnedMessage.findMany.mockResolvedValue([{ messageId: 'm1' }, { messageId: 'm2' }]);
      const ids = await repo.pinnedIdsForUser('c1', 'u1');
      expect(pinnedMessage.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1', pinnedById: 'u1' },
        select: { messageId: true },
      });
      expect(ids).toEqual(['m1', 'm2']);
    });
  });
});
