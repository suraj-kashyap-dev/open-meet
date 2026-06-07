import { describe, beforeEach, expect, it, vi } from 'vitest';
import { PresenceStatus } from '@prisma/client';

import { ChatServerEvent } from '@open-meet/types';

import { PresenceService } from '@/modules/client/messaging/services/presence.service';
import { type PresenceRepository } from '@/modules/client/messaging/repositories/presence.repository';
import { type ChatBus } from '@/modules/client/messaging/services/chat-bus.service';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type RedisService } from '@/integrations/redis/services/redis.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let repo: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let bus: {
    emit: ReturnType<typeof vi.fn>;
    roomHasSockets: ReturnType<typeof vi.fn>;
    disconnectRoom: ReturnType<typeof vi.fn>;
  };
  let conversations: { conversationIdsForUser: ReturnType<typeof vi.fn> };
  let hashes: Record<string, Map<string, string>>;
  let redis: {
    client: {
      hincrby: (key: string, field: string, amount: number) => Promise<number>;
      hdel: (key: string, ...fields: string[]) => Promise<number>;
      hset: (key: string, field: string, value: string) => Promise<number>;
      hget: (key: string, field: string) => Promise<string | null>;
      hmget: (key: string, ...fields: string[]) => Promise<Array<string | null>>;
    };
  };

  beforeEach(() => {
    hashes = {
      'chat:presence:online': new Map(),
      'chat:presence:last-seen': new Map(),
    };
    repo = {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    };
    bus = {
      emit: vi.fn(),
      roomHasSockets: vi.fn().mockResolvedValue(true),
      disconnectRoom: vi.fn().mockResolvedValue(0),
    };
    conversations = {
      conversationIdsForUser: vi.fn().mockResolvedValue([]),
    };
    redis = {
      client: {
        hincrby: async (key, field, amount) => {
          const next = Number(hashes[key]?.get(field) ?? 0) + amount;
          hashes[key]?.set(field, String(next));
          return next;
        },
        hdel: async (key, ...fields) => {
          let deleted = 0;
          for (const field of fields) {
            if (hashes[key]?.delete(field)) {
              deleted += 1;
            }
          }
          return deleted;
        },
        hset: async (key, field, value) => {
          hashes[key]?.set(field, value);
          return 1;
        },
        hget: async (key, field) => hashes[key]?.get(field) ?? null,
        hmget: async (key, ...fields) => fields.map((field) => hashes[key]?.get(field) ?? null),
      },
    };

    service = new PresenceService(
      redis as unknown as RedisService,
      repo as unknown as PresenceRepository,
      bus as unknown as ChatBus,
      conversations as unknown as ConversationsRepository,
    );
  });

  it('should reset persisted status to available for the next login session', async () => {
    await service.resetStatus('u1');

    expect(repo.upsert).toHaveBeenCalledWith('u1', PresenceStatus.AVAILABLE, null);
  });

  it('should keep users online only when a live chat socket still exists', async () => {
    hashes['chat:presence:online'].set('u1', '1');

    const online = await service.areOnline(['u1']);

    expect(online).toEqual(new Set(['u1']));
    expect(bus.roomHasSockets).toHaveBeenCalledWith('user:u1');
    expect(bus.emit).not.toHaveBeenCalled();
  });

  it('should force stale online counts offline when no chat socket remains', async () => {
    hashes['chat:presence:online'].set('u1', '1');
    bus.roomHasSockets.mockResolvedValue(false);
    conversations.conversationIdsForUser.mockResolvedValue(['c1', 'c2']);

    const online = await service.areOnline(['u1']);

    expect(online).toEqual(new Set());
    expect(hashes['chat:presence:online'].has('u1')).toBe(false);
    expect(hashes['chat:presence:last-seen'].has('u1')).toBe(true);
    expect(bus.emit).toHaveBeenCalledTimes(2);
    expect(bus.emit).toHaveBeenNthCalledWith(
      1,
      'conversation:c1',
      ChatServerEvent.PRESENCE_UPDATE,
      expect.objectContaining({
        userId: 'u1',
        online: false,
        status: PresenceStatus.OFFLINE,
      }),
    );
  });
});
