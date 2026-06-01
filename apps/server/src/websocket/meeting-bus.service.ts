import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class MeetingBus {
  private readonly logger = new Logger(MeetingBus.name);

  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  emit(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`emit("${event}") dropped - socket server not attached yet`);

      return;
    }

    this.server.to(room).emit(event, payload);
  }
}
