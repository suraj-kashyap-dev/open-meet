import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { PushRepository } from '@/modules/client/push/push.repository';

describe('PushRepository', () => {
  let repo: PushRepository;
  let pushSubscription: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  let user: { findMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    pushSubscription = {
      upsert: vi.fn().mockResolvedValue({ id: 's1' }),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    user = { findMany: vi.fn().mockResolvedValue([]) };
    repo = new PushRepository({ pushSubscription, user } as unknown as PrismaService);
  });

  it('upserts a subscription keyed by endpoint', async () => {
    await repo.upsert({ userId: 'u1', endpoint: 'e1', p256dh: 'a', auth: 'b', userAgent: 'UA' });
    expect(pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { endpoint: 'e1' } }),
    );
  });

  it('deletes a subscription scoped to the user + endpoint', async () => {
    await repo.deleteByEndpoint('u1', 'e1');
    expect(pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', endpoint: 'e1' },
    });
  });

  it('skips deleteByEndpoints when the list is empty', async () => {
    await repo.deleteByEndpoints([]);
    expect(pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes many endpoints in one query', async () => {
    await repo.deleteByEndpoints(['e1', 'e2']);
    expect(pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: { in: ['e1', 'e2'] } },
    });
  });

  it('builds a userId -> language map', async () => {
    user.findMany.mockResolvedValue([
      { id: 'u1', language: 'fr' },
      { id: 'u2', language: 'ja' },
    ]);
    const map = await repo.userLanguages(['u1', 'u2']);
    expect(map.get('u1')).toBe('fr');
    expect(map.get('u2')).toBe('ja');
  });

  it('returns an empty language map for no users', async () => {
    const map = await repo.userLanguages([]);
    expect(map.size).toBe(0);
    expect(user.findMany).not.toHaveBeenCalled();
  });
});
