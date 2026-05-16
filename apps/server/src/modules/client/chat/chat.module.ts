import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MeetingsModule } from '../meetings/meetings.module';
import { UploadsModule } from '../../uploads/uploads.module';

import { ChatGateway } from './chat.gateway';
import { ChatHistoryController } from './chat-history.controller';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [MeetingsModule, UploadsModule, JwtModule.register({})],
  controllers: [ChatHistoryController],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard],
})
export class ChatModule {}
