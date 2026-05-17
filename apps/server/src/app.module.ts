import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { envValidate } from './config/env.config';
import { AppController } from './app.controller';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './integrations/redis/redis.module';
import { AuthModule } from './modules/client/auth/auth.module';
import { JwtAuthGuard } from './modules/client/auth/guards/jwt-auth.guard';
import { SettingsModule } from './modules/client/settings/settings.module';
import { MeetingsModule } from './modules/client/meetings/meetings.module';
import { LiveKitModule } from './integrations/livekit/livekit.module';
import { ChatModule } from './modules/client/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: envValidate,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    SettingsModule,
    MeetingsModule,
    LiveKitModule,
    ChatModule,
    AdminModule,
    StorageModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})

export class AppModule {}
