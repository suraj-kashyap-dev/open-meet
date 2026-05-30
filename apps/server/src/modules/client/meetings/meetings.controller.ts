import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

import type {
  GuestMeetingSessionDto,
  MeetingDto,
  MeetingHistoryItemDto,
  MeetingHistoryListResponseDto,
  ParticipantDto,
  UpcomingMeetingDto,
} from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { RequireUserPermissions } from '../rbac/decorators/require-user-permissions.decorator';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CreateGuestSessionDto } from './dto/create-guest-session.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ScheduleMeetingApiDto } from './dto/schedule-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post()
  @RequireUserPermissions('meetings.create')
  @ApiOperation({ summary: 'Create a new meeting' })
  async create(
    @Body() dto: CreateMeetingDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingDto> {
    return this.meetings.create(user.id, dto.title);
  }

  @Post('schedule')
  @RequireUserPermissions('meetings.schedule')
  @ApiOperation({ summary: 'Schedule a meeting for a future time' })
  async schedule(
    @Body() dto: ScheduleMeetingApiDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingDto> {
    return this.meetings.schedule(user, dto);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Upcoming scheduled meetings you host or are invited to' })
  async upcoming(@CurrentUser() user: RequestUser): Promise<UpcomingMeetingDto[]> {
    return this.meetings.getUpcoming(user);
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated history of meetings you participated in' })
  async history(
    @Query() query: HistoryQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingHistoryListResponseDto> {
    const { items, total, page, pageSize } = await this.meetings.getHistory(user.id, query);

    return {
      items: items.map(({ meeting, attachmentCount, recordingCount }): MeetingHistoryItemDto => {
        const startedAt = meeting.startedAt;
        const endedAt = meeting.endedAt;
        const durationMinutes =
          startedAt && endedAt
            ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000))
            : null;

        return {
          id: meeting.id,
          code: meeting.code,
          title: meeting.title,
          status: meeting.status,
          startedAt: startedAt?.toISOString() ?? null,
          endedAt: endedAt?.toISOString() ?? null,
          createdAt: meeting.createdAt.toISOString(),
          durationMinutes,
          isHost: meeting.hostId === user.id,
          hostName: meeting.host.name,
          participantCount: meeting._count.participants,
          participantsPreview: meeting.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            avatar: this.meetings.resolveAvatarUrl(p.user.avatarKey),
          })),
          messageCount: meeting._count.messages,
          attachmentCount,
          recordingCount,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  @Get(':code')
  @Public()
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Look up a meeting by code' })
  async get(@Param('code') code: string): Promise<MeetingDto> {
    return this.meetings.getByCode(code);
  }

  @Post(':code/guest-session')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Create a scoped guest session for an unauthenticated participant' })
  async createGuestSession(
    @Param('code') code: string,
    @Body() dto: CreateGuestSessionDto,
  ): Promise<GuestMeetingSessionDto> {
    return this.meetings.createGuestSession(code, dto.name);
  }

  @Patch(':code')
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Update a meeting (host only)' })
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingDto> {
    return this.meetings.updateTitle(code, user, dto.title);
  }

  @Post(':code/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a meeting as a participant' })
  async join(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ meeting: MeetingDto; participant: ParticipantDto }> {
    return this.meetings.join(code, user);
  }

  @Post(':code/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave the meeting' })
  async leave(@Param('code') code: string, @CurrentUser() user: RequestUser): Promise<void> {
    await this.meetings.leave(code, user);
  }

  @Post(':code/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the meeting (host only)' })
  async end(@Param('code') code: string, @CurrentUser() user: RequestUser): Promise<MeetingDto> {
    return this.meetings.end(code, user);
  }

  @Get(':code/participants')
  @ApiOperation({ summary: 'List currently active participants' })
  async participants(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ParticipantDto[]> {
    return this.meetings.listParticipants(code, user);
  }

  @Get(':code/ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Download .ics calendar file for a scheduled meeting' })
  async ics(@Param('code') code: string, @Res() reply: FastifyReply): Promise<void> {
    const { filename, content } = await this.meetings.getIcs(code);
    void reply.header('Content-Disposition', `attachment; filename="${filename}"`).send(content);
  }
}
