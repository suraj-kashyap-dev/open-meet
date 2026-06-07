import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/services/prisma.service';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function seedInvite(
  app: NestFastifyApplication,
  opts: { email: string; name?: string; token: string; expiresInMs?: number },
): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.userInvite.create({
    data: {
      email: opts.email.toLowerCase(),
      name: opts.name ?? 'Invited User',
      tokenHash: hashToken(opts.token),
      expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 24 * 60 * 60_000)),
    },
  });
}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  describe('GET /api/auth/invite/:token', () => {
    it('should return the pending invite for a valid token', async () => {
      await seedInvite(app, { email: 'ada@example.com', name: 'Ada Lovelace', token: 'tok-ada' });

      const res = await http(app).get('/api/auth/invite/tok-ada');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('ada@example.com');
      expect(res.body.data.name).toBe('Ada Lovelace');
      expect(res.body.data.expiresAt).toBeTypeOf('string');
    });

    it('should return 404 INVITE_INVALID for an unknown token', async () => {
      const res = await http(app).get('/api/auth/invite/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVITE_INVALID');
    });
  });

  describe('POST /api/auth/invite/accept', () => {
    it('should create a verified account, set httpOnly cookies, and consume the invite', async () => {
      await seedInvite(app, { email: 'ada@example.com', name: 'Ada', token: 'tok-accept' });

      const res = await http(app)
        .post('/api/auth/invite/accept')
        .send({ token: 'tok-accept', password: 'secretpass1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ada@example.com');

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie.join(';')).toContain('access_token=');
      expect(setCookie.some((c) => /httponly/i.test(c))).toBe(true);

      const login = await http(app)
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'secretpass1' });
      expect(login.status).toBe(200);
    });

    it('should reject reusing an already-consumed invite with 404', async () => {
      await seedInvite(app, { email: 'reuse@example.com', token: 'tok-once' });

      const first = await http(app)
        .post('/api/auth/invite/accept')
        .send({ token: 'tok-once', password: 'secretpass1' });
      expect(first.status).toBe(200);

      const second = await http(app)
        .post('/api/auth/invite/accept')
        .send({ token: 'tok-once', password: 'secretpass1' });
      expect(second.status).toBe(404);
      expect(second.body.error.code).toBe('INVITE_INVALID');
    });

    it('should reject a too-short password with a 400 validation envelope', async () => {
      await seedInvite(app, { email: 'short@example.com', token: 'tok-short' });

      const res = await http(app)
        .post('/api/auth/invite/accept')
        .send({ token: 'tok-short', password: 'x' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject wrong credentials with 401', async () => {
      await registerUser(app, { email: 'ada@example.com', password: 'secretpass1' });
      const res = await http(app)
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the current user when the access cookie is sent', async () => {
      const { cookie } = await registerUser(app, {
        email: 'ada@example.com',
        password: 'secretpass1',
      });
      const res = await http(app).get('/api/auth/me').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(typeof res.body.data.canCreateGroups).toBe('boolean');
    });

    it('should return 401 without authentication', async () => {
      const res = await http(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
