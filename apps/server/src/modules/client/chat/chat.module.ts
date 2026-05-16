import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MeetingsModule } from '../meetings/meetings.module';

import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [MeetingsModule, JwtModule.register({})],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard],
})
export class ChatModule {}
