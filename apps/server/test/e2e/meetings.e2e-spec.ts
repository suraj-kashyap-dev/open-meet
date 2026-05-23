import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from './setup-app';

describe('Meetings (e2e)', () => {
  let app: NestFastifyApplication;
  let hostCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    const host = await registerUser(app, { email: 'host@example.com', password: 'secretpass1' });
    hostCookie = host.cookie;
  });

  async function createMeeting(cookie = hostCookie, title?: string) {
    return http(app)
      .post('/api/meetings')
      .set('Cookie', cookie)
      .send(title ? { title } : {});
  }

  describe('POST /api/meetings', () => {
    it('should create a WAITING meeting owned by the caller with a valid code', async () => {
      const res = await createMeeting(hostCookie, 'Weekly sync');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('WAITING');
      expect(res.body.data.title).toBe('Weekly sync');
      expect(res.body.data.code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    });

    it('should require authentication', async () => {
      const res = await http(app).post('/api/meetings').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/meetings/:code', () => {
    it('should return the meeting by code', async () => {
      const created = await createMeeting();
      const code = created.body.data.code;
      const res = await http(app).get(`/api/meetings/${code}`).set('Cookie', hostCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(code);
    });

    it('should 404 an unknown code', async () => {
      const res = await http(app).get('/api/meetings/zzzz-zzzz-zzzz').set('Cookie', hostCookie);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MEETING_NOT_FOUND');
    });
  });

  describe('join + end lifecycle', () => {
    it('should transition the meeting to ACTIVE when a guest joins', async () => {
      const code = (await createMeeting()).body.data.code;
      const guest = await registerUser(app, {
        email: 'guest@example.com',
        password: 'secretpass1',
      });

      const joinRes = await http(app)
        .post(`/api/meetings/${code}/join`)
        .set('Cookie', guest.cookie);
      expect(joinRes.body.success).toBe(true);

      const after = await http(app).get(`/api/meetings/${code}`).set('Cookie', hostCookie);
      expect(after.body.data.status).toBe('ACTIVE');
    });

    it('should let only the host end the meeting', async () => {
      const code = (await createMeeting()).body.data.code;
      const guest = await registerUser(app, {
        email: 'guest2@example.com',
        password: 'secretpass1',
      });

      const forbidden = await http(app)
        .post(`/api/meetings/${code}/end`)
        .set('Cookie', guest.cookie);
      expect(forbidden.status).toBe(403);

      const ended = await http(app).post(`/api/meetings/${code}/end`).set('Cookie', hostCookie);
      expect(ended.body.success).toBe(true);
      expect(ended.body.data.status).toBe('ENDED');
    });
  });
});
