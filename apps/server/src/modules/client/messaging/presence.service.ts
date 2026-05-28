import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';

import { RedisService } from '../../../integrations/redis/redis.service';

import { PresenceRepository } from './presence.repository';

const ONLINE_KEY = 'chat:presence:online';
const LAST_SEEN_KEY = 'chat:presence:last-seen';

export interface PresenceSnapshot {
  online: boolean;
  status: PresenceStatus;
  customText: string | null;
  lastSeen: string | null;
}

/**
 * Online/offline is a Redis connection ref-count (multi-tab safe); the chosen
 * status (Available/Busy/DND/…) + custom text are persisted in `UserPresence`.
 * The effective status shown to others is OFFLINE whenever the user has no live
 * connection (or explicitly appears offline), otherwise their chosen status.
 */
@Injectable()
export class PresenceService {
  constructor(
    private readonly redis: RedisService,
    private readonly repo: PresenceRepository,
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

  async isOnline(userId: string): Promise<boolean> {
    const value = await this.redis.client.hget(ONLINE_KEY, userId);
    return value !== null && Number(value) > 0;
  }

  async areOnline(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }

    const values = await this.redis.client.hmget(ONLINE_KEY, ...userIds);
    const online = new Set<string>();

    userIds.forEach((id, i) => {
      const v = values[i];
      if (v !== null && v !== undefined && Number(v) > 0) {
        online.add(id);
      }
    });

    return online;
  }

  async lastSeen(userId: string): Promise<string | null> {
    return this.redis.client.hget(LAST_SEEN_KEY, userId);
  }

  setStatus(userId: string, status: PresenceStatus, customText: string | null): Promise<unknown> {
    return this.repo.upsert(userId, status, customText);
  }

  /** Effective presence for one user, for the SET_PRESENCE broadcast / "me" view. */
  async forUser(userId: string): Promise<PresenceSnapshot> {
    const [snap] = await this.snapshotList([userId]);
    return (
      snap ?? { online: false, status: PresenceStatus.OFFLINE, customText: null, lastSeen: null }
    );
  }

  /** Effective presence for many users, keyed by id (for serializing member lists). */
  async snapshot(userIds: string[]): Promise<Map<string, PresenceSnapshot>> {
    const list = await this.snapshotList(userIds);
    return new Map(userIds.map((id, i) => [id, list[i]!]));
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
}
