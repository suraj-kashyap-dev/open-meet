import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type {
  MeetingDto,
  MeetingHistoryItemDto,
  MeetingHistoryListResponseDto,
  ParticipantDto,
} from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../../common/decorators/current-user.decorator';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new meeting' })
  async create(
    @Body() dto: CreateMeetingDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingDto> {
    return this.meetings.create(user.id, dto.title);
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
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Look up a meeting by code' })
  async get(@Param('code') code: string): Promise<MeetingDto> {
    return this.meetings.getByCode(code);
  }

  @Patch(':code')
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Update a meeting (host only)' })
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingDto> {
    return this.meetings.updateTitle(code, user.id, dto.title);
  }

  @Post(':code/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a meeting as a participant' })
  async join(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ meeting: MeetingDto; participant: ParticipantDto }> {
    return this.meetings.join(code, user.id);
  }

  @Post(':code/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave the meeting' })
  async leave(@Param('code') code: string, @CurrentUser() user: RequestUser): Promise<void> {
    await this.meetings.leave(code, user.id);
  }

  @Post(':code/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the meeting (host only)' })
  async end(@Param('code') code: string, @CurrentUser() user: RequestUser): Promise<MeetingDto> {
    return this.meetings.end(code, user.id);
  }

  @Get(':code/participants')
  @ApiOperation({ summary: 'List currently active participants' })
  async participants(@Param('code') code: string): Promise<ParticipantDto[]> {
    return this.meetings.listParticipants(code);
  }
}
