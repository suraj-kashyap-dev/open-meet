import { ConversationType, MeetingStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { AdminAnalyticsRepository } from '@/modules/admin/analytics/analytics.repository';

describe('AdminAnalyticsRepository', () => {
  let repo: AdminAnalyticsRepository;
  let user: { count: ReturnType<typeof vi.fn> };
  let meeting: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  let message: { count: ReturnType<typeof vi.fn> };
  let conversation: { count: ReturnType<typeof vi.fn> };
  let team: { count: ReturnType<typeof vi.fn> };
  let $queryRaw: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = { count: vi.fn().mockResolvedValue(10) };
    meeting = { count: vi.fn().mockResolvedValue(4), findMany: vi.fn().mockResolvedValue([]) };
    message = { count: vi.fn().mockResolvedValue(20) };
    conversation = { count: vi.fn().mockResolvedValue(6) };
    team = { count: vi.fn().mockResolvedValue(3) };
    $queryRaw = vi.fn().mockResolvedValue([]);
    repo = new AdminAnalyticsRepository({
      user,
      meeting,
      message,
      conversation,
      team,
      $queryRaw,
    } as unknown as PrismaService);
  });

  describe('countGroups()', () => {
    it('should count only GROUP-type conversations', async () => {
      await expect(repo.countGroups()).resolves.toBe(6);
      expect(conversation.count).toHaveBeenCalledWith({
        where: { type: ConversationType.GROUP },
      });
    });
  });

  describe('countTeams()', () => {
    it('should count all teams', async () => {
      await expect(repo.countTeams()).resolves.toBe(3);
      expect(team.count).toHaveBeenCalledWith();
    });
  });

  describe('countActiveMeetings()', () => {
    it('should filter the count by ACTIVE status', async () => {
      await repo.countActiveMeetings();
      expect(meeting.count).toHaveBeenCalledWith({ where: { status: MeetingStatus.ACTIVE } });
    });
  });

  describe('countMessagesSince()', () => {
    it('should filter with a gte on sentAt', async () => {
      const since = new Date('2026-01-01T00:00:00Z');
      await repo.countMessagesSince(since);
      expect(message.count).toHaveBeenCalledWith({ where: { sentAt: { gte: since } } });
    });
  });

  describe('averageMeetingMinutes()', () => {
    it('should round the average and coerce the total to a number', async () => {
      $queryRaw.mockResolvedValueOnce([{ avg_minutes: 12.6, total: BigInt(3) }]);
      await expect(repo.averageMeetingMinutes()).resolves.toEqual({ avgMinutes: 13, total: 3 });
    });

    it('should return zeros when there are no completed meetings', async () => {
      $queryRaw.mockResolvedValueOnce([{ avg_minutes: null, total: BigInt(0) }]);
      await expect(repo.averageMeetingMinutes()).resolves.toEqual({ avgMinutes: 0, total: 0 });
    });

    it('should be safe when the query returns no rows', async () => {
      $queryRaw.mockResolvedValueOnce([]);
      await expect(repo.averageMeetingMinutes()).resolves.toEqual({ avgMinutes: 0, total: 0 });
    });
  });

  describe('recentMeetings()', () => {
    it('should pass the limit through to the query', async () => {
      await repo.recentMeetings(5);
      expect(meeting.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });
  });
});
