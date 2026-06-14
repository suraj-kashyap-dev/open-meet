import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MeetingsModule } from '@/modules/client/meetings/meetings.module';
import { UploadsModule } from '@/modules/uploads/uploads.module';
import { MeetingBusModule } from '@/websocket/meeting-bus.module';
import { PUSH_QUEUE } from '@/modules/client/push/push.constants';

import { ChatGateway } from './gateways/chat.gateway';
import { ChatHistoryController } from './controllers/chat-history.controller';
import { ChatRepository } from './repositories/chat.repository';
import { ChatService } from './services/chat.service';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [
    MeetingsModule,
    UploadsModule,
    MeetingBusModule,
    JwtModule.register({}),
    BullModule.registerQueue({ name: PUSH_QUEUE }),
  ],
  controllers: [ChatHistoryController],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard],
})
export class ChatModule {}
