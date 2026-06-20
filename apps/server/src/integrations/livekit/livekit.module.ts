import { Module } from '@nestjs/common';

import { AuthModule } from '../../modules/client/auth/auth.module';
import { MeetingsModule } from '../../modules/client/meetings/meetings.module';
import { RecordingModule } from '../../modules/client/recording/recording.module';

import { LiveKitController } from './controllers/livekit.controller';
import { LiveKitService } from './services/livekit.service';

@Module({
  imports: [MeetingsModule, AuthModule, RecordingModule],
  controllers: [LiveKitController],
  providers: [LiveKitService],
  exports: [LiveKitService],
})
export class LiveKitModule {}
