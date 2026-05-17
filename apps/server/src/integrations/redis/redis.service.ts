import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import type { ApiEnv } from '@open-meet/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly clientInstance: Redis;
  private pubInstance?: Redis;
  private subInstance?: Redis;

  constructor(config: ConfigService<ApiEnv, true>) {
    const url = config.getOrThrow<string>('REDIS_URL');

    this.clientInstance = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: null,
    });

    this.clientInstance.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.clientInstance.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.clientInstance.quit(),
      this.pubInstance?.quit(),
      this.subInstance?.quit(),
    ]);
  }

  get client(): Redis {
    return this.clientInstance;
  }

  pubSubPair(): { pub: Redis; sub: Redis } {
    if (!this.pubInstance) {
      this.pubInstance = this.clientInstance.duplicate();
    }

    if (!this.subInstance) {
      this.subInstance = this.clientInstance.duplicate();
    }

    return { pub: this.pubInstance, sub: this.subInstance };
  }
}
