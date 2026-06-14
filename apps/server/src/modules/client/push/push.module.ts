import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { MessagingModule } from '@/modules/client/messaging/messaging.module';
import { SettingsModule } from '@/modules/client/settings/settings.module';
import { PUSH_QUEUE } from './push.constants';
import { PushController } from './controllers/push.controller';
import { PushDispatchService } from './services/push-dispatch.service';
import { PushProcessor } from './push.processor';
import { PushRepository } from './repositories/push.repository';
import { PushService } from './services/push.service';

@Module({
  imports: [BullModule.registerQueue({ name: PUSH_QUEUE }), MessagingModule, SettingsModule],
  controllers: [PushController],
  providers: [PushService, PushRepository, PushDispatchService, PushProcessor],
  exports: [PushService],
})
export class PushModule {}
