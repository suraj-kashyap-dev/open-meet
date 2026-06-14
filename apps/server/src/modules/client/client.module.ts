import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { MeetingsModule } from './meetings/meetings.module';
import { MessagingModule } from './messaging/messaging.module';
import { PushModule } from './push/push.module';
import { RecordingModule } from './recording/recording.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    AuthModule,
    SettingsModule,
    MeetingsModule,
    ChatModule,
    MessagingModule,
    RecordingModule,
    PushModule,
  ],
})
export class ClientModule {}
