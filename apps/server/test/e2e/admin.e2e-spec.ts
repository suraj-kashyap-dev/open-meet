import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, loginAdmin, resetDb, seedAdmin } from './setup-app';

const ADMIN = { email: 'root@example.com', password: 'admin-pass-1', name: 'Root' };

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
});
