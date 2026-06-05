import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UploadsModule } from '../../uploads/uploads.module';
import { WsJwtGuard } from '../chat/ws-jwt.guard';
import { PUSH_QUEUE } from '../push/push.constants';

import { ActivityService } from './activity.service';
import { ChatBus } from './chat-bus.service';
import { ChatPermissionsRepository } from './chat-permissions.repository';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationGateway } from './conversation.gateway';
import { ConversationStateService } from './conversation-state.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsRepository } from './conversations.repository';
import { ConversationsService } from './conversations.service';
import { GifsService } from './gifs.service';
import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';
import { MessagesController } from './messages.controller';
import { MessagesRepository } from './messages.repository';
import { MessagesService } from './messages.service';
import { MessagingSerializer } from './messaging.serializer';
import { PinsRepository } from './pins.repository';
import { PinsService } from './pins.service';
import { PollsController } from './polls.controller';
import { PollsRepository } from './polls.repository';
import { PollsService } from './polls.service';
import { PresenceRepository } from './presence.repository';
import { PresenceService } from './presence.service';
import { ReactionsService } from './reactions.service';
import { ReadStateService } from './read-state.service';
import { SavedRepository } from './saved.repository';
import { SavedService } from './saved.service';
import { TeammatesController } from './teammates.controller';
import { TeammatesRepository } from './teammates.repository';
import { TeammatesService } from './teammates.service';

@Module({
  imports: [UploadsModule, JwtModule.register({}), BullModule.registerQueue({ name: PUSH_QUEUE })],
  controllers: [
    ConversationsController,
    GroupsController,
    MessagesController,
    PollsController,
    TeammatesController,
  ],
  providers: [
    ConversationGateway,
    WsJwtGuard,
    ChatBus,
    MessagingSerializer,
    PresenceRepository,
    PresenceService,
    GifsService,
    ConversationStateService,
    ChatPermissionsRepository,
    ChatPermissionsService,
    ConversationsRepository,
    ConversationsService,
    MessagesRepository,
    MessagesService,
    ReactionsService,
    PollsRepository,
    PollsService,
    ReadStateService,
    PinsRepository,
    PinsService,
    SavedRepository,
    SavedService,
    ActivityService,
    TeammatesRepository,
    TeammatesService,
    GroupsRepository,
    GroupsService,
  ],
  exports: [PresenceService, ConversationsService, ChatBus, ChatPermissionsService],
})
export class MessagingModule {}
