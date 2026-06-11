import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, loginAdmin, resetDb, seedAdmin } from '../setup-app';

const SUPER = {
  email: 'super@example.com',
  password: 'super-pass-1',
  name: 'Super',
  roleRecordId: 'role_sys_admin',
};
const REGULAR = {
  email: 'regular@example.com',
  password: 'regular-pass-1',
  name: 'Reg',
  roleRecordId: 'role_sys_member',
};

describe('Admin configuration (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);

    await seedAdmin(app, SUPER);

    await seedAdmin(app, REGULAR);
  });

  describe('GET /api/admin/configuration', () => {
    it('should return the workspace configuration for a superadmin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/configuration').set('Cookie', cookie);

      expect(res.status).toBe(200);

      expect(res.body.success).toBe(true);

      expect(typeof res.body.data.defaultMeetingTitle).toBe('string');

      expect(typeof res.body.data.allowGuestJoin).toBe('boolean');

      expect(res.body.data).toHaveProperty('maxMeetingMinutes');
    });

    it('should reject a member lacking configuration.view with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app).get('/api/admin/configuration').set('Cookie', cookie);

      expect(res.status).toBe(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/configuration');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/admin/configuration', () => {
    it('should update a field and reflect it on the next GET', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const patch = await http(app).patch('/api/admin/configuration').set('Cookie', cookie).send({
        defaultMeetingTitle: 'Daily Standup',
        allowGuestJoin: false,
        maxMeetingMinutes: 90,
      });

      expect(patch.status).toBe(200);

      expect(patch.body.data.defaultMeetingTitle).toBe('Daily Standup');

      expect(patch.body.data.allowGuestJoin).toBe(false);

      expect(patch.body.data.maxMeetingMinutes).toBe(90);

      const get = await http(app).get('/api/admin/configuration').set('Cookie', cookie);

      expect(get.status).toBe(200);

      expect(get.body.data.defaultMeetingTitle).toBe('Daily Standup');

      expect(get.body.data.allowGuestJoin).toBe(false);

      expect(get.body.data.maxMeetingMinutes).toBe(90);
    });

    it('should reject an out-of-range maxMeetingMinutes with 400', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .patch('/api/admin/configuration')
        .set('Cookie', cookie)
        .send({ maxMeetingMinutes: 5000 });

      expect(res.status).toBe(400);
    });

    it('should reject a member lacking configuration.update with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .patch('/api/admin/configuration')
        .set('Cookie', cookie)
        .send({ defaultMeetingTitle: 'Nope' });

      expect(res.status).toBe(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should require an admin session', async () => {
      const res = await http(app)
        .patch('/api/admin/configuration')
        .send({ defaultMeetingTitle: 'Nope' });

      expect(res.status).toBe(401);
    });
  });
});
