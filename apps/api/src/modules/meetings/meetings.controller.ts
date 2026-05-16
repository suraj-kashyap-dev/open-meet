import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type {
  MeetingDto,
  ParticipantDto,
} from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateMeetingDto } from './dto/create-meeting.dto';
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

  @Get(':code')
  @ApiParam({ name: 'code', example: 'abcd-efgh-ijkl' })
  @ApiOperation({ summary: 'Look up a meeting by code' })
  async get(@Param('code') code: string): Promise<MeetingDto> {
    return this.meetings.getByCode(code);
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
  async leave(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.meetings.leave(code, user.id);
  }

  @Post(':code/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the meeting (host only)' })
  async end(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<MeetingDto> {
    return this.meetings.end(code, user.id);
  }

  @Get(':code/participants')
  @ApiOperation({ summary: 'List currently active participants' })
  async participants(@Param('code') code: string): Promise<ParticipantDto[]> {
    return this.meetings.listParticipants(code);
  }
}
