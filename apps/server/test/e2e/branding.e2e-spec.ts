import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, loginAdmin, resetDb, seedAdmin } from './setup-app';

const ADMIN = {
  email: 'brand-admin@example.com',
  password: 'brand-pass-1',
  name: 'Brand Admin',
  roleRecordId: 'role_sys_admin',
};

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Branding & public config (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    await seedAdmin(app, ADMIN);
  });

  describe('GET /api/config/public', () => {
    it('should return default branding without authentication', async () => {
      const res = await http(app).get('/api/config/public');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appName).toBe('Open Meet');
      expect(res.body.data.logoUrl).toBeNull();
    });
  });

  describe('PATCH /api/admin/branding', () => {
    it('should reject unauthenticated updates', async () => {
      const res = await http(app).patch('/api/admin/branding').send({ appName: 'Hacked' });

      expect(res.status).toBe(401);
    });

    it('should update the app name and reflect it in the public config', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/branding')
        .set('Cookie', cookie)
        .send({ appName: 'Acme Meet' });

      expect(res.status).toBe(200);
      expect(res.body.data.appName).toBe('Acme Meet');

      const pub = await http(app).get('/api/config/public');
      expect(pub.body.data.appName).toBe('Acme Meet');
    });

    it('should reject an empty app name via validation', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/branding')
        .set('Cookie', cookie)
        .send({ appName: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/branding/logo', () => {
    it('should upload a logo and expose its URL in the public config', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .post('/api/admin/branding/logo')
        .set('Cookie', cookie)
        .attach('file', PNG_1x1, { filename: 'logo.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.data.logoUrl).toMatch(/\/api\/uploads\/public\/branding\/logo_/);

      const pub = await http(app).get('/api/config/public');
      expect(pub.body.data.logoUrl).toBe(res.body.data.logoUrl);
    });

    it('should reject a non-image upload', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .post('/api/admin/branding/logo')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('not an image'), {
          filename: 'note.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/branding/logo', () => {
    it('should remove a previously uploaded logo', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      await http(app)
        .post('/api/admin/branding/logo')
        .set('Cookie', cookie)
        .attach('file', PNG_1x1, { filename: 'logo.png', contentType: 'image/png' });

      const res = await http(app).delete('/api/admin/branding/logo').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.logoUrl).toBeNull();
    });
  });

  describe('GET /api/admin/configuration', () => {
    it('should return default workspace configuration for an admin', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app).get('/api/admin/configuration').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        defaultMeetingTitle: 'Untitled meeting',
        allowGuestJoin: true,
        maxMeetingMinutes: null,
      });
    });

    it('should require authentication', async () => {
      const res = await http(app).get('/api/admin/configuration');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/admin/configuration', () => {
    it('should persist updated workspace configuration', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app).patch('/api/admin/configuration').set('Cookie', cookie).send({
        defaultMeetingTitle: 'Department Sync',
        allowGuestJoin: false,
        maxMeetingMinutes: 90,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        defaultMeetingTitle: 'Department Sync',
        allowGuestJoin: false,
        maxMeetingMinutes: 90,
      });

      const reread = await http(app).get('/api/admin/configuration').set('Cookie', cookie);
      expect(reread.body.data.defaultMeetingTitle).toBe('Department Sync');
    });

    it('should accept null to clear the meeting duration cap', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/configuration')
        .set('Cookie', cookie)
        .send({ maxMeetingMinutes: null });

      expect(res.status).toBe(200);
      expect(res.body.data.maxMeetingMinutes).toBeNull();
    });

    it('should reject an out-of-range duration cap', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/configuration')
        .set('Cookie', cookie)
        .send({ maxMeetingMinutes: 1 });

      expect(res.status).toBe(400);
    });
  });
});
