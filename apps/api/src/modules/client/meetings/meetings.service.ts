import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { generateMeetingCode } from '@open-meet/utils';
import type {
  MeetingDto,
  ParticipantDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import {
  MeetingsRepository,
  type ParticipantWithUser,
} from './meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(private readonly meetings: MeetingsRepository) {}

  async create(hostId: string, title: string | undefined): Promise<MeetingDto> {
    let attempt = 0;
    while (attempt < 5) {
      const code = generateMeetingCode((n) => new Uint8Array(randomBytes(n)));
      
      try {
        const meeting = await this.meetings.create({
          code,
          hostId,
          title,
        });
        return this.toDto(meeting);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          attempt += 1;
          continue;
        }
        throw err;
      }
    }

    throw new ConflictException({
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Failed to generate a unique meeting code',
    });
  }

  async getByCode(code: string): Promise<MeetingDto> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    return this.toDto(meeting);
  }

  async join(code: string, userId: string): Promise<{
    meeting: MeetingDto;
    participant: ParticipantDto;
  }> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }

    if (meeting.status === MeetingStatus.ENDED) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_ENDED,
        message: 'This meeting has already ended',
      });
    }

    const participant = await this.meetings.upsertParticipant(meeting.id, userId);
    let resolved = meeting;
    if (meeting.status === MeetingStatus.WAITING) {
      resolved = await this.meetings.markStarted(meeting.id);
    }

    return {
      meeting: this.toDto(resolved),
      participant: this.toParticipantDto(participant),
    };
  }

  async leave(code: string, userId: string): Promise<void> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      return;
    }
    await this.meetings.markParticipantLeft(meeting.id, userId);
  }

  async end(code: string, requesterId: string): Promise<MeetingDto> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    if (meeting.hostId !== requesterId) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Only the host can end this meeting',
      });
    }
    if (meeting.status === MeetingStatus.ENDED) {
      return this.toDto(meeting);
    }
    const ended = await this.meetings.markEnded(meeting.id);
    return this.toDto(ended);
  }

  async listParticipants(code: string): Promise<ParticipantDto[]> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    const participants = await this.meetings.listActiveParticipants(meeting.id);
    return participants.map((p) => this.toParticipantDto(p));
  }

  async isHost(code: string, userId: string): Promise<boolean> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      return false;
    }
    return meeting.hostId === userId;
  }

  async findRawByCode(code: string): Promise<{ id: string; hostId: string; status: MeetingStatus } | null> {
    const meeting = await this.meetings.findByCode(code);
    if (! meeting) {
      return null;
    }
    return {
      id: meeting.id,
      hostId: meeting.hostId,
      status: meeting.status,
    };
  }

  private toDto(meeting: {
    id: string;
    code: string;
    title: string | null;
    hostId: string;
    status: MeetingStatus;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
  }): MeetingDto {
    return {
      id: meeting.id,
      code: meeting.code,
      title: meeting.title,
      hostId: meeting.hostId,
      status: meeting.status,
      startedAt: meeting.startedAt?.toISOString() ?? null,
      endedAt: meeting.endedAt?.toISOString() ?? null,
      createdAt: meeting.createdAt.toISOString(),
    };
  }

  private toParticipantDto(p: ParticipantWithUser): ParticipantDto {
    return {
      id: p.id,
      meetingId: p.meetingId,
      userId: p.userId,
      name: p.user.name,
      avatar: p.user.avatar,
      role: p.role,
      joinedAt: p.joinedAt.toISOString(),
      leftAt: p.leftAt?.toISOString() ?? null,
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) {
      return false;
    }
    const e = err as { code?: string };
    return e.code === 'P2002';
  }
}
