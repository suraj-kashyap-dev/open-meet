import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/services/prisma.service';

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

describe('Admin groups (e2e)', () => {
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

  async function seedTwoUsers(): Promise<{ a: string; b: string }> {
    const { user: a } = await registerUser(app, {
      email: 'member-a@example.com',
      password: 'member-a-pass',
      name: 'Member A',
    });
    const { user: b } = await registerUser(app, {
      email: 'member-b@example.com',
      password: 'member-b-pass',
      name: 'Member B',
    });
    return { a: a!.id, b: b!.id };
  }

  describe('GET /api/admin/groups/datagrid', () => {
    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/groups/datagrid');
      expect(res.status).toBe(401);
    });

    it('should return the datagrid schema and rows for a superadmin', async () => {
      const { a, b } = await seedTwoUsers();
      const { cookie } = await loginAdmin(app, SUPER);

      await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Listed Group', memberIds: [a, b] });

      const res = await http(app).get('/api/admin/groups/datagrid').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource).toBe('groups');
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.rows).toHaveLength(1);
      expect(res.body.data.rows[0].title).toBe('Listed Group');
      expect(res.body.data.rows[0].memberCount).toBe(2);
    });
  });

  describe('POST /api/admin/groups', () => {
    it('should require an admin session', async () => {
      const res = await http(app)
        .post('/api/admin/groups')
        .send({ title: 'No Auth', memberIds: ['x'] });
      expect(res.status).toBe(401);
    });

    it('should reject a regular admin lacking groups.create with 403', async () => {
      const { a, b } = await seedTwoUsers();
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Forbidden Group', memberIds: [a, b] });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should create a group and persist it with members', async () => {
      const { a, b } = await seedTwoUsers();
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Created Group', memberIds: [a, b] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Created Group');
      expect(res.body.data.members).toHaveLength(2);
      expect(res.body.data.id).toBeTruthy();

      const prisma = app.get(PrismaService);
      const persisted = await prisma.conversation.findUnique({
        where: { id: res.body.data.id },
        include: { members: true },
      });
      expect(persisted).not.toBeNull();
      expect(persisted!.type).toBe('GROUP');
      expect(persisted!.members).toHaveLength(2);
    });
  });

  describe('GET /api/admin/groups/:id', () => {
    it('should return a group with its members', async () => {
      const { a, b } = await seedTwoUsers();
      const { cookie } = await loginAdmin(app, SUPER);

      const created = await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Detail Group', memberIds: [a, b] });

      const res = await http(app)
        .get(`/api/admin/groups/${created.body.data.id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(created.body.data.id);
      expect(res.body.data.members).toHaveLength(2);
    });

    it('should 404 an unknown group', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).get('/api/admin/groups/does-not-exist').set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/admin/groups/:id', () => {
    it('should rename a group', async () => {
      const { a, b } = await seedTwoUsers();
      const { cookie } = await loginAdmin(app, SUPER);

      const created = await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Old Name', memberIds: [a, b] });

      const res = await http(app)
        .patch(`/api/admin/groups/${created.body.data.id}`)
        .set('Cookie', cookie)
        .send({ title: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New Name');
    });

    it('should 404 when renaming an unknown group', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app)
        .patch('/api/admin/groups/does-not-exist')
        .set('Cookie', cookie)
        .send({ title: 'Nope' });

      expect(res.status).toBe(404);
    });
  });

  describe('group membership', () => {
    it('should add and remove members', async () => {
      const { a, b } = await seedTwoUsers();
      const { user: c } = await registerUser(app, {
        email: 'member-c@example.com',
        password: 'member-c-pass',
        name: 'Member C',
      });
      const { cookie } = await loginAdmin(app, SUPER);

      const created = await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Members Group', memberIds: [a, b] });
      const groupId = created.body.data.id;

      const added = await http(app)
        .post(`/api/admin/groups/${groupId}/members`)
        .set('Cookie', cookie)
        .send({ userIds: [c!.id] });

      expect(added.status).toBe(201);
      expect(added.body.data.members).toHaveLength(3);

      const removed = await http(app)
        .delete(`/api/admin/groups/${groupId}/members/${c!.id}`)
        .set('Cookie', cookie);

      expect(removed.status).toBe(200);
      expect(removed.body.data.removed).toBe(true);

      const detail = await http(app).get(`/api/admin/groups/${groupId}`).set('Cookie', cookie);
      expect(detail.body.data.members).toHaveLength(2);
    });
  });

  describe('DELETE /api/admin/groups/:id', () => {
    it('should delete a group and persist the removal', async () => {
      const { a, b } = await seedTwoUsers();
      const { cookie } = await loginAdmin(app, SUPER);

      const created = await http(app)
        .post('/api/admin/groups')
        .set('Cookie', cookie)
        .send({ title: 'Doomed Group', memberIds: [a, b] });
      const groupId = created.body.data.id;

      const res = await http(app).delete(`/api/admin/groups/${groupId}`).set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const prisma = app.get(PrismaService);
      const persisted = await prisma.conversation.findUnique({ where: { id: groupId } });
      expect(persisted).toBeNull();
    });

    it('should 404 when deleting an unknown group', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).delete('/api/admin/groups/does-not-exist').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });
});
