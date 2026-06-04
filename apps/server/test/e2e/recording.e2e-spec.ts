import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from './setup-app';

describe('Recording (e2e)', () => {
  let app: NestFastifyApplication;
  let hostCookie: string;
  let code: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    hostCookie = (await registerUser(app, { email: 'host@example.com', password: 'secretpass1' }))
      .cookie;
    code = (await http(app).post('/api/meetings').set('Cookie', hostCookie).send({})).body.data
      .code;
  });

  describe('POST /api/meetings/:code/recording/start', () => {
    it('should reject a non-host with 403', async () => {
      const guest = await registerUser(app, {
        email: 'guest@example.com',
        password: 'secretpass1',
      });
      const res = await http(app)
        .post(`/api/meetings/${code}/recording/start`)
        .set('Cookie', guest.cookie);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject the host with 400 while the meeting is still WAITING (not active)', async () => {
      const res = await http(app)
        .post(`/api/meetings/${code}/recording/start`)
        .set('Cookie', hostCookie);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await http(app).post(`/api/meetings/${code}/recording/start`);
      expect(res.status).toBe(401);
    });
  });
});
