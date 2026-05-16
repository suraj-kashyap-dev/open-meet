import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import type { ApiEnv } from '@open-meet/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false }),
    { bufferLogs: true },
  );

  const config = app.get(ConfigService<ApiEnv, true>);
  const port = config.get('PORT', { infer: true });
  const frontendUrl = config.get('FRONTEND_URL', { infer: true });
  const isProd = config.get('NODE_ENV', { infer: true }) === 'production';

  await app.register(fastifyCookie, {
    secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
  });

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
  if (!isProd) Logger.log(`Swagger UI at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error(err, 'Bootstrap');
  process.exit(1);
});
