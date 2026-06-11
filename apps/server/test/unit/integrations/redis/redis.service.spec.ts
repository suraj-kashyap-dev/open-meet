import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { RedisService } from '@/integrations/redis/services/redis.service';

const { RedisCtor } = vi.hoisted(() => {
  const make = (): Record<string, ReturnType<typeof vi.fn>> => ({
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    duplicate: vi.fn(() => make()),
  });

  return { RedisCtor: vi.fn(() => make()) };
});

vi.mock('ioredis', () => ({ Redis: RedisCtor }));

const config = {
  getOrThrow: () => 'redis://localhost:6379',
} as unknown as ConfigService<ApiEnv, true>;

type FakeClient = { duplicate: ReturnType<typeof vi.fn>; quit: ReturnType<typeof vi.fn> };

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    RedisCtor.mockClear();

    service = new RedisService(config);
  });

  describe('constructor', () => {
    it('should connect a single client from REDIS_URL', () => {
      expect(RedisCtor).toHaveBeenCalledTimes(1);

      expect(RedisCtor).toHaveBeenCalledWith('redis://localhost:6379', expect.any(Object));
    });
  });

  describe('pubSubPair()', () => {
    it('should lazily duplicate the client once and memoize the pair', () => {
      const client = service.client as unknown as FakeClient;
      const first = service.pubSubPair();
      const second = service.pubSubPair();

      expect(first.pub).not.toBe(first.sub);

      expect(second.pub).toBe(first.pub);

      expect(second.sub).toBe(first.sub);

      expect(client.duplicate).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleDestroy()', () => {
    it('should quit the client and the pub/sub pair', async () => {
      const client = service.client as unknown as FakeClient;
      const { pub, sub } = service.pubSubPair();

      await service.onModuleDestroy();

      expect(client.quit).toHaveBeenCalled();

      expect((pub as unknown as FakeClient).quit).toHaveBeenCalled();

      expect((sub as unknown as FakeClient).quit).toHaveBeenCalled();
    });
  });
});
