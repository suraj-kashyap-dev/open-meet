import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisIoAdapter } from './websocket/redis-io.adapter';
import type { ApiEnv } from '@open-meet/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false }),
    { bufferLogs: false, abortOnError: false },
  );

  const config = app.get<ConfigService<ApiEnv, true>>(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
  const isProd = config.getOrThrow<string>('NODE_ENV') === 'production';
  const cookieSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');

  await app.register(fastifyCookie, { secret: cookieSecret });

  const uploadMaxSize = config.getOrThrow<number>('UPLOAD_MAX_SIZE_BYTES');
  await app.register(fastifyMultipart, {
    limits: { fileSize: uploadMaxSize, files: 1 },
  });

  // LiveKit sends webhooks with `Content-Type: application/webhook+json` —
  // Fastify doesn't parse that by default, so req.body would be undefined and
  // signature validation would silently fail. Register a raw-text parser so
  // the original body is preserved byte-for-byte for the HMAC check.
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addContentTypeParser(
    'application/webhook+json',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  app.useWebSocketAdapter(new RedisIoAdapter(app));

  if (!isProd) {
    const swagger = new DocumentBuilder()
      .setTitle('open-meet API')
      .setDescription('Google Meet clone — REST + WebSocket API')
      .setVersion('0.1.0')
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, swagger);

    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen({ port, host: '0.0.0.0' });

  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');

  if (!isProd) {
    Logger.log(`Swagger UI at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

bootstrap().catch((err) => {
  console.error('[bootstrap] failed:', err);

  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }

  process.exit(1);
});
