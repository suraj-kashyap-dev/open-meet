import { Injectable } from '@nestjs/common';
import { MeetingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

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
    return this.prisma.meeting.count({ where: { status: MeetingStatus.ACTIVE } });
  }

  countMessagesSince(since: Date): Promise<number> {
    return this.prisma.message.count({ where: { sentAt: { gte: since } } });
  }

  async dailyUserSignups(since: Date): Promise<DailyRow[]> {
    return this.prisma.$queryRaw<DailyRow[]>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM "User"
        WHERE "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
    );
  }

  async dailyMeetings(since: Date): Promise<DailyRow[]> {
    return this.prisma.$queryRaw<DailyRow[]>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Meeting"
        WHERE "createdAt" >= ${since}
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
}
