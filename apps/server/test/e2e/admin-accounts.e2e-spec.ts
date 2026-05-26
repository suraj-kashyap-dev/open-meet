import { createHash } from 'node:crypto';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AdminRole } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/prisma.service';

import { createTestApp, http, loginAdmin, resetDb, seedAdmin } from './setup-app';

const SUPER = {
  email: 'super@example.com',
  password: 'super-pass-1',
  name: 'Super',
  role: AdminRole.SUPERADMIN,
};
const REGULAR = {
  email: 'regular@example.com',
  password: 'regular-pass-1',
  name: 'Reg',
  role: AdminRole.ADMIN,
};

const RAW_TOKEN = 'test-raw-invite-token-abc123';
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');

describe('Admin accounts & invites (e2e)', () => {
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

  async function seedInvite(overrides: Record<string, unknown> = {}): Promise<void> {
    const prisma = app.get(PrismaService);
    await prisma.adminInvite.create({
      data: {
        email: 'invitee@example.com',
        name: 'Invitee',
        role: AdminRole.ADMIN,
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(Date.now() + 60_000),
        ...overrides,
      },
    });
  }

  describe('POST /api/admin/accounts', () => {
    it('should let a superadmin create an admin who can immediately sign in', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/accounts')
        .set('Cookie', cookie)
        .send({ email: 'direct@example.com', name: 'Direct Admin', password: 'direct-pass-1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('direct@example.com');
      expect(res.body.data.role).toBe('ADMIN');

      const list = await http(app).get('/api/admin/accounts').set('Cookie', cookie);
      expect(
        list.body.data.items.some((a: { email: string }) => a.email === 'direct@example.com'),
      ).toBe(true);

      const { res: loginRes } = await loginAdmin(app, {
        email: 'direct@example.com',
        password: 'direct-pass-1',
      });
      expect(loginRes.status).toBe(200);
    });

    it('should create a superadmin when role is SUPERADMIN', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).post('/api/admin/accounts').set('Cookie', cookie).send({
        email: 'boss@example.com',
        name: 'Boss',
        password: 'boss-pass-1',
        role: AdminRole.SUPERADMIN,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('SUPERADMIN');
    });

    it('should reject a regular admin with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .post('/api/admin/accounts')
        .set('Cookie', cookie)
        .send({ email: 'direct@example.com', name: 'Direct Admin', password: 'direct-pass-1' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should require an admin session', async () => {
      const res = await http(app)
        .post('/api/admin/accounts')
        .send({ email: 'direct@example.com', name: 'Direct Admin', password: 'direct-pass-1' });

      expect(res.status).toBe(401);
    });

    it('should reject a too-short password with 400', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/accounts')
        .set('Cookie', cookie)
        .send({ email: 'direct@example.com', name: 'Direct Admin', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('should conflict when the email already belongs to an admin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/accounts')
        .set('Cookie', cookie)
        .send({ email: REGULAR.email, name: 'Dup', password: 'dup-pass-12' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('POST /api/admin/accounts/invites', () => {
    it('should let a superadmin invite an admin and list it as pending', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/accounts/invites')
        .set('Cookie', cookie)
        .send({ email: 'new@example.com', name: 'New Admin' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('new@example.com');
      expect(res.body.data.status).toBe('PENDING');

      const list = await http(app).get('/api/admin/accounts/invites').set('Cookie', cookie);
      expect(list.status).toBe(200);
      expect(list.body.data.items).toHaveLength(1);
      expect(list.body.data.items[0].email).toBe('new@example.com');
    });

    it('should reject a regular admin with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .post('/api/admin/accounts/invites')
        .set('Cookie', cookie)
        .send({ email: 'new@example.com', name: 'New Admin' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should require an admin session', async () => {
      const res = await http(app)
        .post('/api/admin/accounts/invites')
        .send({ email: 'new@example.com', name: 'New Admin' });

      expect(res.status).toBe(401);
    });

    it('should return a localized error message when x-locale is set', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .post('/api/admin/accounts/invites')
        .set('Cookie', cookie)
        .set('x-locale', 'ar')
        .send({ email: 'new@example.com', name: 'New Admin' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toBe('صلاحيات المسؤول الرئيسي مطلوبة لهذا الإجراء');
    });

    it('should conflict when inviting an email that already belongs to an admin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post('/api/admin/accounts/invites')
        .set('Cookie', cookie)
        .send({ email: REGULAR.email, name: 'Dup' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('public invite lookup + accept', () => {
    it('should look up a valid invite by token', async () => {
      await seedInvite();

      const res = await http(app).get(`/api/admin/invite/${RAW_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('invitee@example.com');
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('should 404 an unknown token', async () => {
      const res = await http(app).get('/api/admin/invite/does-not-exist');
      expect(res.status).toBe(404);
    });

    it('should accept an invite, create the admin, consume the invite, and allow login', async () => {
      await seedInvite();

      const accept = await http(app)
        .post('/api/admin/invite/accept')
        .send({ token: RAW_TOKEN, password: 'invitee-pass-1' });

      expect(accept.status).toBe(200);
      expect(accept.body.data.email).toBe('invitee@example.com');

      // The invite is consumed — the link no longer resolves.
      const lookup = await http(app).get(`/api/admin/invite/${RAW_TOKEN}`);
      expect(lookup.status).toBe(404);

      // The new admin can now sign in with the password they chose.
      const { res } = await loginAdmin(app, {
        email: 'invitee@example.com',
        password: 'invitee-pass-1',
      });
      expect(res.status).toBe(200);
    });

    it('should reject an expired invite with TOKEN_INVALID', async () => {
      await seedInvite({ expiresAt: new Date(Date.now() - 1000) });

      const res = await http(app)
        .post('/api/admin/invite/accept')
        .send({ token: RAW_TOKEN, password: 'invitee-pass-1' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('PATCH /api/admin/accounts/:id', () => {
    it('should let a superadmin rename an admin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const prisma = app.get(PrismaService);
      const target = await prisma.admin.findUniqueOrThrow({ where: { email: REGULAR.email } });

      const res = await http(app)
        .patch(`/api/admin/accounts/${target.id}`)
        .set('Cookie', cookie)
        .send({ name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });

    it('should reject a regular admin with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);
      const prisma = app.get(PrismaService);
      const target = await prisma.admin.findUniqueOrThrow({ where: { email: SUPER.email } });

      const res = await http(app)
        .patch(`/api/admin/accounts/${target.id}`)
        .set('Cookie', cookie)
        .send({ name: 'Nope' });

      expect(res.status).toBe(403);
    });
  });
});
