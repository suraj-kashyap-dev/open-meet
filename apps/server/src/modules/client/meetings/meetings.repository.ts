import { Injectable } from '@nestjs/common';
import type { Meeting, Participant, User } from '@prisma/client';
import { MeetingStatus, ParticipantRole } from '@prisma/client';

import { type PrismaService } from '../../../database/prisma.service';

export type ParticipantWithUser = Participant & {
  user: Pick<User, 'id' | 'name' | 'avatarKey'>;
};

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({ where: { code } });
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

  listHistoryForUser(params: {
    userId: string;
    skip: number;
    take: number;
  }) {
    return this.prisma.meeting.findMany({
      where: {
        participants: { some: { userId: params.userId } },
      },
      orderBy: [
        { startedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
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
      },
    });
  }

  countAttachmentsForMeeting(meetingId: string): Promise<number> {
    return this.prisma.attachment.count({
      where: { message: { meetingId } },
    });
  }
}
