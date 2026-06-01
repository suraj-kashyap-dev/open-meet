import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminAnalyticsRepository } from '@/modules/admin/analytics/analytics.repository';
import { AdminAnalyticsService } from '@/modules/admin/analytics/analytics.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let stats: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
    stats = {
      countUsers: vi.fn().mockResolvedValue(10),
      countMeetings: vi.fn().mockResolvedValue(7),
      countActiveMeetings: vi.fn().mockResolvedValue(2),
      countMessagesSince: vi.fn().mockResolvedValue(33),
      countGroups: vi.fn().mockResolvedValue(4),
      countDepartments: vi.fn().mockResolvedValue(3),
      dailyUserSignups: vi.fn().mockResolvedValue([]),
      dailyMeetings: vi.fn().mockResolvedValue([]),
      recentMeetings: vi.fn().mockResolvedValue([]),
      upcomingMeetings: vi.fn().mockResolvedValue([]),
      averageMeetingMinutes: vi.fn().mockResolvedValue({ avgMinutes: 12, total: 4 }),
      topHosts: vi.fn().mockResolvedValue([]),
      peakConcurrencyByHour: vi.fn().mockResolvedValue([]),
      dailyActiveUsers: vi.fn().mockResolvedValue([]),
    };
    service = new AdminAnalyticsService(stats as unknown as AdminAnalyticsRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('overview()', () => {
    it('should return totals and a gap-filled 15-day trend series', async () => {
      stats.dailyUserSignups.mockResolvedValueOnce([
        { day: new Date('2026-05-10T00:00:00Z'), count: BigInt(5) },
      ]);
      const res = await service.overview();

      expect(res.totals).toEqual({
        users: 10,
        meetings: 7,
        activeMeetings: 2,
        messagesLast24h: 33,
        groups: 4,
        departments: 3,
      });
      // 14 days ago .. today inclusive = 15 points
      expect(res.trends.signups).toHaveLength(15);
      const may10 = res.trends.signups.find((p) => p.date === '2026-05-10');
      expect(may10?.count).toBe(5);
      // a day with no rows is filled with 0
      expect(res.trends.signups.find((p) => p.date === '2026-05-11')?.count).toBe(0);
    });
  });

  describe('deep()', () => {
    it('should map bigints to numbers and pad concurrency to 24 hourly buckets', async () => {
      stats.topHosts.mockResolvedValueOnce([
        { id: 'h1', name: 'H', email: 'h@x.com', hosted: BigInt(3), totalMinutes: 42.7 },
      ]);
      stats.peakConcurrencyByHour.mockResolvedValueOnce([{ hour: 9, count: BigInt(6) }]);
      const res = await service.deep();

      expect(res.averageMeetingMinutes).toBe(12);
      expect(res.totalCompletedMeetings).toBe(4);
      expect(res.topHosts[0]).toEqual({
        id: 'h1',
        name: 'H',
        email: 'h@x.com',
        hostedCount: 3,
        totalDurationMinutes: 43,
      });
      expect(res.peakConcurrencyByHour).toHaveLength(24);
      expect(res.peakConcurrencyByHour[9]).toEqual({ hour: 9, count: 6 });
      expect(res.peakConcurrencyByHour[0]).toEqual({ hour: 0, count: 0 });
    });
  });
});
