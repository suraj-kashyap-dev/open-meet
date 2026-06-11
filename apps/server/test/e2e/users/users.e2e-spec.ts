import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

describe('Users public profile (e2e)', () => {
  let app: NestFastifyApplication;
  let viewer: { id: string; cookie: string };
  let target: { id: string; cookie: string };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    const v = await registerUser(app, {
      email: 'viewer@example.com',
      password: 'secretpass1',
      name: 'Viewer',
    });
    const t = await registerUser(app, {
      email: 'target@example.com',
      password: 'secretpass1',
      name: 'Target',
    });

    viewer = { id: v.user!.id, cookie: v.cookie };

    target = { id: t.user!.id, cookie: t.cookie };
  });

  function publicProfile(cookie: string, id: string) {
    return http(app).get(`/api/users/${id}/public`).set('Cookie', cookie);
  }

  describe('GET /api/users/:id/public', () => {
    it('should return the full profile for the caller viewing themselves', async () => {
      const res = await publicProfile(viewer.cookie, viewer.id);

      expect(res.status).toBe(200);

      expect(res.body.success).toBe(true);

      expect(res.body.data.id).toBe(viewer.id);

      expect(res.body.data.name).toBe('Viewer');

      expect(res.body.data.email).toBe('viewer@example.com');

      expect(res.body.data.joinedAt).toBeTypeOf('string');
    });

    it('should mask details for a peer with no shared surface (PARTICIPANTS_ONLY default)', async () => {
      const res = await publicProfile(viewer.cookie, target.id);

      expect(res.status).toBe(200);

      expect(res.body.data.id).toBe(target.id);

      expect(res.body.data.name).toBe('Target');

      expect(res.body.data.email).toBeNull();

      expect(res.body.data.bio).toBeNull();

      expect(res.body.data.joinedAt).toBeNull();

      expect(res.body.data.visibility).toBe('PARTICIPANTS_ONLY');
    });

    it('should expose the full profile when the target visibility is PUBLIC', async () => {
      await http(app)
        .patch('/api/auth/me/settings')
        .set('Cookie', target.cookie)
        .send({ privacySettings: { profileVisibility: 'PUBLIC' } });

      const res = await publicProfile(viewer.cookie, target.id);

      expect(res.status).toBe(200);

      expect(res.body.data.visibility).toBe('PUBLIC');

      expect(res.body.data.email).toBe('target@example.com');

      expect(res.body.data.joinedAt).toBeTypeOf('string');
    });

    it('should return 404 NOT_FOUND for an unknown user id', async () => {
      const res = await publicProfile(viewer.cookie, 'does-not-exist');

      expect(res.status).toBe(404);

      expect(res.body.success).toBe(false);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      const res = await http(app).get(`/api/users/${target.id}/public`);

      expect(res.status).toBe(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
