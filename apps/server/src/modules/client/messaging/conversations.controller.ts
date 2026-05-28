import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import type { UserPresenceDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../../common/decorators/current-user.decorator';

import { ActivityService } from './activity.service';
import { ChannelsService } from './channels.service';
import { ConversationStateService } from './conversation-state.service';
import { ConversationsService } from './conversations.service';
import {
  ConversationStateBodyDto,
  CreatePollBodyDto,
  GifsQueryDto,
  MarkReadBodyDto,
  MessagesHistoryQueryDto,
  OpenDirectBodyDto,
  SendMessageBodyDto,
} from './dto/messaging.dto';
import { GifsService } from './gifs.service';
import { MessagesService } from './messages.service';
import { PinsService } from './pins.service';
import { PollsService } from './polls.service';
import { PresenceService } from './presence.service';
import { ReadStateService } from './read-state.service';
import { SavedService } from './saved.service';

@Controller('messaging')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly readState: ReadStateService,
    private readonly polls: PollsService,
    private readonly pins: PinsService,
    private readonly saved: SavedService,
    private readonly conversationState: ConversationStateService,
    private readonly presence: PresenceService,
    private readonly gifs: GifsService,
    private readonly channels: ChannelsService,
    private readonly activity: ActivityService,
  ) {}

  @Get('teams')
  teams(@CurrentUser() user: RequestUser) {
    return this.channels.listMyTeams(user.id);
  }

  @Get('activity')
  activityFeed(@CurrentUser() user: RequestUser) {
    return this.activity.feed(user.id);
  }

  @Get('threads/:rootId')
  thread(@CurrentUser() user: RequestUser, @Param('rootId') rootId: string) {
    return this.channels.thread(rootId, user.id);
  }

  @Get('conversations')
  list(@CurrentUser() user: RequestUser, @Query('includeHidden') includeHidden?: string) {
    return this.conversations.list(user.id, {
      includeHidden: includeHidden === '1' || includeHidden === 'true',
    });
  }

  @Post('conversations/direct')
  openDirect(@CurrentUser() user: RequestUser, @Body() body: OpenDirectBodyDto) {
    return this.conversations.openDirect(user.id, body.targetUserId);
  }

  @Get('unread')
  unread(@CurrentUser() user: RequestUser) {
    return this.readState.summary(user.id);
  }

  @Get('saved')
  saved_(@CurrentUser() user: RequestUser) {
    return this.saved.list(user.id);
  }

  @Get('gifs')
  gifs_(@Query() query: GifsQueryDto) {
    return this.gifs.search(query.q);
  }

  @Get('presence/me')
  async presenceMe(@CurrentUser() user: RequestUser): Promise<UserPresenceDto> {
    const snap = await this.presence.forUser(user.id);
    return {
      userId: user.id,
      online: snap.online,
      status: snap.status,
      customText: snap.customText,
      lastSeen: snap.lastSeen,
    };
  }

  @Patch('conversations/:id/state')
  setState(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: ConversationStateBodyDto,
  ) {
    return this.conversationState.setState(id, user.id, body);
  }

  @Get('conversations/:id/pins')
  pins_(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.pins.list(id, user.id);
  }

  @Get('conversations/:id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.getById(id, user.id);
  }

  @Get('conversations/:id/messages')
  history(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query() query: MessagesHistoryQueryDto,
  ) {
    return this.messages.history(id, user.id, { cursor: query.cursor, limit: query.limit });
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: SendMessageBodyDto,
  ) {
    return this.messages.send({
      conversationId: id,
      senderId: user.id,
      content: body.content,
      attachmentIds: body.attachmentIds,
      parentId: body.parentId,
      priority: body.priority,
      clientNonce: body.clientNonce,
    });
  }

  @Post('conversations/:id/read')
  read(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: MarkReadBodyDto) {
    return this.readState.markRead(id, user.id, body.messageId);
  }

  @Post('conversations/:id/polls')
  createPoll(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: CreatePollBodyDto,
  ) {
    return this.polls.create(id, user.id, body);
  }
}
