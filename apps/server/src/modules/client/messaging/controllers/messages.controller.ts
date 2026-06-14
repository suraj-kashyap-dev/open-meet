import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';

import {
  EditMessageBodyDto,
  ForwardMessageBodyDto,
  ReactionBodyDto,
} from '@/modules/client/messaging/dto/messaging.dto';
import { MessagesService } from '@/modules/client/messaging/services/messages.service';
import { PinsService } from '@/modules/client/messaging/services/pins.service';
import { ReactionsService } from '@/modules/client/messaging/services/reactions.service';
import { SavedService } from '@/modules/client/messaging/services/saved.service';

@Controller('messaging/messages')
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly reactions: ReactionsService,
    private readonly pins: PinsService,
    private readonly saved: SavedService,
  ) {}

  @Patch(':id')
  edit(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: EditMessageBodyDto,
  ) {
    return this.messages.edit(id, user.id, body.content);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.messages.remove(id, user.id);
  }

  @Post(':id/forward')
  forward(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: ForwardMessageBodyDto,
  ) {
    return this.messages.forward(id, user.id, body.targetConversationId);
  }

  @Post(':id/reactions')
  react(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: ReactionBodyDto) {
    return this.reactions.add(id, user.id, body.emoji);
  }

  @Delete(':id/reactions/:emoji')
  unreact(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('emoji') emoji: string,
  ) {
    return this.reactions.remove(id, user.id, decodeURIComponent(emoji));
  }

  @Post(':id/pin')
  pin(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.pins.pin(id, user.id);
  }

  @Delete(':id/pin')
  @HttpCode(HttpStatus.OK)
  unpin(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.pins.unpin(id, user.id);
  }

  @Post(':id/save')
  save(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.saved.save(id, user.id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  unsave(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.saved.unsave(id, user.id);
  }
}
