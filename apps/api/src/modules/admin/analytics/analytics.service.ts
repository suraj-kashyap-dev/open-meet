import { Injectable } from '@nestjs/common';

import type {
  AdminStatsOverviewDto,
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
      signupRows,
      meetingRows,
      recentMeetings,
    ] = await Promise.all([
      this.stats.countUsers(),
      this.stats.countMeetings(),
      this.stats.countActiveMeetings(),
      this.stats.countMessagesSince(twentyFourHoursAgo),
      this.stats.dailyUserSignups(fourteenDaysAgo),
      this.stats.dailyMeetings(fourteenDaysAgo),
      this.stats.recentMeetings(10),
    ]);

    return {
      totals: { users, meetings, activeMeetings, messagesLast24h },
      trends: {
        signups: this.fillDailySeries(signupRows, fourteenDaysAgo, now),
        meetings: this.fillDailySeries(meetingRows, fourteenDaysAgo, now),
      },
      recentMeetings: recentMeetings.map((m) => this.toRecentDto(m)),
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
}
