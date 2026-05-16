import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import type { Redis } from 'ioredis';

import { RedisService } from '../integrations/redis/redis.service';

type RedisAdapter = ReturnType<typeof createAdapter>;

export class RedisIoAdapter extends IoAdapter {
  private redisAdapter?: RedisAdapter;

  constructor(app: INestApplicationContext) {
    super(app);
    const redisService = app.get(RedisService);
    const { pub, sub } = redisService.pubSubPair();
    this.redisAdapter = createAdapter(pub as Redis, sub as Redis);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, {
      ...options,
      cors: options?.cors ?? { origin: true, credentials: true },
    }) as { adapter: (adapter: RedisAdapter) => unknown };

    if (this.redisAdapter) {
      server.adapter(this.redisAdapter);
    }
    
    return server;
  }
}
