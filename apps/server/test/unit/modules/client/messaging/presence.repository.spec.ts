import { PresenceStatus, type UserPresence } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { PresenceRepository } from '@/modules/client/messaging/presence.repository';

describe('PresenceRepository', () => {
  let repo: PresenceRepository;
  let userPresence: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };

  const sentinel = { userId: 'u1' } as UserPresence;

  beforeEach(() => {
    userPresence = {
      upsert: vi.fn().mockResolvedValue(sentinel),
      findUnique: vi.fn().mockResolvedValue(sentinel),
      findMany: vi.fn().mockResolvedValue([sentinel]),
    };
    repo = new PresenceRepository({ userPresence } as unknown as PrismaService);
  });

  describe('upsert()', () => {
    it('should create or update presence with status and custom text', async () => {
      await repo.upsert('u1', PresenceStatus.AVAILABLE, 'busy');
      expect(userPresence.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1', status: PresenceStatus.AVAILABLE, customText: 'busy' },
        update: { status: PresenceStatus.AVAILABLE, customText: 'busy' },
      });
    });
  });

  describe('find()', () => {
    it('should query presence by userId', async () => {
      await repo.find('u1');
      expect(userPresence.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });
  });

  describe('findMany()', () => {
    it('should resolve to an empty array without querying for no ids', async () => {
      const result = await repo.findMany([]);
      expect(result).toEqual([]);
      expect(userPresence.findMany).not.toHaveBeenCalled();
    });

    it('should query presence for the given userIds', async () => {
      const result = await repo.findMany(['u1', 'u2']);
      expect(userPresence.findMany).toHaveBeenCalledWith({
        where: { userId: { in: ['u1', 'u2'] } },
      });
      expect(result).toEqual([sentinel]);
    });
  });
});
