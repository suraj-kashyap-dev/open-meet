import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from './setup-app';

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

  describe('POST /api/auth/register', () => {
    it('should create a user, return the success envelope, and set httpOnly cookies', async () => {
      const res = await http(app)
        .post('/api/auth/register')
        .send({ name: 'Ada', email: 'ada@example.com', password: 'secretpass1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(res.body.meta.timestamp).toBeTypeOf('string');

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie.join(';')).toContain('access_token=');
      expect(setCookie.some((c) => /httponly/i.test(c))).toBe(true);
    });

    it('should reject a duplicate email with 409', async () => {
      await registerUser(app, { email: 'dup@example.com', password: 'secretpass1' });
      const res = await http(app)
        .post('/api/auth/register')
        .send({ name: 'Ada2', email: 'dup@example.com', password: 'secretpass1' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid input with a 400 validation envelope', async () => {
      const res = await http(app)
        .post('/api/auth/register')
        .send({ name: '', email: 'not-an-email', password: 'x' });

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
      expect(res.body.data.email).toBe('ada@example.com');
    });

    it('should return 401 without authentication', async () => {
      const res = await http(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
