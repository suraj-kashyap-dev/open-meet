import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/prisma.service';

import { createTestApp, http, loginAdmin, registerUser, resetDb, seedAdmin } from '../setup-app';

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

describe('Admin users (e2e)', () => {
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

  describe('GET /api/admin/users', () => {
    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('should return a paginated list of users for a superadmin', async () => {
      await registerUser(app, {
        email: 'alice@example.com',
        password: 'alice-pass-1',
        name: 'Alice',
      });
      await registerUser(app, { email: 'bob@example.com', password: 'bob-pass-1', name: 'Bob' });

      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).get('/api/admin/users').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.page).toBe(1);
      expect(
        res.body.data.items.some((u: { email: string }) => u.email === 'alice@example.com'),
      ).toBe(true);
    });

    it('should let a regular admin with users.view list users', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);
      const res = await http(app).get('/api/admin/users').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should require an admin session', async () => {
      const res = await http(app)
        .post('/api/admin/users')
        .send({ name: 'New', email: 'new@example.com', password: 'newpass-12' });
      expect(res.status).toBe(401);
    });

    it('should reject a regular admin lacking users.create with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);
      const res = await http(app)
        .post('/api/admin/users')
        .set('Cookie', cookie)
        .send({ name: 'New', email: 'new@example.com', password: 'newpass-12' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should create a user and persist it', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).post('/api/admin/users').set('Cookie', cookie).send({
        name: 'Created User',
        email: 'created@example.com',
        password: 'created-pass-1',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('created@example.com');
      expect(res.body.data.name).toBe('Created User');
      expect(res.body.data.id).toBeTruthy();

      const prisma = app.get(PrismaService);
      const persisted = await prisma.user.findUnique({ where: { email: 'created@example.com' } });
      expect(persisted).not.toBeNull();
    });

    it('should conflict when the email already belongs to a user', async () => {
      await registerUser(app, { email: 'dup@example.com', password: 'dup-pass-1', name: 'Dup' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).post('/api/admin/users').set('Cookie', cookie).send({
        name: 'Dup Two',
        email: 'dup@example.com',
        password: 'dup-pass-12',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('should reject a too-short password with 400', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).post('/api/admin/users').set('Cookie', cookie).send({
        name: 'Short',
        email: 'short@example.com',
        password: 'short',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should fetch a single user', async () => {
      const { user } = await registerUser(app, {
        email: 'single@example.com',
        password: 'single-pass-1',
        name: 'Single',
      });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get(`/api/admin/users/${user!.id}`).set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user!.id);
      expect(res.body.data.email).toBe('single@example.com');
    });

    it('should 404 an unknown user', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).get('/api/admin/users/does-not-exist').set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('should update a user', async () => {
      const { user } = await registerUser(app, {
        email: 'patch@example.com',
        password: 'patch-pass-1',
        name: 'Before',
      });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .patch(`/api/admin/users/${user!.id}`)
        .set('Cookie', cookie)
        .send({ name: 'After' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('After');
    });

    it('should 404 when updating an unknown user', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app)
        .patch('/api/admin/users/does-not-exist')
        .set('Cookie', cookie)
        .send({ name: 'Nope' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user and persist the removal', async () => {
      const { user } = await registerUser(app, {
        email: 'delete@example.com',
        password: 'delete-pass-1',
        name: 'Delete Me',
      });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).delete(`/api/admin/users/${user!.id}`).set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const prisma = app.get(PrismaService);
      const persisted = await prisma.user.findUnique({ where: { id: user!.id } });
      expect(persisted).toBeNull();
    });

    it('should 404 when deleting an unknown user', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).delete('/api/admin/users/does-not-exist').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  describe('user invites', () => {
    it('should create an invite and list it', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const create = await http(app)
        .post('/api/admin/users/invite')
        .set('Cookie', cookie)
        .send({ email: 'invitee@example.com', name: 'Invitee' });

      expect(create.status).toBe(201);
      expect(create.body.data.email).toBe('invitee@example.com');

      const list = await http(app).get('/api/admin/users/invites').set('Cookie', cookie);
      expect(list.status).toBe(200);
      expect(
        list.body.data.items.some((i: { email: string }) => i.email === 'invitee@example.com'),
      ).toBe(true);
    });

    it('should reject a regular admin lacking users.invite with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);
      const res = await http(app)
        .post('/api/admin/users/invite')
        .set('Cookie', cookie)
        .send({ email: 'invitee@example.com', name: 'Invitee' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
