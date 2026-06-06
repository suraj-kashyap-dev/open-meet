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

describe('Admin meetings (e2e)', () => {
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

  async function seedMeeting(
    overrides: { code?: string; status?: 'WAITING' | 'ACTIVE' | 'ENDED'; title?: string } = {},
  ): Promise<{ meetingId: string; hostId: string; guestId: string; code: string }> {
    const prisma = app.get(PrismaService);

    const { user: host } = await registerUser(app, {
      email: `host-${overrides.code ?? 'm'}@example.com`,
      password: 'host-pass-1',
      name: 'Host',
    });
    const { user: guest } = await registerUser(app, {
      email: `guest-${overrides.code ?? 'm'}@example.com`,
      password: 'guest-pass-1',
      name: 'Guest',
    });

    const code = overrides.code ?? 'abc-defg-hij';
    const status = overrides.status ?? 'ACTIVE';

    const meeting = await prisma.meeting.create({
      data: {
        code,
        title: overrides.title ?? 'Seeded Meeting',
        hostId: host!.id,
        status,
        startedAt: new Date(Date.now() - 60_000),
        participants: {
          create: [
            { userId: host!.id, role: 'HOST' },
            { userId: guest!.id, role: 'GUEST' },
          ],
        },
      },
    });

    return { meetingId: meeting.id, hostId: host!.id, guestId: guest!.id, code };
  }

  describe('GET /api/admin/meetings/datagrid', () => {
    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/meetings/datagrid');
      expect(res.status).toBe(401);
    });

    it('should return the datagrid schema and rows', async () => {
      await seedMeeting({ code: 'list-mtg-001' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/meetings/datagrid').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource).toBe('meetings');
      expect(Array.isArray(res.body.data.columns)).toBe(true);
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.rows).toHaveLength(1);
      expect(res.body.data.rows[0].code).toBe('list-mtg-001');
    });
  });

  describe('GET /api/admin/meetings/:id', () => {
    it('should return a single meeting with its participants', async () => {
      const { meetingId } = await seedMeeting({ code: 'detail-mtg-001' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get(`/api/admin/meetings/${meetingId}`).set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(meetingId);
      expect(res.body.data.participants).toHaveLength(2);
      expect(res.body.data.participantCount).toBe(2);
    });

    it('should 404 an unknown meeting', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app).get('/api/admin/meetings/does-not-exist').set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MEETING_NOT_FOUND');
    });
  });

  describe('POST /api/admin/meetings/:id/end', () => {
    it('should reject a regular admin lacking meetings.force-end with 403', async () => {
      const { meetingId } = await seedMeeting({ code: 'forbid-end-001' });
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app)
        .post(`/api/admin/meetings/${meetingId}/end`)
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should force-end an active meeting', async () => {
      const { meetingId } = await seedMeeting({ code: 'end-mtg-001', status: 'ACTIVE' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post(`/api/admin/meetings/${meetingId}/end`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ENDED');

      const prisma = app.get(PrismaService);
      const persisted = await prisma.meeting.findUnique({ where: { id: meetingId } });
      expect(persisted!.status).toBe('ENDED');
      expect(persisted!.endedAt).not.toBeNull();
    });

    it('should 404 when ending an unknown meeting', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app)
        .post('/api/admin/meetings/does-not-exist/end')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/meetings/end-all-active', () => {
    it('should end every active meeting', async () => {
      await seedMeeting({ code: 'bulk-active-1', status: 'ACTIVE' });
      await seedMeeting({ code: 'bulk-active-2', status: 'ACTIVE' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).post('/api/admin/meetings/end-all-active').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.ended).toBe(2);

      const prisma = app.get(PrismaService);
      const active = await prisma.meeting.count({ where: { status: 'ACTIVE' } });
      expect(active).toBe(0);
    });
  });

  describe('POST /api/admin/meetings/:id/participants/:userId/kick', () => {
    it('should kick a participant', async () => {
      const { meetingId, guestId } = await seedMeeting({ code: 'kick-mtg-001' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post(`/api/admin/meetings/${meetingId}/participants/${guestId}/kick`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.kicked).toBe(true);

      const prisma = app.get(PrismaService);
      const participant = await prisma.participant.findUnique({
        where: { meetingId_userId: { meetingId, userId: guestId } },
      });
      expect(participant!.leftAt).not.toBeNull();
    });

    it('should 404 when the participant is not in the meeting', async () => {
      const { meetingId } = await seedMeeting({ code: 'kick-mtg-404' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app)
        .post(`/api/admin/meetings/${meetingId}/participants/not-a-member/kick`)
        .set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/admin/meetings/:id', () => {
    it('should hard-delete a meeting and cascade participants', async () => {
      const { meetingId } = await seedMeeting({ code: 'del-mtg-001' });
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).delete(`/api/admin/meetings/${meetingId}`).set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const prisma = app.get(PrismaService);
      const persisted = await prisma.meeting.findUnique({ where: { id: meetingId } });
      expect(persisted).toBeNull();
      const participants = await prisma.participant.count({ where: { meetingId } });
      expect(participants).toBe(0);
    });

    it('should 404 when deleting an unknown meeting', async () => {
      const { cookie } = await loginAdmin(app, SUPER);
      const res = await http(app)
        .delete('/api/admin/meetings/does-not-exist')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });
});
