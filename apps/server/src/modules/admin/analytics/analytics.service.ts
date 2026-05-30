import { Injectable } from '@nestjs/common';

import type {
  AdminConcurrencyPointDto,
  AdminDeepAnalyticsDto,
  AdminStatsOverviewDto,
  AdminTopHostDto,
  AdminUpcomingMeetingDto,
  DailyCountPoint,
  RecentMeetingDto,
} from '@open-meet/types';

import { AdminAnalyticsRepository } from './analytics.repository';

const DAY_MS = 86_400_000;

interface MeetingWithHostAndCount {
  id: string;
  code: string;
  title: string | null;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  host: { name: string; email: string };
  _count: { participants: number };
}

interface UpcomingMeetingWithHostAndInvites {
  id: string;
  code: string;
  title: string | null;
  scheduledFor: Date | null;
  durationMin: number | null;
  recurrence: string | null;
  host: { name: string; email: string };
  _count: { invites: number };
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly stats: AdminAnalyticsRepository) {}

  async overview(): Promise<AdminStatsOverviewDto> {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);
    const twentyFourHoursAgo = new Date(now.getTime() - DAY_MS);

    const [
      users,
      meetings,
      activeMeetings,
      messagesLast24h,
      groups,
      teams,
      signupRows,
      meetingRows,
      recentMeetings,
      upcomingMeetings,
    ] = await Promise.all([
      this.stats.countUsers(),
      this.stats.countMeetings(),
      this.stats.countActiveMeetings(),
      this.stats.countMessagesSince(twentyFourHoursAgo),
      this.stats.countGroups(),
      this.stats.countTeams(),
      this.stats.dailyUserSignups(fourteenDaysAgo),
      this.stats.dailyMeetings(fourteenDaysAgo),
      this.stats.recentMeetings(10),
      this.stats.upcomingMeetings(10, now),
    ]);

    return {
      totals: { users, meetings, activeMeetings, messagesLast24h, groups, teams },
      trends: {
        signups: this.fillDailySeries(signupRows, fourteenDaysAgo, now),
        meetings: this.fillDailySeries(meetingRows, fourteenDaysAgo, now),
      },
      recentMeetings: recentMeetings.map((m) => this.toRecentDto(m)),
      upcomingMeetings: upcomingMeetings.map((m) => this.toUpcomingDto(m)),
    };
  }

  private toUpcomingDto(m: UpcomingMeetingWithHostAndInvites): AdminUpcomingMeetingDto {
    return {
      id: m.id,
      code: m.code,
      title: m.title,
      hostName: m.host.name,
      hostEmail: m.host.email,
      scheduledFor: m.scheduledFor?.toISOString() ?? new Date().toISOString(),
      durationMin: m.durationMin,
      recurrence: m.recurrence,
      inviteeCount: m._count.invites,
    };
  }

  private toRecentDto(m: MeetingWithHostAndCount): RecentMeetingDto {
    const duration =
      m.startedAt && m.endedAt
        ? Math.max(0, Math.round((m.endedAt.getTime() - m.startedAt.getTime()) / 60_000))
        : null;
    return {
      id: m.id,
      code: m.code,
      title: m.title,
      hostName: m.host.name,
      hostEmail: m.host.email,
      status: m.status as RecentMeetingDto['status'],
      startedAt: m.startedAt?.toISOString() ?? null,
      endedAt: m.endedAt?.toISOString() ?? null,
      durationMinutes: duration,
      participantCount: m._count.participants,
    };
  }

  private fillDailySeries(
    rows: Array<{ day: Date; count: bigint }>,
    since: Date,
    now: Date,
  ): DailyCountPoint[] {
    const buckets = new Map<string, number>();

    for (const row of rows) {
      buckets.set(this.toIsoDay(row.day), Number(row.count));
    }

    const series: DailyCountPoint[] = [];
    const start = this.startOfDay(since);
    const end = this.startOfDay(now);

    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      const date = this.toIsoDay(new Date(t));
      series.push({ date, count: buckets.get(date) ?? 0 });
    }

    return series;
  }

  private startOfDay(d: Date): Date {
    const out = new Date(d);
    out.setUTCHours(0, 0, 0, 0);
    return out;
  }

  private toIsoDay(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async deep(): Promise<AdminDeepAnalyticsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [avg, hostsRows, concurrencyRows, dauRows] = await Promise.all([
      this.stats.averageMeetingMinutes(),
      this.stats.topHosts(10),
      this.stats.peakConcurrencyByHour(thirtyDaysAgo),
      this.stats.dailyActiveUsers(thirtyDaysAgo),
    ]);

    const concurrencyMap = new Map<number, number>();

    for (const row of concurrencyRows) {
      concurrencyMap.set(row.hour, Number(row.count));
    }

    const peakConcurrencyByHour: AdminConcurrencyPointDto[] = [];

    for (let h = 0; h < 24; h++) {
      peakConcurrencyByHour.push({ hour: h, count: concurrencyMap.get(h) ?? 0 });
    }

    const topHosts: AdminTopHostDto[] = hostsRows.map((h) => ({
      id: h.id,
      name: h.name,
      email: h.email,
      hostedCount: Number(h.hosted),
      totalDurationMinutes: h.totalMinutes ? Math.round(Number(h.totalMinutes)) : 0,
    }));

    return {
      averageMeetingMinutes: avg.avgMinutes,
      totalCompletedMeetings: avg.total,
      topHosts,
      peakConcurrencyByHour,
      dailyActiveUsers: this.fillDailySeries(dauRows, thirtyDaysAgo, now),
    };
  }
}
