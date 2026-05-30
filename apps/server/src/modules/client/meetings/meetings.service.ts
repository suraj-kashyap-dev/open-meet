import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingStatus, type Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import type { ApiEnv } from '@open-meet/config';
import { buildIcs, generateMeetingCode } from '@open-meet/utils';
import type {
  GuestMeetingSessionDto,
  MeetingDto,
  ParticipantDto,
  ScheduleMeetingDto,
  UpcomingMeetingDto,
} from '@open-meet/types';
import { ApiErrorCode, ServerEvent } from '@open-meet/types';

import { MailService } from '../../../integrations/mail/mail.service';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { StorageService } from '../../../storage/storage.service';
import { MeetingBus } from '../../../websocket/meeting-bus.service';
import { WorkspaceConfigService } from '../../config/workspace-config.service';
import { AuthRepository } from '../auth/auth.repository';
import { AuthService } from '../auth/auth.service';
import {
  MeetingsRepository,
  type ParticipantWithUser,
  type UpcomingMeetingRow,
} from './meetings.repository';

const DEFAULT_DURATION_MIN = 30;
const GUEST_EMAIL_DOMAIN = 'guest.openmeet.invalid';
const MAX_RECURRING_OCCURRENCES = 24;

type MeetingAccessUser = Pick<RequestUser, 'id' | 'isGuest' | 'guestMeetingCode'>;
type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface RecurrenceRule {
  freq: RecurrenceFrequency;
  interval: number;
  count: number | null;
  until: Date | null;
}

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);
  private readonly maxDurationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly meetings: MeetingsRepository,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly workspaceConfig: WorkspaceConfigService,
    private readonly authUsers: AuthRepository,
    private readonly auth: AuthService,
    private readonly bus: MeetingBus,
  ) {}

  private avatarUrl(key: string | null): string | null {
    return key ? this.storage.publicUrl(key) : null;
  }

  private assertMeetingScope(code: string, user: MeetingAccessUser): void {
    if (user.isGuest && user.guestMeetingCode !== code) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Guest access is limited to the invited meeting.',
      });
    }
  }

  private guestEmail(): string {
    return `guest+${randomBytes(12).toString('hex')}@${GUEST_EMAIL_DOMAIN}`;
  }

  private recurrenceSeriesId(): string {
    return randomBytes(12).toString('hex');
  }

  private parseRecurrenceRule(rawRule: string): RecurrenceRule | null {
    const parts = new Map(
      rawRule
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => {
          const [key, value = ''] = part.split('=');
          return [key.toUpperCase(), value.toUpperCase()];
        }),
    );

    const freq = parts.get('FREQ');

    if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') {
      return null;
    }

    const intervalRaw = Number(parts.get('INTERVAL') ?? '1');
    const interval = Number.isInteger(intervalRaw) && intervalRaw > 0 ? intervalRaw : 1;

    const countValue = parts.get('COUNT');
    const countRaw = countValue ? Number(countValue) : null;
    const count = countRaw && Number.isInteger(countRaw) && countRaw > 0 ? countRaw : null;

    const untilValue = parts.get('UNTIL');
    const until = untilValue ? parseUntilDate(untilValue) : null;

    return { freq, interval, count, until };
  }

  private addMonthsUtc(date: Date, months: number): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const milliseconds = date.getUTCMilliseconds();

    const targetMonthIndex = month + months;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();

    return new Date(
      Date.UTC(
        targetYear,
        normalizedMonth,
        Math.min(day, lastDay),
        hours,
        minutes,
        seconds,
        milliseconds,
      ),
    );
  }

  private addYearsUtc(date: Date, years: number): Date {
    return this.addMonthsUtc(date, years * 12);
  }

  private nextRecurringDate(date: Date, rule: RecurrenceRule): Date {
    switch (rule.freq) {
      case 'DAILY':
        return new Date(date.getTime() + rule.interval * 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(date.getTime() + rule.interval * 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return this.addMonthsUtc(date, rule.interval);
      case 'YEARLY':
        return this.addYearsUtc(date, rule.interval);
    }
  }

  private futureOccurrenceDates(start: Date, rawRule: string): Date[] {
    const rule = this.parseRecurrenceRule(rawRule);

    if (!rule) {
      return [];
    }

    const dates: Date[] = [];
    let occurrence = new Date(start);
    let emitted = 1;

    while (dates.length < MAX_RECURRING_OCCURRENCES - 1) {
      if (rule.count !== null && emitted >= rule.count) {
        break;
      }

      occurrence = this.nextRecurringDate(occurrence, rule);

      if (rule.until && occurrence.getTime() > rule.until.getTime()) {
        break;
      }

      dates.push(occurrence);
      emitted += 1;
    }

    return dates;
  }

  private recurrenceSettings(seriesId: string, occurrenceIndex: number): Record<string, unknown> {
    return {
      recurrenceSeriesId: seriesId,
      recurrenceOccurrenceIndex: occurrenceIndex,
    };
  }

  private isSeriesOccurrence(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.recurrenceSeriesId === 'string';
  }

  private async createScheduledOccurrence(input: {
    hostId: string;
    title: string;
    scheduledFor: Date;
    durationMin: number | null;
    recurrence: string | null;
    invitees: string[];
    settings?: Record<string, unknown>;
  }) {
    let attempt = 0;

    while (attempt < 5) {
      const code = generateMeetingCode((n) => new Uint8Array(randomBytes(n)));

      try {
        return await this.meetings.createScheduled({
          code,
          hostId: input.hostId,
          title: input.title,
          scheduledFor: input.scheduledFor,
          durationMin: input.durationMin,
          recurrence: input.recurrence,
          invitees: input.invitees,
          settings: input.settings as Prisma.InputJsonValue | undefined,
        });
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

  private async resolveMeetingTitle(rawTitle: string | null | undefined): Promise<string> {
    const trimmed = typeof rawTitle === 'string' ? rawTitle.trim() : '';

    if (trimmed.length > 0) {
      return trimmed;
    }

    const workspace = await this.workspaceConfig.getConfig();
    return workspace.defaultMeetingTitle.trim() || 'Untitled meeting';
  }

  private clearMaxDurationTimer(code: string): void {
    const timer = this.maxDurationTimers.get(code);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.maxDurationTimers.delete(code);
  }

  private scheduleMaxDurationTimer(input: {
    code: string;
    hostId: string;
    startedAt: Date;
    maxMeetingMinutes: number;
  }): void {
    this.clearMaxDurationTimer(input.code);

    const endsAtMs = input.startedAt.getTime() + input.maxMeetingMinutes * 60_000;
    const remainingMs = endsAtMs - Date.now();

    if (remainingMs <= 0) {
      void this.end(input.code, { id: input.hostId });
      return;
    }

    const timer = setTimeout(() => {
      this.maxDurationTimers.delete(input.code);
      void this.end(input.code, { id: input.hostId });
    }, remainingMs);

    if (typeof timer === 'object' && 'unref' in timer && typeof timer.unref === 'function') {
      timer.unref();
    }

    this.maxDurationTimers.set(input.code, timer);
  }

  private async enforceMeetingDurationLimit(meeting: {
    code: string;
    hostId: string;
    status: MeetingStatus;
    startedAt: Date | null;
  }): Promise<void> {
    if (meeting.status === MeetingStatus.ENDED) {
      this.clearMaxDurationTimer(meeting.code);
      return;
    }

    if (meeting.status !== MeetingStatus.ACTIVE || !meeting.startedAt) {
      return;
    }

    const workspace = await this.workspaceConfig.getConfig();
    const maxMeetingMinutes = workspace.maxMeetingMinutes;

    if (maxMeetingMinutes == null) {
      this.clearMaxDurationTimer(meeting.code);
      return;
    }

    const endsAtMs = meeting.startedAt.getTime() + maxMeetingMinutes * 60_000;

    if (endsAtMs <= Date.now()) {
      await this.end(meeting.code, { id: meeting.hostId });
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_ENDED,
        message: 'This meeting reached the workspace time limit',
      });
    }

    this.scheduleMaxDurationTimer({
      code: meeting.code,
      hostId: meeting.hostId,
      startedAt: meeting.startedAt,
      maxMeetingMinutes,
    });
  }

  async assertWithinDurationLimit(code: string): Promise<void> {
    const meeting = await this.meetings.findByCode(code);

    if (!meeting) {
      return;
    }

    await this.enforceMeetingDurationLimit(meeting);
  }

  async create(hostId: string, title: string | undefined): Promise<MeetingDto> {
    const resolvedTitle = await this.resolveMeetingTitle(title);
    let attempt = 0;
    while (attempt < 5) {
      const code = generateMeetingCode((n) => new Uint8Array(randomBytes(n)));

      try {
        const meeting = await this.meetings.create({
          code,
          hostId,
          title: resolvedTitle,
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

  async createGuestSession(code: string, rawName: string): Promise<GuestMeetingSessionDto> {
    const workspace = await this.workspaceConfig.getConfig();

    if (!workspace.allowGuestJoin) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: 'Guest joining is disabled for this workspace.',
      });
    }

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

    await this.enforceMeetingDurationLimit(meeting);

    const name = rawName.trim();

    if (!name) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Guest name is required',
      });
    }

    const guest = await this.authUsers.createGuest({
      name,
      email: this.guestEmail(),
    });

    const access = await this.auth.issueGuestAccessToken({
      userId: guest.id,
      email: guest.email,
      name: guest.name,
      meetingCode: code,
    });

    return {
      token: access.accessToken,
      expiresAt: access.expiresAt,
      user: {
        id: guest.id,
        name: guest.name,
        avatar: this.avatarUrl(guest.avatarKey),
      },
    };
  }

  async join(
    code: string,
    user: MeetingAccessUser,
  ): Promise<{
    meeting: MeetingDto;
    participant: ParticipantDto;
  }> {
    this.assertMeetingScope(code, user);

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

    await this.enforceMeetingDurationLimit(meeting);

    const participant = await this.meetings.upsertParticipant(meeting.id, user.id);
    let resolved = meeting;
    if (meeting.status === MeetingStatus.WAITING) {
      resolved = await this.meetings.markStarted(meeting.id);
    }

    await this.enforceMeetingDurationLimit(resolved);

    return {
      meeting: this.toDto(resolved),
      participant: this.toParticipantDto(participant),
    };
  }

  async leave(code: string, user: MeetingAccessUser): Promise<void> {
    this.assertMeetingScope(code, user);

    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
      return;
    }
    await this.meetings.markParticipantLeft(meeting.id, user.id);
  }

  async updateTitle(
    code: string,
    requester: MeetingAccessUser,
    rawTitle: string | null | undefined,
  ): Promise<MeetingDto> {
    this.assertMeetingScope(code, requester);

    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    if (meeting.hostId !== requester.id) {
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

  async end(code: string, requester: MeetingAccessUser): Promise<MeetingDto> {
    this.assertMeetingScope(code, requester);

    const meeting = await this.meetings.findByCode(code);
    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }
    if (meeting.hostId !== requester.id) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Only the host can end this meeting',
      });
    }
    this.clearMaxDurationTimer(code);
    if (meeting.status === MeetingStatus.ENDED) {
      return this.toDto(meeting);
    }
    const ended = await this.meetings.markEnded(meeting.id);
    this.bus.emit(ended.code, ServerEvent.MEETING_ENDED, {
      endedAt: ended.endedAt?.toISOString() ?? new Date().toISOString(),
    });
    return this.toDto(ended);
  }

  async listParticipants(code: string, user: MeetingAccessUser): Promise<ParticipantDto[]> {
    this.assertMeetingScope(code, user);

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
    const workspace = await this.workspaceConfig.getConfig();

    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'scheduledFor is not a valid date',
      });
    }

    const title = await this.resolveMeetingTitle(dto.title);
    const invitees = uniqueEmails(dto.invitees ?? []).filter(
      (e) => e.toLowerCase() !== host.email.toLowerCase(),
    );
    const requestedDurationMin = dto.durationMin ?? DEFAULT_DURATION_MIN;
    const durationMin =
      workspace.maxMeetingMinutes == null
        ? requestedDurationMin
        : Math.min(requestedDurationMin, workspace.maxMeetingMinutes);
    const recurrence = dto.recurrence?.trim() || null;
    const seriesId = recurrence ? this.recurrenceSeriesId() : null;
    const root = await this.createScheduledOccurrence({
      hostId: host.id,
      title,
      scheduledFor,
      durationMin,
      recurrence,
      invitees,
      settings: seriesId ? this.recurrenceSettings(seriesId, 0) : undefined,
    });

    if (recurrence && seriesId) {
      const futureDates = this.futureOccurrenceDates(scheduledFor, recurrence);

      for (const [index, nextDate] of futureDates.entries()) {
        await this.createScheduledOccurrence({
          hostId: host.id,
          title,
          scheduledFor: nextDate,
          durationMin,
          recurrence,
          invitees,
          settings: this.recurrenceSettings(seriesId, index + 1),
        });
      }
    }

    void this.dispatchInvites(root.id, root.invites, {
      host,
      code: root.code,
      title,
      scheduledFor,
      durationMin,
      recurrence: null,
    });

    return this.toDto(root);
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
      recurrence: this.isSeriesOccurrence(meeting.settings) ? null : meeting.recurrence,
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

function parseUntilDate(value: string): Date | null {
  const compact = value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/,
  );

  if (compact) {
    const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = compact;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
      ),
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
