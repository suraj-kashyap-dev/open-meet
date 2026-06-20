import { Module } from '@nestjs/common';

import { MailModule } from '../../../integrations/mail/mail.module';
import { MeetingBusModule } from '../../../websocket/meeting-bus.module';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../../config/config.module';

import { MeetingsController } from './controllers/meetings.controller';
import { MeetingsRepository } from './repositories/meetings.repository';
import { MeetingsService } from './services/meetings.service';

@Module({
  imports: [MailModule, AuthModule, AppConfigModule, MeetingBusModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository],
  exports: [MeetingsService],
})
export class MeetingsModule {}
