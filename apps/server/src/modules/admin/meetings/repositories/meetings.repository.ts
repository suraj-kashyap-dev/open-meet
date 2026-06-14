import { Injectable } from '@nestjs/common';
import { MeetingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@/database/services/prisma.service';

const meetingInclude = {
  host: { select: { id: true, name: true, email: true } },
  _count: { select: { participants: true, messages: true } },
} satisfies Prisma.MeetingInclude;

interface MeetingFilters {
  search?: string;
  status?: MeetingStatus;
}

@Injectable()
export class AdminMeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private whereFromFilters({ search, status }: MeetingFilters): Prisma.MeetingWhereInput {
    const where: Prisma.MeetingWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { host: { name: { contains: search, mode: 'insensitive' } } },
        { host: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  searchWhere(search?: string, status?: MeetingStatus): Prisma.MeetingWhereInput {
    return this.whereFromFilters({ search, status });
  }

  listWith(params: {
    skip: number;
    take: number;
    where: Prisma.MeetingWhereInput;
    orderBy: Prisma.MeetingOrderByWithRelationInput;
  }) {
    return this.prisma.meeting.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: meetingInclude,
    });
  }

  countWith(where: Prisma.MeetingWhereInput): Promise<number> {
    return this.prisma.meeting.count({ where });
  }

  countActiveParticipants(meetingId: string): Promise<number> {
    return this.prisma.participant.count({ where: { meetingId, leftAt: null } });
  }

  findById(id: string) {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true, email: true } },
        _count: { select: { participants: true, messages: true } },
        participants: {
          orderBy: { joinedAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarKey: true } },
          },
        },
      },
    });
  }

  listActive() {
    return this.prisma.meeting.findMany({
      where: this.whereFromFilters({ status: MeetingStatus.ACTIVE }),
      select: { id: true, code: true },
    });
  }

  markEnded(id: string) {
    return this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.ENDED, endedAt: new Date() },
      select: { id: true, code: true },
    });
  }

  markAllActiveEnded(): Promise<number> {
    return this.prisma.meeting
      .updateMany({
        where: this.whereFromFilters({ status: MeetingStatus.ACTIVE }),
        data: { status: MeetingStatus.ENDED, endedAt: new Date() },
      })
      .then((r) => r.count);
  }

  delete(id: string) {
    return this.prisma.meeting.delete({ where: { id } });
  }

  findParticipant(meetingId: string, userId: string) {
    return this.prisma.participant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
  }

  markParticipantLeft(meetingId: string, userId: string) {
    return this.prisma.participant.updateMany({
      where: { meetingId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }
}
