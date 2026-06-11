import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/services/prisma.service';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

describe('Push (e2e)', () => {
  let app: NestFastifyApplication;
  let cookie: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    const user = await registerUser(app, { email: 'pusher@example.com', password: 'secretpass1' });

    cookie = user.cookie;

    userId = user.user!.id;
  });

  const validBody = {
    endpoint: 'https://push.example.com/sub/abc123',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  };

  function countSubscriptions(): Promise<number> {
    return app.get(PrismaService).pushSubscription.count({ where: { userId } });
  }

  describe('GET /api/push/vapid-public-key', () => {
    it('should be public and return an empty key when VAPID is disabled', async () => {
      const res = await http(app).get('/api/push/vapid-public-key');

      expect(res.status).toBe(200);

      expect(res.body.success).toBe(true);

      expect(res.body.data.publicKey).toBe('');
    });
  });

  describe('POST /api/push/subscribe', () => {
    it('should store a subscription row for the current user', async () => {
      const res = await http(app).post('/api/push/subscribe').set('Cookie', cookie).send(validBody);

      expect(res.status).toBe(204);

      expect(await countSubscriptions()).toBe(1);
    });

    it('should upsert the same endpoint without creating a duplicate row', async () => {
      await http(app).post('/api/push/subscribe').set('Cookie', cookie).send(validBody);
      const second = await http(app)
        .post('/api/push/subscribe')
        .set('Cookie', cookie)
        .send({ ...validBody, keys: { p256dh: 'new-p256dh', auth: 'new-auth' } });

      expect(second.status).toBe(204);

      expect(await countSubscriptions()).toBe(1);
    });

    it('should reject a body missing the keys with VALIDATION_FAILED', async () => {
      const res = await http(app)
        .post('/api/push/subscribe')
        .set('Cookie', cookie)
        .send({ endpoint: 'https://push.example.com/sub/no-keys' });

      expect(res.status).toBe(400);

      expect(res.body.success).toBe(false);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should require authentication', async () => {
      const res = await http(app).post('/api/push/subscribe').send(validBody);

      expect(res.status).toBe(401);

      expect(res.body.success).toBe(false);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/push/unsubscribe', () => {
    it('should remove a previously stored subscription', async () => {
      await http(app).post('/api/push/subscribe').set('Cookie', cookie).send(validBody);

      expect(await countSubscriptions()).toBe(1);

      const res = await http(app)
        .post('/api/push/unsubscribe')
        .set('Cookie', cookie)
        .send({ endpoint: validBody.endpoint });

      expect(res.status).toBe(204);

      expect(await countSubscriptions()).toBe(0);
    });

    it('should require authentication', async () => {
      const res = await http(app)
        .post('/api/push/unsubscribe')
        .send({ endpoint: validBody.endpoint });

      expect(res.status).toBe(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
