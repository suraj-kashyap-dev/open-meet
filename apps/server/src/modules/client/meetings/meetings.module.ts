import { Module } from '@nestjs/common';

import { MailModule } from '../../../integrations/mail/mail.module';
import { MeetingBusModule } from '../../../websocket/meeting-bus.module';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../../config/config.module';

import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [MailModule, AuthModule, AppConfigModule, MeetingBusModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository],
  exports: [MeetingsService],
})
export class MeetingsModule {}
