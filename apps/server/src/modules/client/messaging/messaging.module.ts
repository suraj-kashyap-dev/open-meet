import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UploadsModule } from '../../uploads/uploads.module';
import { WsJwtGuard } from '../chat/ws-jwt.guard';
import { PUSH_QUEUE } from '../push/push.constants';

import { ActivityService } from './services/activity.service';
import { ChatBus } from './services/chat-bus.service';
import { ChatPermissionsRepository } from './repositories/chat-permissions.repository';
import { ChatPermissionsService } from './services/chat-permissions.service';
import { ConversationGateway } from './gateways/conversation.gateway';
import { ConversationStateService } from './services/conversation-state.service';
import { ConversationsController } from './controllers/conversations.controller';
import { ConversationsRepository } from './repositories/conversations.repository';
import { ConversationsService } from './services/conversations.service';
import { GifsService } from './services/gifs.service';
import { GroupsController } from './controllers/groups.controller';
import { GroupsRepository } from './repositories/groups.repository';
import { GroupsService } from './services/groups.service';
import { MessagesController } from './controllers/messages.controller';
import { MessagesRepository } from './repositories/messages.repository';
import { MessagesService } from './services/messages.service';
import { MessagingSerializer } from './messaging.serializer';
import { PinsRepository } from './repositories/pins.repository';
import { PinsService } from './services/pins.service';
import { PollsController } from './controllers/polls.controller';
import { PollsRepository } from './repositories/polls.repository';
import { PollsService } from './services/polls.service';
import { PresenceRepository } from './repositories/presence.repository';
import { PresenceService } from './services/presence.service';
import { ReactionsService } from './services/reactions.service';
import { ReadStateService } from './services/read-state.service';
import { SavedRepository } from './repositories/saved.repository';
import { SavedService } from './services/saved.service';
import { TeammatesController } from './controllers/teammates.controller';
import { TeammatesRepository } from './repositories/teammates.repository';
import { TeammatesService } from './services/teammates.service';

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
