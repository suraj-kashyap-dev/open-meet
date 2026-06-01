import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '@/database/prisma.service';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from './setup-app';

describe('Meetings (e2e)', () => {
  let app: NestFastifyApplication;
  let hostCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    const host = await registerUser(app, { email: 'host@example.com', password: 'secretpass1' });
    hostCookie = host.cookie;
  });

  async function createMeeting(cookie = hostCookie, title?: string) {
    return http(app)
      .post('/api/meetings')
      .set('Cookie', cookie)
      .send(title ? { title } : {});
  }

  describe('POST /api/meetings', () => {
    it('should create a WAITING meeting owned by the caller with a valid code', async () => {
      const res = await createMeeting(hostCookie, 'Weekly sync');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('WAITING');
      expect(res.body.data.title).toBe('Weekly sync');
      expect(res.body.data.code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    });

    it('should apply the workspace default title when the request title is blank', async () => {
      const prisma = app.get(PrismaService);

      await prisma.workspaceSettings.upsert({
        where: { id: 'default' },
        update: { defaultMeetingTitle: 'Department Sync' },
        create: { id: 'default', defaultMeetingTitle: 'Department Sync' },
      });

      const res = await http(app)
        .post('/api/meetings')
        .set('Cookie', hostCookie)
        .send({ title: '   ' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Department Sync');
    });

    it('should require authentication', async () => {
      const res = await http(app).post('/api/meetings').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/meetings/schedule', () => {
    it('should apply the workspace default title when scheduling without one', async () => {
      const prisma = app.get(PrismaService);

      await prisma.workspaceSettings.upsert({
        where: { id: 'default' },
        update: { defaultMeetingTitle: 'Department Sync' },
        create: { id: 'default', defaultMeetingTitle: 'Department Sync' },
      });

      const res = await http(app)
        .post('/api/meetings/schedule')
        .set('Cookie', hostCookie)
        .send({
          scheduledFor: '2099-06-01T10:00:00.000Z',
          durationMin: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Department Sync');
      expect(res.body.data.scheduledFor).toBe('2099-06-01T10:00:00.000Z');
    });

    it('should clamp scheduled duration to the workspace meeting limit', async () => {
      const prisma = app.get(PrismaService);

      await prisma.workspaceSettings.upsert({
        where: { id: 'default' },
        update: { maxMeetingMinutes: 20 },
        create: { id: 'default', maxMeetingMinutes: 20 },
      });

      const res = await http(app)
        .post('/api/meetings/schedule')
        .set('Cookie', hostCookie)
        .send({
          title: 'Planning',
          scheduledFor: '2099-06-01T10:00:00.000Z',
          durationMin: 45,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.durationMin).toBe(20);
    });

    it('should create separate upcoming occurrences for a recurring schedule', async () => {
      const recurrence = 'FREQ=WEEKLY;COUNT=3';

      const scheduled = await http(app)
        .post('/api/meetings/schedule')
        .set('Cookie', hostCookie)
        .send({
          title: 'Planning',
          scheduledFor: '2099-06-01T10:00:00.000Z',
          durationMin: 30,
          recurrence,
        });

      expect(scheduled.status).toBe(201);
      expect(scheduled.body.data.recurrence).toBe(recurrence);

      const upcoming = await http(app).get('/api/meetings/upcoming').set('Cookie', hostCookie);

      expect(upcoming.status).toBe(200);
      expect(upcoming.body.data).toHaveLength(3);
      expect(upcoming.body.data.map((item: { scheduledFor: string }) => item.scheduledFor)).toEqual([
        '2099-06-01T10:00:00.000Z',
        '2099-06-08T10:00:00.000Z',
        '2099-06-15T10:00:00.000Z',
      ]);
    });
  });

  describe('GET /api/meetings/:code', () => {
    it('should return the meeting by code', async () => {
      const created = await createMeeting();
      const code = created.body.data.code;
      const res = await http(app).get(`/api/meetings/${code}`);
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(code);
    });

    it('should 404 an unknown code', async () => {
      const res = await http(app).get('/api/meetings/zzzz-zzzz-zzzz');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MEETING_NOT_FOUND');
    });
  });

  describe('POST /api/meetings/:code/guest-session', () => {
    it('should issue a guest token that can join the meeting without an account', async () => {
      const code = (await createMeeting()).body.data.code;

      const guestSession = await http(app)
        .post(`/api/meetings/${code}/guest-session`)
        .send({ name: 'External guest' });

      expect(guestSession.status).toBe(200);
      expect(guestSession.body.data.user.name).toBe('External guest');
      expect(typeof guestSession.body.data.token).toBe('string');

      const joinRes = await http(app)
        .post(`/api/meetings/${code}/join`)
        .set('Authorization', `Bearer ${guestSession.body.data.token}`);

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.data.participant.name).toBe('External guest');
    });

    it('should reject guest sessions when the workspace disables guest join', async () => {
      const code = (await createMeeting()).body.data.code;
      const prisma = app.get(PrismaService);

      await prisma.workspaceSettings.upsert({
        where: { id: 'default' },
        update: { allowGuestJoin: false },
        create: { id: 'default', allowGuestJoin: false },
      });

      const res = await http(app)
        .post(`/api/meetings/${code}/guest-session`)
        .send({ name: 'Blocked guest' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('join + end lifecycle', () => {
    it('should transition the meeting to ACTIVE when a guest joins', async () => {
      const code = (await createMeeting()).body.data.code;
      const guest = await registerUser(app, {
        email: 'guest@example.com',
        password: 'secretpass1',
      });

      const joinRes = await http(app)
        .post(`/api/meetings/${code}/join`)
        .set('Cookie', guest.cookie);
      expect(joinRes.body.success).toBe(true);

      const after = await http(app).get(`/api/meetings/${code}`).set('Cookie', hostCookie);
      expect(after.body.data.status).toBe('ACTIVE');
    });

    it('should let only the host end the meeting', async () => {
      const code = (await createMeeting()).body.data.code;
      const guest = await registerUser(app, {
        email: 'guest2@example.com',
        password: 'secretpass1',
      });

      const forbidden = await http(app)
        .post(`/api/meetings/${code}/end`)
        .set('Cookie', guest.cookie);
      expect(forbidden.status).toBe(403);

      const ended = await http(app).post(`/api/meetings/${code}/end`).set('Cookie', hostCookie);
      expect(ended.body.success).toBe(true);
      expect(ended.body.data.status).toBe('ENDED');
    });

    it('should reject joins after the workspace time limit has been exceeded', async () => {
      const prisma = app.get(PrismaService);
      const code = (await createMeeting()).body.data.code;
      const guest = await registerUser(app, {
        email: 'guest3@example.com',
        password: 'secretpass1',
      });

      await prisma.workspaceSettings.upsert({
        where: { id: 'default' },
        update: { maxMeetingMinutes: 30 },
        create: { id: 'default', maxMeetingMinutes: 30 },
      });

      await prisma.meeting.update({
        where: { code },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(Date.now() - 31 * 60_000),
        },
      });

      const joinRes = await http(app)
        .post(`/api/meetings/${code}/join`)
        .set('Cookie', guest.cookie);

      expect(joinRes.status).toBe(403);
      expect(joinRes.body.error.code).toBe('MEETING_ENDED');

      const meeting = await prisma.meeting.findUnique({ where: { code } });
      expect(meeting?.status).toBe('ENDED');
    });
  });

  describe('GET /api/meetings/history', () => {
    it('should exclude future scheduled meetings that have not started yet', async () => {
      const scheduled = await http(app)
        .post('/api/meetings/schedule')
        .set('Cookie', hostCookie)
        .send({
          title: 'Roadmap',
          scheduledFor: '2099-06-01T10:00:00.000Z',
          durationMin: 30,
          recurrence: 'FREQ=WEEKLY;COUNT=2',
        });

      expect(scheduled.status).toBe(201);

      const history = await http(app).get('/api/meetings/history').set('Cookie', hostCookie);

      expect(history.status).toBe(200);
      expect(history.body.data.items).toEqual([]);
      expect(history.body.data.total).toBe(0);
    });
  });
});
