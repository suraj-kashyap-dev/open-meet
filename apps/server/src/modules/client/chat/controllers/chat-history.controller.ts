import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { MessagePageDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { MessagesHistoryQueryDto } from '@/modules/client/meetings/dto/history-query.dto';
import { MeetingsService } from '@/modules/client/meetings/services/meetings.service';

import { ChatService } from '@/modules/client/chat/services/chat.service';

@ApiTags('meetings')
@Controller('meetings')
export class ChatHistoryController {
  constructor(
    private readonly chat: ChatService,
    private readonly meetings: MeetingsService,
  ) {}

  @Get(':code/messages')
  @ApiOperation({
    summary: 'Cursor-paginated message history (participants only). Older-first slice.',
  })
  async messages(
    @Param('code') code: string,
    @Query() query: MessagesHistoryQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MessagePageDto> {
    const { meetingId } = await this.meetings.assertParticipant(code, user.id);

    return this.chat.pagedHistory(meetingId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
