import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { MessagingModule } from '../messaging/messaging.module';
import { SettingsModule } from '../settings/settings.module';
import { PUSH_QUEUE } from './push.constants';
import { PushController } from './push.controller';
import { PushDispatchService } from './push-dispatch.service';
import { PushProcessor } from './push.processor';
import { PushRepository } from './push.repository';
import { PushService } from './push.service';

@Module({
  imports: [BullModule.registerQueue({ name: PUSH_QUEUE }), MessagingModule, SettingsModule],
  controllers: [PushController],
  providers: [PushService, PushRepository, PushDispatchService, PushProcessor],
  exports: [PushService],
})
export class PushModule {}
