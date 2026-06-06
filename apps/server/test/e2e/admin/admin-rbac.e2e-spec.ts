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

describe('Admin RBAC roles & permissions (e2e)', () => {
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

  describe('GET /api/admin/roles', () => {
    it('should list the seeded system roles for a superadmin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/roles').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      const ids = res.body.data.items.map((r: { id: string }) => r.id);
      expect(ids).toContain('role_sys_admin');
      expect(ids).toContain('role_sys_member');

      const adminRole = res.body.data.items.find((r: { id: string }) => r.id === 'role_sys_admin');
      expect(adminRole.isSystem).toBe(true);
      expect(adminRole.permissionType).toBe('ALL');
    });

    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/roles');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/roles/:id', () => {
    it('should fetch a single role by id', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/roles/role_sys_member').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('role_sys_member');
      expect(res.body.data.permissionType).toBe('CUSTOM');
    });

    it('should 404 an unknown role id', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/roles/does-not-exist').set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ROLE_NOT_FOUND');
    });
  });

  describe('GET /api/admin/permissions/catalog', () => {
    it('should return the permission tree and flat keys', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/permissions/catalog').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.tree)).toBe(true);
      expect(Array.isArray(res.body.data.keys)).toBe(true);
      expect(res.body.data.keys).toContain('roles.view');
      expect(res.body.data.keys).toContain('analytics.view-deep');

      const topKeys = res.body.data.tree.map((n: { key: string }) => n.key);
      expect(topKeys).toContain('roles');
      expect(topKeys).toContain('analytics');
    });

    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/permissions/catalog');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/admin/roles', () => {
    it('should let a superadmin create a custom role that persists', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/roles')
        .set('Cookie', cookie)
        .send({
          name: 'Support Lead',
          description: 'Handles support',
          permissionType: 'CUSTOM',
          permissions: ['users.view', 'analytics.view'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Support Lead');
      expect(res.body.data.isSystem).toBe(false);
      expect(res.body.data.permissionType).toBe('CUSTOM');
      expect(res.body.data.permissions).toContain('users.view');
      expect(res.body.data.permissions).toContain('analytics.view');
      expect(res.body.data.memberCount).toBe(0);

      const created = await http(app)
        .get(`/api/admin/roles/${res.body.data.id}`)
        .set('Cookie', cookie);
      expect(created.status).toBe(200);
      expect(created.body.data.name).toBe('Support Lead');
    });

    it('should reject a regular admin with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .post('/api/admin/roles')
        .set('Cookie', cookie)
        .send({ name: 'Nope', permissionType: 'CUSTOM', permissions: [] });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should require an admin session', async () => {
      const res = await http(app)
        .post('/api/admin/roles')
        .send({ name: 'Nope', permissionType: 'CUSTOM', permissions: [] });

      expect(res.status).toBe(401);
    });

    it('should reject an empty name with 400', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/roles')
        .set('Cookie', cookie)
        .send({ name: '', permissionType: 'CUSTOM', permissions: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('system role immutability', () => {
    it('should reject updating a system role', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .patch('/api/admin/roles/role_sys_admin')
        .set('Cookie', cookie)
        .send({ description: 'changed' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_IS_SYSTEM');
    });

    it('should reject deleting a system role', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).delete('/api/admin/roles/role_sys_admin').set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_IS_SYSTEM');
    });
  });

  describe('custom role update + delete', () => {
    it('should let a superadmin rename and delete an empty custom role', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const created = await http(app)
        .post('/api/admin/roles')
        .set('Cookie', cookie)
        .send({ name: 'Temp Role', permissionType: 'CUSTOM', permissions: ['users.view'] });
      expect(created.status).toBe(201);
      const id = created.body.data.id;

      const renamed = await http(app)
        .patch(`/api/admin/roles/${id}`)
        .set('Cookie', cookie)
        .send({ name: 'Temp Renamed' });
      expect(renamed.status).toBe(200);
      expect(renamed.body.data.name).toBe('Temp Renamed');

      const removed = await http(app).delete(`/api/admin/roles/${id}`).set('Cookie', cookie);
      expect(removed.status).toBe(200);
      expect(removed.body.data.deleted).toBe(true);

      const gone = await http(app).get(`/api/admin/roles/${id}`).set('Cookie', cookie);
      expect(gone.status).toBe(404);
    });
  });
});
