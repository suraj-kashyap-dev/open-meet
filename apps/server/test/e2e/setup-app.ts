import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import * as argon2 from 'argon2';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { PrismaService } from '@/database/prisma.service';
import { LiveKitService } from '@/integrations/livekit/livekit.service';
import { MailService } from '@/integrations/mail/mail.service';

const livekitStub = {
  mintToken: async () => ({
    token: 'header.payload.signature',
    url: 'ws://localhost:7880',
    room: 'room',
    identity: 'user',
  }),
  closeRoom: async () => undefined,
  removeParticipant: async () => undefined,
  createRoom: async () => undefined,
};

const mailStub = { send: async () => undefined };

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LiveKitService)
    .useValue(livekitStub)
    .overrideProvider(MailService)
    .useValue(mailStub)
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  app.setGlobalPrefix('api');
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
  await app.register(fastifyCookie, { secret: process.env.JWT_ACCESS_SECRET });
  await app.register(fastifyMultipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export function http(app: NestFastifyApplication) {
  return request(app.getHttpServer());
}

export async function resetDb(app: NestFastifyApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Attachment","Message","Participant","MeetingInvite","Recording","PollVote","PollOption","Poll","MessageReaction","MessageMention","PinnedMessage","SavedMessage","ChatMessage","ConversationMember","Conversation","DepartmentMember","Department","UserPresence","UserInvite","UserSettings","Meeting","User","AdminInvite","Admin","WorkspaceSettings" RESTART IDENTITY CASCADE',
  );
}

export function cookieHeader(setCookie: string[] | string | undefined): string {
  const arr = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return arr.map((c) => c.split(';')[0]).join('; ');
}

interface Creds {
  name?: string;
  email: string;
  password: string;
}

// Locally-named alias for supertest's response so exported helper return types
// don't leak an un-nameable @types/superagent path (TS2883).
type SupertestResponse = Awaited<ReturnType<ReturnType<typeof request>['post']>>;

// Public signup is invite-only, so e2e seeds a verified user directly and logs
// in to obtain session cookies (same return shape the suites already rely on).
export async function registerUser(
  app: NestFastifyApplication,
  creds: Creds,
): Promise<{
  res: SupertestResponse;
  user: { id: string; email: string } | undefined;
  cookie: string;
}> {
  const prisma = app.get(PrismaService);
  const passwordHash = await argon2.hash(creds.password, { type: argon2.argon2id });
  const created = await prisma.user.create({
    data: {
      name: creds.name ?? 'Test User',
      email: creds.email.toLowerCase(),
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const res = await http(app)
    .post('/api/auth/login')
    .send({ email: creds.email, password: creds.password });

  return {
    res,
    user: (res.body?.data?.user as { id: string; email: string } | undefined) ?? {
      id: created.id,
      email: created.email,
    },
    cookie: cookieHeader(res.headers['set-cookie']),
  };
}

/** Seed an admin with an RBAC role. Defaults to the Administrator role (ALL bypass). */
export async function seedAdmin(
  app: NestFastifyApplication,
  creds: Creds & { roleRecordId?: string },
): Promise<void> {
  const prisma = app.get(PrismaService);
  const passwordHash = await argon2.hash(creds.password, { type: argon2.argon2id });
  await prisma.admin.create({
    data: {
      email: creds.email.toLowerCase(),
      name: creds.name ?? 'Admin',
      passwordHash,
      roleRecordId: creds.roleRecordId ?? 'role_sys_admin',
    },
  });
}

export async function loginAdmin(
  app: NestFastifyApplication,
  creds: Creds,
): Promise<{ res: SupertestResponse; cookie: string }> {
  const res = await http(app)
    .post('/api/admin/auth/login')
    .send({ email: creds.email, password: creds.password });
  return { res, cookie: cookieHeader(res.headers['set-cookie']) };
}
