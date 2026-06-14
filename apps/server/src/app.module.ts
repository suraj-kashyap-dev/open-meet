import { join } from 'node:path';

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';

import type { ApiEnv } from '@open-meet/config';

import { envValidate } from './config/env.config';
import { DatagridModule } from './common/datagrid';
import { AppController } from './app.controller';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './integrations/redis/redis.module';
import { JwtAuthGuard } from './modules/client/auth/guards/jwt-auth.guard';
import { ClientModule } from './modules/client/client.module';
import { LiveKitModule } from './integrations/livekit/livekit.module';
import { MailModule } from './integrations/mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppConfigModule } from './modules/config/config.module';
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
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnv, true>) => ({
        connection: new Redis(config.getOrThrow<string>('REDIS_URL'), {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'en-*': 'en',
        'ar-*': 'ar',
        'es-*': 'es',
        'zh-*': 'zh',
        'ru-*': 'ru',
        'tr-*': 'tr',
        'hi-*': 'hi',
        'pt-*': 'pt',
        'fr-*': 'fr',
        'de-*': 'de',
        'ja-*': 'ja',
        'ko-*': 'ko',
        'id-*': 'id',
        'it-*': 'it',
        'bn-*': 'bn',
      },
      loaderOptions: {
        path: join(process.cwd(), 'lang'),
        watch: false,
      },
      resolvers: [
        new QueryResolver(['lang']),
        new HeaderResolver(['x-locale']),
        AcceptLanguageResolver,
      ],
    }),
    DatagridModule,
    PrismaModule,
    RedisModule,
    MailModule,
    LiveKitModule,
    AppConfigModule,
    ClientModule,
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
