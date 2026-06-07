import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { chatMessageInclude } from '@/modules/client/messaging/messaging.includes';
import { SavedRepository } from '@/modules/client/messaging/repositories/saved.repository';

const savedInclude = {
  message: {
    include: { ...chatMessageInclude, conversation: { select: { id: true, title: true } } },
  },
};

describe('SavedRepository', () => {
  let repo: SavedRepository;
  let savedMessage: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    savedMessage = {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    };
    repo = new SavedRepository({ savedMessage } as unknown as PrismaService);
  });

  describe('save()', () => {
    it('should upsert a saved record keyed by user and message', async () => {
      await repo.save('u1', 'm1');
      expect(savedMessage.upsert).toHaveBeenCalledWith({
        where: { userId_messageId: { userId: 'u1', messageId: 'm1' } },
        create: { userId: 'u1', messageId: 'm1' },
        update: {},
      });
    });
  });

  describe('unsave()', () => {
    it('should delete the matching saved record', async () => {
      await repo.unsave('u1', 'm1');
      expect(savedMessage.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', messageId: 'm1' },
      });
    });
  });

  describe('listSaved()', () => {
    it('should query saved messages newest-first with the message and conversation include', async () => {
      const rows = [{ message: { id: 'm1' } }];
      savedMessage.findMany.mockResolvedValue(rows);
      const result = await repo.listSaved('u1');
      expect(savedMessage.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        include: savedInclude,
      });
      expect(result).toBe(rows);
    });
  });

  describe('savedIdsForViewer()', () => {
    it('should short-circuit to an empty array without querying when no ids are given', async () => {
      const result = await repo.savedIdsForViewer('u1', []);
      expect(result).toEqual([]);
      expect(savedMessage.findMany).not.toHaveBeenCalled();
    });

    it('should select and map saved message ids restricted to the given ids', async () => {
      savedMessage.findMany.mockResolvedValue([{ messageId: 'm1' }]);
      const ids = await repo.savedIdsForViewer('u1', ['m1', 'm2']);
      expect(savedMessage.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', messageId: { in: ['m1', 'm2'] } },
        select: { messageId: true },
      });
      expect(ids).toEqual(['m1']);
    });
  });
});
