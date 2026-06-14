import { Injectable } from '@nestjs/common';
import { ConversationType, MeetingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@/database/services/prisma.service';

interface DailyRow {
  day: Date;
  count: bigint;
}

@Injectable()
export class AdminAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  countMeetings(): Promise<number> {
    return this.prisma.meeting.count();
  }

  countActiveMeetings(): Promise<number> {
    return this.prisma.meeting.count({
      where: { status: MeetingStatus.ACTIVE },
    });
  }

  countMessagesSince(since: Date): Promise<number> {
    return this.prisma.message.count({
      where: { sentAt: { gte: since } },
    });
  }

  countGroups(): Promise<number> {
    return this.prisma.conversation.count({
      where: { type: ConversationType.GROUP },
    });
  }

  async dailyUserSignups(since: Date): Promise<DailyRow[]> {
    return this.prisma.$queryRaw<DailyRow[]>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM "User" u
        WHERE u."createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
    );
  }

  async dailyMeetings(since: Date): Promise<DailyRow[]> {
    return this.prisma.$queryRaw<DailyRow[]>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Meeting" m
        WHERE m."createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
    );
  }

  recentMeetings(limit: number) {
    return this.prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        host: { select: { name: true, email: true } },
        _count: { select: { participants: true } },
      },
    });
  }

  upcomingMeetings(limit: number, from: Date) {
    return this.prisma.meeting.findMany({
      where: {
        scheduledFor: { gte: from },
        status: { not: MeetingStatus.ENDED },
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
      include: {
        host: { select: { name: true, email: true } },
        _count: { select: { invites: true } },
      },
    });
  }

  async averageMeetingMinutes(): Promise<{ avgMinutes: number; total: number }> {
    const status = MeetingStatus.ENDED;

    const rows = await this.prisma.$queryRaw<Array<{ avg_minutes: number | null; total: bigint }>>(
      Prisma.sql`
        SELECT
          AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) / 60.0) AS avg_minutes,
          COUNT(*) AS total
        FROM "Meeting"
        WHERE "status"::text = ${status}
          AND "startedAt" IS NOT NULL
          AND "endedAt" IS NOT NULL
      `,
    );

    const row = rows[0];

    return {
      avgMinutes: row?.avg_minutes ? Math.round(Number(row.avg_minutes)) : 0,
      total: row ? Number(row.total) : 0,
    };
  }

  async topHosts(limit: number): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      hosted: bigint;
      totalMinutes: number | null;
    }>
  > {
    const status = MeetingStatus.ENDED;

    return this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          u."id" AS id,
          u."name" AS name,
          u."email" AS email,
          COUNT(m."id") AS hosted,
          COALESCE(
            SUM(EXTRACT(EPOCH FROM (m."endedAt" - m."startedAt")) / 60.0),
            0
          ) AS "totalMinutes"
        FROM "User" u
        JOIN "Meeting" m ON m."hostId" = u."id"
        WHERE m."status"::text = ${status}
          AND m."startedAt" IS NOT NULL
          AND m."endedAt" IS NOT NULL
        GROUP BY u."id", u."name", u."email"
        ORDER BY hosted DESC
        LIMIT ${limit}
      `,
    );
  }

  async peakConcurrencyByHour(since: Date): Promise<Array<{ hour: number; count: bigint }>> {
    return this.prisma.$queryRaw(
      Prisma.sql`
        WITH samples AS (
          SELECT
            EXTRACT(HOUR FROM "startedAt")::int AS hr,
            COUNT(*) AS concurrent
          FROM "Meeting"
          WHERE "startedAt" IS NOT NULL
            AND "startedAt" >= ${since}
          GROUP BY EXTRACT(HOUR FROM "startedAt"), DATE_TRUNC('hour', "startedAt")
        )
        SELECT hr AS hour, MAX(concurrent) AS count
        FROM samples
        GROUP BY hr
        ORDER BY hr ASC
      `,
    );
  }

  async dailyActiveUsers(since: Date): Promise<DailyRow[]> {
    return this.prisma.$queryRaw<DailyRow[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC('day', p."joinedAt") AS day,
          COUNT(DISTINCT p."userId") AS count
        FROM "Participant" p
        JOIN "Meeting" m ON m."id" = p."meetingId"
        WHERE p."joinedAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
    );
  }
}
