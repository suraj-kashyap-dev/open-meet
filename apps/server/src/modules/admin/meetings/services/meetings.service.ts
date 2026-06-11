import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type Prisma, MeetingStatus } from '@prisma/client';

import type {
  AdminMeetingDetailDto,
  AdminMeetingDto,
  AdminMeetingParticipantDto,
  AdminBulkEndResponseDto,
  DatagridResponseDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { DatagridService, buildOrderBy, paginate } from '../../../../common/datagrid';
import { LiveKitService } from '../../../../integrations/livekit/services/livekit.service';
import { StorageService } from '../../../../storage/services/storage.service';

import { AdminMeetingsRepository } from '../repositories/meetings.repository';
import { AdminMeetingsDatagridQueryDto } from '../dto/meetings-datagrid-query.dto';
import { MEETINGS_DATAGRID } from '../meetings.datagrid';

interface MeetingRow {
  id: string;
  code: string;
  title: string | null;
  status: MeetingStatus;
  hostId: string;
  host: { id: string; name: string; email: string };
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  _count: { participants: number; messages: number };
}

@Injectable()
export class AdminMeetingsService {
  private readonly logger = new Logger(AdminMeetingsService.name);

  constructor(
    private readonly meetings: AdminMeetingsRepository,
    private readonly livekit: LiveKitService,
    private readonly storage: StorageService,
    private readonly grid: DatagridService,
  ) {}

  async datagrid(
    query: AdminMeetingsDatagridQueryDto,
  ): Promise<DatagridResponseDto<AdminMeetingDto>> {
    const { skip, take } = paginate(query);
    const search = query.search?.trim() || undefined;
    const status = query.status ? (query.status as MeetingStatus) : undefined;
    const where = this.meetings.searchWhere(search, status);
    const orderBy = buildOrderBy(
      MEETINGS_DATAGRID,
      query,
    ) as Prisma.MeetingOrderByWithRelationInput;

    const [rows, total] = await Promise.all([
      this.meetings.listWith({ skip, take, where, orderBy }),
      this.meetings.countWith(where),
    ]);

    return this.grid.build(MEETINGS_DATAGRID, {
      rows: rows.map((row) => this.toDto(row, 0)),
      total,
      query,
    });
  }

  async getById(id: string): Promise<AdminMeetingDetailDto> {
    const row = await this.meetings.findById(id);

    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${id}" not found`,
      });
    }

    const activeParticipants =
      row.status === MeetingStatus.ACTIVE ? await this.meetings.countActiveParticipants(row.id) : 0;

    const participants: AdminMeetingParticipantDto[] = row.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      avatar: p.user.avatarKey ? this.storage.publicUrl(p.user.avatarKey) : null,
      role: p.role,
      joinedAt: p.joinedAt.toISOString(),
      leftAt: p.leftAt?.toISOString() ?? null,
    }));

    return {
      ...this.toDto(row, activeParticipants),
      participantCount: row.participants.length,
      activeParticipantCount: activeParticipants,
      participants,
    };
  }

  async forceEnd(id: string): Promise<AdminMeetingDto> {
    const row = await this.meetings.findById(id);

    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${id}" not found`,
      });
    }

    if (row.status !== MeetingStatus.ENDED) {
      await this.meetings.markEnded(id);

      await this.safeCloseRoom(row.code);
    }

    const refreshed = await this.meetings.findById(id);

    if (!refreshed) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${id}" not found`,
      });
    }

    return this.toDto(refreshed, 0);
  }

  async bulkEndActive(): Promise<AdminBulkEndResponseDto> {
    const active = await this.meetings.listActive();
    const ended = await this.meetings.markAllActiveEnded();

    await Promise.all(active.map(({ code }) => this.safeCloseRoom(code)));

    return { ended };
  }

  async delete(id: string): Promise<{ deleted: true }> {
    const row = await this.meetings.findById(id);

    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${id}" not found`,
      });
    }

    if (row.status === MeetingStatus.ACTIVE) {
      await this.safeCloseRoom(row.code);
    }

    await this.meetings.delete(id);

    return { deleted: true };
  }

  async kickParticipant(meetingId: string, userId: string): Promise<{ kicked: true }> {
    const row = await this.meetings.findById(meetingId);

    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${meetingId}" not found`,
      });
    }

    const participant = await this.meetings.findParticipant(meetingId, userId);

    if (!participant) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `Participant not found in meeting`,
      });
    }

    await this.meetings.markParticipantLeft(meetingId, userId);

    await this.safeRemoveParticipant(row.code, userId);

    return { kicked: true };
  }

  private async safeCloseRoom(code: string): Promise<void> {
    try {
      await this.livekit.closeRoom(code);
    } catch (err) {
      this.logger.warn(`Could not close LiveKit room ${code}: ${(err as Error).message}`);
    }
  }

  private async safeRemoveParticipant(code: string, userId: string): Promise<void> {
    try {
      await this.livekit.removeParticipant(code, userId);
    } catch (err) {
      this.logger.warn(
        `Could not remove participant ${userId} from LiveKit room ${code}: ${(err as Error).message}`,
      );
    }
  }

  private toDto(row: MeetingRow, activeParticipants: number): AdminMeetingDto {
    const durationMinutes =
      row.startedAt && row.endedAt
        ? Math.max(0, Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 60_000))
        : null;

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      hostId: row.hostId,
      hostName: row.host.name,
      hostEmail: row.host.email,
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      durationMinutes,
      participantCount: row._count.participants,
      activeParticipantCount: activeParticipants,
      messageCount: row._count.messages,
    };
  }
}
