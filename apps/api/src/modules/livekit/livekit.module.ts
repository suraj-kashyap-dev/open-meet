import { Module } from '@nestjs/common';

import { MeetingsModule } from '../meetings/meetings.module';

import { LiveKitController } from './livekit.controller';
import { LiveKitService } from './livekit.service';

@Module({
  imports: [MeetingsModule],
  controllers: [LiveKitController],
  providers: [LiveKitService],
  exports: [LiveKitService],
})
export class LiveKitModule {}
