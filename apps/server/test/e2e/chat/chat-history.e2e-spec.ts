import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '@/database/services/prisma.service';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

describe('Meeting chat history (e2e)', () => {
  let app: NestFastifyApplication;
  let host: { id: string; cookie: string };
  let outsider: { id: string; cookie: string };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    const h = await registerUser(app, { email: 'host@example.com', password: 'secretpass1' });
    const o = await registerUser(app, { email: 'outsider@example.com', password: 'secretpass1' });
    host = { id: h.user!.id, cookie: h.cookie };
    outsider = { id: o.user!.id, cookie: o.cookie };
  });

  async function createMeeting(): Promise<{ id: string; code: string }> {
    const res = await http(app).post('/api/meetings').set('Cookie', host.cookie).send({});
    return { id: res.body.data.id as string, code: res.body.data.code as string };
  }

  async function seedMessage(meetingId: string, senderId: string, content: string, sentAt: Date) {
    await app.get(PrismaService).message.create({
      data: { meetingId, senderId, content, sentAt },
    });
  }

  function history(cookie: string, code: string) {
    return http(app).get(`/api/meetings/${code}/messages`).set('Cookie', cookie);
  }

  describe('GET /api/meetings/:code/messages', () => {
    it('should return the seeded messages oldest-first for the host participant', async () => {
      const meeting = await createMeeting();
      await seedMessage(meeting.id, host.id, 'first', new Date('2026-01-01T00:00:00.000Z'));
      await seedMessage(meeting.id, host.id, 'second', new Date('2026-01-01T00:01:00.000Z'));

      const res = await history(host.cookie, meeting.code);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect((res.body.data.items as { content: string }[]).map((m) => m.content)).toEqual([
        'first',
        'second',
      ]);
      expect(res.body.data.nextCursor).toBeNull();
    });

    it('should return an empty page with a null cursor when there are no messages', async () => {
      const meeting = await createMeeting();

      const res = await history(host.cookie, meeting.code);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.nextCursor).toBeNull();
    });

    it('should forbid a non-participant with MEETING_FORBIDDEN', async () => {
      const meeting = await createMeeting();
      await seedMessage(meeting.id, host.id, 'secret', new Date('2026-01-01T00:00:00.000Z'));

      const res = await history(outsider.cookie, meeting.code);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MEETING_FORBIDDEN');
    });

    it('should return 404 MEETING_NOT_FOUND for an unknown meeting code', async () => {
      const res = await history(host.cookie, 'zzzz-zzzz-zzzz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MEETING_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const meeting = await createMeeting();
      const res = await http(app).get(`/api/meetings/${meeting.code}/messages`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
