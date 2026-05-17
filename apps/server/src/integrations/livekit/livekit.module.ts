import { Module } from '@nestjs/common';

import { AuthModule } from '../../modules/client/auth/auth.module';
import { MeetingsModule } from '../../modules/client/meetings/meetings.module';

import { LiveKitController } from './livekit.controller';
import { LiveKitService } from './livekit.service';

@Module({
  imports: [MeetingsModule, AuthModule],
  controllers: [LiveKitController],
  providers: [LiveKitService],
  exports: [LiveKitService],
})
export class LiveKitModule {}
