import { Module } from '@nestjs/common';

import { MeetingsModule } from '../meetings/meetings.module';
import { MeetingBusModule } from '../../../websocket/meeting-bus.module';

import { RecordingController } from './recording.controller';
import { RecordingEvents } from './recording.events';
import { RecordingRepository } from './recording.repository';
import { RecordingService } from './recording.service';

@Module({
  imports: [MeetingsModule, MeetingBusModule],
  controllers: [RecordingController],
  providers: [RecordingService, RecordingRepository, RecordingEvents],
  exports: [RecordingService, RecordingEvents],
})
export class RecordingModule {}
