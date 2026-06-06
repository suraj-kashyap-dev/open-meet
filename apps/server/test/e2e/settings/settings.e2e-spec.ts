import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

describe('Settings (e2e)', () => {
  let app: NestFastifyApplication;
  let cookie: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    const user = await registerUser(app, {
      email: 'settings@example.com',
      password: 'secretpass1',
    });
    cookie = user.cookie;
  });

  describe('GET /api/auth/me/settings', () => {
    it('should return the meeting, privacy, and appearance settings', async () => {
      const res = await http(app).get('/api/auth/me/settings').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.meetingPreferences).toBeDefined();
      expect(res.body.data.privacySettings).toBeDefined();
      expect(res.body.data.appearance).toBeDefined();
      expect(typeof res.body.data.meetingPreferences.enableNotifications).toBe('boolean');
    });

    it('should require authentication', async () => {
      const res = await http(app).get('/api/auth/me/settings');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/auth/me/settings', () => {
    it('should update a meeting preference and reflect it on a subsequent read', async () => {
      const before = await http(app).get('/api/auth/me/settings').set('Cookie', cookie);
      const initial = before.body.data.meetingPreferences.enableNotifications as boolean;

      const patched = await http(app)
        .patch('/api/auth/me/settings')
        .set('Cookie', cookie)
        .send({ meetingPreferences: { enableNotifications: !initial } });

      expect(patched.status).toBe(200);
      expect(patched.body.success).toBe(true);
      expect(patched.body.data.meetingPreferences.enableNotifications).toBe(!initial);

      const after = await http(app).get('/api/auth/me/settings').set('Cookie', cookie);
      expect(after.body.data.meetingPreferences.enableNotifications).toBe(!initial);
    });

    it('should update a privacy setting', async () => {
      const res = await http(app)
        .patch('/api/auth/me/settings')
        .set('Cookie', cookie)
        .send({ privacySettings: { profileVisibility: 'PUBLIC' } });

      expect(res.status).toBe(200);
      expect(res.body.data.privacySettings.profileVisibility).toBe('PUBLIC');
    });

    it('should reject an invalid accent color override with VALIDATION_FAILED', async () => {
      const res = await http(app)
        .patch('/api/auth/me/settings')
        .set('Cookie', cookie)
        .send({ appearance: { accentColorOverride: 'not-a-color' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should require authentication', async () => {
      const res = await http(app)
        .patch('/api/auth/me/settings')
        .send({ meetingPreferences: { enableNotifications: false } });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
