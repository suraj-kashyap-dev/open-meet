import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, loginAdmin, resetDb, seedAdmin } from './setup-app';

const ADMIN = { email: 'root@example.com', password: 'admin-pass-1', name: 'Root' };

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Admin (e2e)', () => {
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

  describe('POST /api/admin/auth/login', () => {
    it('should authenticate a seeded admin and set the admin session cookie', async () => {
      const { res, cookie } = await loginAdmin(app, ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.email).toBe(ADMIN.email);
      expect(cookie).toContain('admin_access_token=');
    });

    it('should reject a wrong password with 401', async () => {
      const { res } = await loginAdmin(app, { ...ADMIN, password: 'nope' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should list users for an authenticated admin', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);
      const res = await http(app).get('/api/admin/users').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should reject access without an admin session', async () => {
      const res = await http(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/admin/auth/me', () => {
    it('should let the authenticated admin rename themselves', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/auth/me')
        .set('Cookie', cookie)
        .send({ name: 'Renamed Root' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Root');

      const me = await http(app).get('/api/admin/auth/me').set('Cookie', cookie);
      expect(me.body.data.admin.name).toBe('Renamed Root');
      expect(me.body.data.role?.permissionType).toBe('ALL');
      expect(Array.isArray(me.body.data.grantedSet)).toBe(true);
    });

    it('should require an admin session', async () => {
      const res = await http(app).patch('/api/admin/auth/me').send({ name: 'X' });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/admin/auth/me/password', () => {
    it('should change the password when the current one is correct', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/auth/me/password')
        .set('Cookie', cookie)
        .send({ currentPassword: ADMIN.password, newPassword: 'brand-new-pass-1' });

      expect(res.status).toBe(200);
      expect(res.body.data.changed).toBe(true);

      const oldLogin = await loginAdmin(app, ADMIN);
      expect(oldLogin.res.status).toBe(401);
      const newLogin = await loginAdmin(app, { ...ADMIN, password: 'brand-new-pass-1' });
      expect(newLogin.res.status).toBe(200);
    });

    it('should reject a wrong current password with 400', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .patch('/api/admin/auth/me/password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'wrong-pass', newPassword: 'brand-new-pass-1' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('admin self avatar', () => {
    it('should upload then remove the authenticated admin avatar', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const upload = await http(app)
        .post('/api/admin/auth/me/avatar')
        .set('Cookie', cookie)
        .attach('file', PNG_1x1, { filename: 'me.png', contentType: 'image/png' });

      expect(upload.status).toBe(201);
      expect(upload.body.data.avatar).toMatch(/\/api\/uploads\/public\/avatars\/admins\//);

      const removed = await http(app).delete('/api/admin/auth/me/avatar').set('Cookie', cookie);
      expect(removed.status).toBe(200);
      expect(removed.body.data.avatar).toBeNull();
    });

    it('should reject a non-image upload with 415', async () => {
      const { cookie } = await loginAdmin(app, ADMIN);

      const res = await http(app)
        .post('/api/admin/auth/me/avatar')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('not an image'), {
          filename: 'note.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(415);
    });
  });
});
