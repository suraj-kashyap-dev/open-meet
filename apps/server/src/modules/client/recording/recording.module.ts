import { Module } from '@nestjs/common';

import { MeetingsModule } from '../meetings/meetings.module';
import { MeetingBusModule } from '../../../websocket/meeting-bus.module';

import { RecordingController } from './controllers/recording.controller';
import { RecordingEvents } from './recording.events';
import { RecordingRepository } from './repositories/recording.repository';
import { RecordingService } from './services/recording.service';

@Module({
  imports: [MeetingsModule, MeetingBusModule],
  controllers: [RecordingController],
  providers: [RecordingService, RecordingRepository, RecordingEvents],
  exports: [RecordingService, RecordingEvents],
})
export class RecordingModule {}
