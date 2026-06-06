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

describe('Admin analytics (e2e)', () => {
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

  describe('GET /api/admin/analytics/overview', () => {
    it('should return aggregate metric counts for a superadmin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/analytics/overview').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totals.users).toBe('number');
      expect(typeof res.body.data.totals.meetings).toBe('number');
      expect(typeof res.body.data.totals.activeMeetings).toBe('number');
      expect(typeof res.body.data.totals.messagesLast24h).toBe('number');
      expect(typeof res.body.data.totals.groups).toBe('number');
      expect(Array.isArray(res.body.data.trends.signups)).toBe(true);
      expect(Array.isArray(res.body.data.trends.meetings)).toBe(true);
      expect(Array.isArray(res.body.data.recentMeetings)).toBe(true);
      expect(Array.isArray(res.body.data.upcomingMeetings)).toBe(true);
    });

    it('should allow a member who has analytics.view', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app).get('/api/admin/analytics/overview').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.totals.users).toBe('number');
    });

    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/analytics/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/analytics/deep', () => {
    it('should return deep analytics for a superadmin', async () => {
      const { cookie } = await loginAdmin(app, SUPER);

      const res = await http(app).get('/api/admin/analytics/deep').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.averageMeetingMinutes).toBe('number');
      expect(typeof res.body.data.totalCompletedMeetings).toBe('number');
      expect(Array.isArray(res.body.data.topHosts)).toBe(true);
      expect(Array.isArray(res.body.data.peakConcurrencyByHour)).toBe(true);
      expect(res.body.data.peakConcurrencyByHour).toHaveLength(24);
      expect(Array.isArray(res.body.data.dailyActiveUsers)).toBe(true);
    });

    it('should reject a member lacking analytics.view-deep with 403', async () => {
      const { cookie } = await loginAdmin(app, REGULAR);

      const res = await http(app).get('/api/admin/analytics/deep').set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should require an admin session', async () => {
      const res = await http(app).get('/api/admin/analytics/deep');
      expect(res.status).toBe(401);
    });
  });
});
