import { Module } from '@nestjs/common';

import { LiveKitModule } from '../../../integrations/livekit/livekit.module';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminMeetingsController } from './controllers/meetings.controller';
import { AdminMeetingsService } from './services/meetings.service';
import { AdminMeetingsRepository } from './repositories/meetings.repository';

@Module({
  imports: [LiveKitModule, AdminRbacModule],
  controllers: [AdminMeetingsController],
  providers: [AdminMeetingsService, AdminMeetingsRepository],
})
export class AdminMeetingsModule {}
