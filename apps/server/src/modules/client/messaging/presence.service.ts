import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';

import { ChatServerEvent } from '@open-meet/types';

import { RedisService } from '../../../integrations/redis/redis.service';

import { ChatBus, conversationRoom, userRoom } from './chat-bus.service';
import { ConversationsRepository } from './conversations.repository';
import { PresenceRepository } from './presence.repository';

const ONLINE_KEY = 'chat:presence:online';
const LAST_SEEN_KEY = 'chat:presence:last-seen';

export interface PresenceSnapshot {
  online: boolean;
  status: PresenceStatus;
  customText: string | null;
  lastSeen: string | null;
}

@Injectable()
export class PresenceService {
  constructor(
    private readonly redis: RedisService,
    private readonly repo: PresenceRepository,
    private readonly bus: ChatBus,
    private readonly conversations: ConversationsRepository,
  ) {}

  async connect(userId: string): Promise<boolean> {
    const count = await this.redis.client.hincrby(ONLINE_KEY, userId, 1);
    return count === 1;
  }

  async disconnect(userId: string): Promise<boolean> {
    const count = await this.redis.client.hincrby(ONLINE_KEY, userId, -1);

    if (count <= 0) {
      await this.redis.client.hdel(ONLINE_KEY, userId);
      await this.redis.client.hset(LAST_SEEN_KEY, userId, new Date().toISOString());
      return true;
    }

    return false;
  }

  async forceOffline(userId: string): Promise<void> {
    const lastSeen = await this.markOffline(userId);

    const conversationIds = await this.conversations.conversationIdsForUser(userId);
    const payload = {
      userId,
      online: false,
      status: PresenceStatus.OFFLINE,
      customText: null,
      lastSeen,
    };
    for (const id of conversationIds) {
      this.bus.emit(conversationRoom(id), ChatServerEvent.PRESENCE_UPDATE, payload);
    }
  }

  async disconnectSockets(userId: string): Promise<number> {
    return this.bus.disconnectRoom(userRoom(userId));
  }

  async isOnline(userId: string): Promise<boolean> {
    const online = await this.areOnline([userId]);
    return online.has(userId);
  }

  async lastSeen(userId: string): Promise<string | null> {
    return this.redis.client.hget(LAST_SEEN_KEY, userId);
  }

  setStatus(userId: string, status: PresenceStatus, customText: string | null): Promise<unknown> {
    return this.repo.upsert(userId, status, customText);
  }

  async resetStatus(userId: string): Promise<void> {
    await this.repo.upsert(userId, PresenceStatus.AVAILABLE, null);
  }

  async forUser(userId: string): Promise<PresenceSnapshot> {
    const [snap] = await this.snapshotList([userId]);

    return (
      snap ?? { online: false, status: PresenceStatus.OFFLINE, customText: null, lastSeen: null }
    );
  }

  async snapshot(userIds: string[]): Promise<Map<string, PresenceSnapshot>> {
    const list = await this.snapshotList(userIds);
    return new Map(userIds.map((id, i) => [id, list[i]!]));
  }

  private async markOffline(userId: string): Promise<string> {
    const lastSeen = new Date().toISOString();
    await this.redis.client.hdel(ONLINE_KEY, userId);
    await this.redis.client.hset(LAST_SEEN_KEY, userId, lastSeen);
    return lastSeen;
  }

  private async snapshotList(userIds: string[]): Promise<PresenceSnapshot[]> {
    if (userIds.length === 0) {
      return [];
    }

    const [online, rows, lastSeenValues] = await Promise.all([
      this.areOnline(userIds),
      this.repo.findMany(userIds),
      this.redis.client.hmget(LAST_SEEN_KEY, ...userIds),
    ]);

    const byUser = new Map(rows.map((r) => [r.userId, r]));

    return userIds.map((id, i) => {
      const isOnline = online.has(id);
      const chosen = byUser.get(id);
      const status =
        !isOnline || chosen?.status === PresenceStatus.OFFLINE
          ? PresenceStatus.OFFLINE
          : (chosen?.status ?? PresenceStatus.AVAILABLE);

      return {
        online: isOnline && status !== PresenceStatus.OFFLINE,
        status,
        customText: chosen?.customText ?? null,
        lastSeen: lastSeenValues[i] ?? null,
      };
    });
  }

  async areOnline(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }

    const values = await this.redis.client.hmget(ONLINE_KEY, ...userIds);
    const online = new Set<string>();
    const candidates: string[] = [];

    userIds.forEach((id, i) => {
      const value = values[i];

      if (value !== null && value !== undefined && Number(value) > 0) {
        candidates.push(id);
      }
    });

    if (candidates.length === 0) {
      return online;
    }

    const socketChecks = await Promise.all(
      candidates.map(async (id) => ({
        id,
        hasSockets: await this.bus.roomHasSockets(userRoom(id)),
      })),
    );

    const staleUserIds: string[] = [];

    for (const { id, hasSockets } of socketChecks) {
      if (hasSockets === false) {
        staleUserIds.push(id);
        continue;
      }

      online.add(id);
    }

    if (staleUserIds.length > 0) {
      await Promise.all(staleUserIds.map((id) => this.forceOffline(id)));
    }

    return online;
  }
}
