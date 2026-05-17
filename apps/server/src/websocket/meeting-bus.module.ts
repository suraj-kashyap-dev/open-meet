import { Module } from '@nestjs/common';

import { MeetingBus } from './meeting-bus.service';

@Module({
  providers: [MeetingBus],
  exports: [MeetingBus],
})
export class MeetingBusModule {}
