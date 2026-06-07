import { Injectable } from '@nestjs/common';
import type { Meeting, MeetingInvite, Participant, Prisma, User } from '@prisma/client';
import { MeetingStatus, ParticipantRole } from '@prisma/client';

import { PrismaService } from '../../../../database/services/prisma.service';

export type ParticipantWithUser = Participant & {
  user: Pick<User, 'id' | 'name' | 'avatarKey'>;
};

export type UpcomingMeetingRow = Meeting & {
  host: { id: string; name: string };
  _count: { invites: number };
};

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({ where: { code } });
  }

  findById(id: string): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({ where: { id } });
  }

  create(data: { code: string; hostId: string; title?: string | null }): Promise<Meeting> {
    return this.prisma.meeting.create({
      data: {
        code: data.code,
        hostId: data.hostId,
        title: data.title ?? null,
        status: MeetingStatus.WAITING,
        participants: {
          create: {
            userId: data.hostId,
            role: ParticipantRole.HOST,
          },
        },
      },
    });
  }

  createScheduled(data: {
    code: string;
    hostId: string;
    title: string;
    scheduledFor: Date;
    durationMin: number | null;
    recurrence: string | null;
    invitees: string[];
    settings?: Prisma.InputJsonValue;
  }): Promise<Meeting & { invites: MeetingInvite[] }> {
    return this.prisma.meeting.create({
      data: {
        code: data.code,
        hostId: data.hostId,
        title: data.title,
        status: MeetingStatus.WAITING,
        scheduledFor: data.scheduledFor,
        durationMin: data.durationMin,
        recurrence: data.recurrence,
        ...(data.settings !== undefined ? { settings: data.settings } : {}),
        participants: {
          create: {
            userId: data.hostId,
            role: ParticipantRole.HOST,
          },
        },
        invites: {
          create: data.invitees.map((email) => ({ email })),
        },
      },
      include: { invites: true },
    }) as Promise<Meeting & { invites: MeetingInvite[] }>;
  }

  markInviteSent(inviteId: string): Promise<MeetingInvite> {
    return this.prisma.meetingInvite.update({
      where: { id: inviteId },
      data: { sentAt: new Date() },
    });
  }

  listUpcomingForUser(
    userId: string,
    email: string,
    fromDate: Date,
  ): Promise<UpcomingMeetingRow[]> {
    return this.prisma.meeting.findMany({
      where: {
        scheduledFor: { gte: fromDate },
        status: { not: MeetingStatus.ENDED },
        OR: [{ hostId: userId }, { invites: { some: { email } } }],
      },
      orderBy: { scheduledFor: 'asc' },
      take: 20,
      include: {
        host: { select: { id: true, name: true } },
        _count: { select: { invites: true } },
      },
    });
  }

  async upsertParticipant(meetingId: string, userId: string): Promise<ParticipantWithUser> {
    return this.prisma.participant.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: {
        meetingId,
        userId,
        role: ParticipantRole.GUEST,
      },
      update: {
        leftAt: null,
        joinedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, avatarKey: true } },
      },
    });
  }

  async updateTitle(meetingId: string, title: string | null): Promise<Meeting> {
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: { title },
    });
  }

  async markStarted(meetingId: string): Promise<Meeting> {
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.ACTIVE,
        startedAt: new Date(),
      },
    });
  }

  async markEnded(meetingId: string): Promise<Meeting> {
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.ENDED,
        endedAt: new Date(),
      },
    });
  }

  async markParticipantLeft(meetingId: string, userId: string): Promise<void> {
    await this.prisma.participant.updateMany({
      where: {
        meetingId,
        userId,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  listActiveParticipants(meetingId: string): Promise<ParticipantWithUser[]> {
    return this.prisma.participant.findMany({
      where: {
        meetingId,
        leftAt: null,
      },
      include: {
        user: { select: { id: true, name: true, avatarKey: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  countActive(meetingId: string): Promise<number> {
    return this.prisma.participant.count({
      where: {
        meetingId,
        leftAt: null,
      },
    });
  }

  findHostId(meetingId: string): Promise<{ hostId: string } | null> {
    return this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { hostId: true },
    });
  }

  isParticipant(meetingId: string, userId: string): Promise<{ id: string } | null> {
    return this.prisma.participant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
      select: { id: true },
    });
  }

  listHistoryForUser(params: { userId: string; skip: number; take: number }) {
    return this.prisma.meeting.findMany({
      where: {
        participants: { some: { userId: params.userId } },
        status: { in: [MeetingStatus.ACTIVE, MeetingStatus.ENDED] },
      },
      orderBy: [{ startedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip: params.skip,
      take: params.take,
      include: {
        host: { select: { id: true, name: true, avatarKey: true } },
        participants: {
          take: 6,
          orderBy: { joinedAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, avatarKey: true } },
          },
        },
        _count: {
          select: {
            participants: true,
            messages: true,
          },
        },
      },
    });
  }

  countHistoryForUser(userId: string): Promise<number> {
    return this.prisma.meeting.count({
      where: {
        participants: { some: { userId } },
        status: { in: [MeetingStatus.ACTIVE, MeetingStatus.ENDED] },
      },
    });
  }

  countAttachmentsForMeeting(meetingId: string): Promise<number> {
    return this.prisma.attachment.count({
      where: { message: { meetingId } },
    });
  }

  async countCompletedRecordingsByMeetingIds(meetingIds: string[]): Promise<Map<string, number>> {
    if (meetingIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.recording.groupBy({
      by: ['meetingId'],
      where: {
        meetingId: { in: meetingIds },
        status: 'COMPLETED',
      },
      _count: { _all: true },
    });

    return new Map(rows.map((r) => [r.meetingId, r._count._all]));
  }
}
