import { Injectable } from '@nestjs/common';

import type { RecordingDto } from '@open-meet/types';
import { ServerEvent } from '@open-meet/types';

import { MeetingBus } from '@/websocket/services/meeting-bus.service';

@Injectable()
export class RecordingEvents {
  constructor(private readonly bus: MeetingBus) {}

  emitStarted(meetingCode: string, recording: RecordingDto): void {
    this.bus.emit(meetingCode, ServerEvent.RECORDING_STARTED, { recording });
  }

  emitStopped(meetingCode: string, recording: RecordingDto): void {
    this.bus.emit(meetingCode, ServerEvent.RECORDING_STOPPED, { recording });
  }
}
