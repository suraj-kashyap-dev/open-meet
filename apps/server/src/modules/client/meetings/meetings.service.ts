import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import type { ApiEnv } from '@open-meet/config';
import { buildIcs, generateMeetingCode } from '@open-meet/utils';
import type {
  MeetingDto,
  ParticipantDto,
  ScheduleMeetingDto,
  UpcomingMeetingDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { MailService } from '../../../integrations/mail/mail.service';
import { StorageService } from '../../../storage/storage.service';
import {
  MeetingsRepository,
  type ParticipantWithUser,
  type UpcomingMeetingRow,
} from './meetings.repository';

const DEFAULT_DURATION_MIN = 30;

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly meetings: MeetingsRepository,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  private avatarUrl(key: string | null): string | null {
    return key ? this.storage.publicUrl(key) : null;
  }

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
    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    return this.toDto(meeting);
  }

  async join(
    code: string,
    userId: string,
  ): Promise<{
    meeting: MeetingDto;
    participant: ParticipantDto;
  }> {
    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
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
    if (!meeting) {
      return;
    }
    await this.meetings.markParticipantLeft(meeting.id, userId);
  }

  async updateTitle(
    code: string,
    requesterId: string,
    rawTitle: string | null | undefined,
  ): Promise<MeetingDto> {
    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    if (meeting.hostId !== requesterId) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Only the host can rename this meeting',
      });
    }
    if (meeting.status === MeetingStatus.ENDED) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_ENDED,
        message: 'This meeting has already ended',
      });
    }

    const trimmed = typeof rawTitle === 'string' ? rawTitle.trim() : null;
    const nextTitle = trimmed === null || trimmed.length === 0 ? null : trimmed;

    if (nextTitle === meeting.title) {
      return this.toDto(meeting);
    }

    const updated = await this.meetings.updateTitle(meeting.id, nextTitle);
    return this.toDto(updated);
  }

  async end(code: string, requesterId: string): Promise<MeetingDto> {
    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
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
    if (!meeting) {
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
    if (!meeting) {
      return false;
    }
    return meeting.hostId === userId;
  }

  async getHistory(
    userId: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{
    items: Array<{
      meeting: {
        id: string;
        code: string;
        title: string | null;
        hostId: string;
        status: MeetingStatus;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        host: { id: string; name: string; avatarKey: string | null };
        participants: ParticipantWithUser[];
        _count: { participants: number; messages: number };
      };
      attachmentCount: number;
      recordingCount: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

    const [rows, total] = await Promise.all([
      this.meetings.listHistoryForUser({
        userId,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.meetings.countHistoryForUser(userId),
    ]);

    const meetingIds = rows.map((m) => m.id);
    const recordingCounts = await this.meetings.countCompletedRecordingsByMeetingIds(meetingIds);

    const items = await Promise.all(
      rows.map(async (meeting) => ({
        meeting,
        attachmentCount: await this.meetings.countAttachmentsForMeeting(meeting.id),
        recordingCount: recordingCounts.get(meeting.id) ?? 0,
      })),
    );

    return { items, total, page, pageSize };
  }

  async assertParticipant(code: string, userId: string): Promise<{ meetingId: string }> {
    const meeting = await this.meetings.findByCode(code);

    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }

    if (meeting.hostId === userId) {
      return { meetingId: meeting.id };
    }

    const participant = await this.meetings.isParticipant(meeting.id, userId);

    if (!participant) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'You did not participate in this meeting',
      });
    }

    return { meetingId: meeting.id };
  }

  async findRawByCode(
    code: string,
  ): Promise<{ id: string; hostId: string; status: MeetingStatus } | null> {
    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
      return null;
    }
    return {
      id: meeting.id,
      hostId: meeting.hostId,
      status: meeting.status,
    };
  }

  async findRawByMeetingId(
    meetingId: string,
  ): Promise<{ id: string; code: string; hostId: string; status: MeetingStatus } | null> {
    const meeting = await this.meetings.findById(meetingId);
    if (!meeting) {
      return null;
    }
    return {
      id: meeting.id,
      code: meeting.code,
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
    scheduledFor?: Date | null;
    recurrence?: string | null;
    durationMin?: number | null;
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
      scheduledFor: meeting.scheduledFor?.toISOString() ?? null,
      recurrence: meeting.recurrence ?? null,
      durationMin: meeting.durationMin ?? null,
      startedAt: meeting.startedAt?.toISOString() ?? null,
      endedAt: meeting.endedAt?.toISOString() ?? null,
      createdAt: meeting.createdAt.toISOString(),
    };
  }

  async schedule(
    host: { id: string; email: string; name: string },
    dto: ScheduleMeetingDto,
  ): Promise<MeetingDto> {
    const scheduledFor = new Date(dto.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'scheduledFor is not a valid date',
      });
    }

    const title = dto.title.trim();

    if (!title) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'title is required',
      });
    }

    const invitees = uniqueEmails(dto.invitees ?? []).filter(
      (e) => e.toLowerCase() !== host.email.toLowerCase(),
    );
    const durationMin = dto.durationMin ?? DEFAULT_DURATION_MIN;
    const recurrence = dto.recurrence?.trim() || null;

    let attempt = 0;

    while (attempt < 5) {
      const code = generateMeetingCode((n) => new Uint8Array(randomBytes(n)));

      try {
        const meeting = await this.meetings.createScheduled({
          code,
          hostId: host.id,
          title,
          scheduledFor,
          durationMin,
          recurrence,
          invitees,
        });

        void this.dispatchInvites(meeting.id, meeting.invites, {
          host,
          code: meeting.code,
          title,
          scheduledFor,
          durationMin,
          recurrence,
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

  async getUpcoming(user: { id: string; email: string }): Promise<UpcomingMeetingDto[]> {
    const rows = await this.meetings.listUpcomingForUser(
      user.id,
      user.email.toLowerCase(),
      new Date(),
    );

    return rows.map((row) => this.toUpcomingDto(row, user.id));
  }

  async getIcs(code: string): Promise<{ filename: string; content: string }> {
    const meeting = await this.meetings.findByCode(code);

    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }

    if (!meeting.scheduledFor) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'This meeting is not scheduled',
      });
    }

    const host = await this.meetings.findById(meeting.id);

    if (!host) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }

    const ics = this.buildEventIcs({
      code: meeting.code,
      title: meeting.title ?? 'Meeting',
      scheduledFor: meeting.scheduledFor,
      durationMin: meeting.durationMin ?? DEFAULT_DURATION_MIN,
      recurrence: meeting.recurrence,
      organizerEmail: this.config.getOrThrow<string>('MAIL_FROM'),
      organizerName: 'open-meet',
      attendees: [],
    });

    return { filename: `${meeting.code}.ics`, content: ics };
  }

  private toUpcomingDto(row: UpcomingMeetingRow, viewerId: string): UpcomingMeetingDto {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      hostName: row.host.name,
      isHost: row.hostId === viewerId,
      scheduledFor: row.scheduledFor!.toISOString(),
      durationMin: row.durationMin,
      recurrence: row.recurrence,
      inviteeCount: row._count.invites,
    };
  }

  private buildEventIcs(input: {
    code: string;
    title: string;
    scheduledFor: Date;
    durationMin: number;
    recurrence: string | null;
    organizerEmail: string;
    organizerName: string;
    attendees: string[];
  }): string {
    const start = input.scheduledFor;
    const end = new Date(start.getTime() + input.durationMin * 60_000);
    const joinUrl = this.joinUrl(input.code);

    return buildIcs({
      uid: `${input.code}@open-meet`,
      title: input.title,
      description: `Join the meeting: ${joinUrl}`,
      location: joinUrl,
      start,
      end,
      organizerEmail: extractEmail(input.organizerEmail),
      organizerName: input.organizerName,
      attendees: input.attendees,
      rrule: input.recurrence,
    });
  }

  private joinUrl(code: string): string {
    const base = this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '');
    return `${base}/${code}/lobby`;
  }

  private async dispatchInvites(
    meetingId: string,
    invites: Array<{ id: string; email: string }>,
    ctx: {
      host: { id: string; email: string; name: string };
      code: string;
      title: string;
      scheduledFor: Date;
      durationMin: number;
      recurrence: string | null;
    },
  ): Promise<void> {
    if (invites.length === 0) {
      return;
    }

    const joinUrl = this.joinUrl(ctx.code);
    const when = ctx.scheduledFor.toUTCString();
    const subject = `Invite: ${ctx.title}`;

    const ics = this.buildEventIcs({
      code: ctx.code,
      title: ctx.title,
      scheduledFor: ctx.scheduledFor,
      durationMin: ctx.durationMin,
      recurrence: ctx.recurrence,
      organizerEmail: ctx.host.email,
      organizerName: ctx.host.name,
      attendees: invites.map((i) => i.email),
    });

    for (const invite of invites) {
      try {
        await this.mail.send({
          to: invite.email,
          subject,
          text: this.inviteText({ ctx, when, joinUrl }),
          html: this.inviteHtml({ ctx, when, joinUrl }),
          ics: { filename: `${ctx.code}.ics`, content: ics },
        });
        await this.meetings.markInviteSent(invite.id);
      } catch (err) {
        this.logger.warn(
          `Invite to ${invite.email} for meeting ${ctx.code} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    void meetingId;
  }

  private inviteText(input: {
    ctx: { host: { name: string }; title: string };
    when: string;
    joinUrl: string;
  }): string {
    return [
      `${input.ctx.host.name} invited you to "${input.ctx.title}".`,
      `When: ${input.when}`,
      `Join: ${input.joinUrl}`,
      '',
      'The attached .ics file can be opened with any calendar app.',
    ].join('\n');
  }

  private inviteHtml(input: {
    ctx: { host: { name: string }; title: string };
    when: string;
    joinUrl: string;
  }): string {
    const safeTitle = escapeHtml(input.ctx.title);
    const safeHost = escapeHtml(input.ctx.host.name);
    const safeWhen = escapeHtml(input.when);

    return `
      <div style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${safeHost} invited you to a meeting</h2>
        <p style="margin: 0 0 8px;"><strong>${safeTitle}</strong></p>
        <p style="margin: 0 0 16px; color: #666;">${safeWhen}</p>
        <p style="margin: 0;">
          <a href="${input.joinUrl}" style="display: inline-block; background: #3b82f6; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none;">Join meeting</a>
        </p>
      </div>
    `;
  }

  private toParticipantDto(p: ParticipantWithUser): ParticipantDto {
    return {
      id: p.id,
      meetingId: p.meetingId,
      userId: p.userId,
      name: p.user.name,
      avatar: this.avatarUrl(p.user.avatarKey),
      role: p.role,
      joinedAt: p.joinedAt.toISOString(),
      leftAt: p.leftAt?.toISOString() ?? null,
    };
  }

  resolveAvatarUrl(avatarKey: string | null): string | null {
    return this.avatarUrl(avatarKey);
  }

  private isUniqueViolation(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) {
      return false;
    }
    const e = err as { code?: string };
    return e.code === 'P2002';
  }
}

function uniqueEmails(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of input) {
    const normalized = raw.trim().toLowerCase();

    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return match ? match[1]! : value;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
