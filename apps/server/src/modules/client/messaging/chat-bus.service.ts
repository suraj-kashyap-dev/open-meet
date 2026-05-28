import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * Holds the `/chat` socket.io server so non-gateway code (REST services) can
 * emit into chat rooms — keeping HTTP and WebSocket message flows consistent.
 * Mirrors MeetingBus. Emits fan out across instances via the Redis adapter.
 */
@Injectable()
export class ChatBus {
  private readonly logger = new Logger(ChatBus.name);

  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  emit(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`emit("${event}") dropped — chat socket server not attached yet`);
      return;
    }

    this.server.to(room).emit(event, payload);
  }

  /** Emit the same payload to several rooms (e.g. every member's personal room). */
  emitToRooms(rooms: string[], event: string, payload: unknown): void {
    if (!this.server || rooms.length === 0) {
      return;
    }

    this.server.to(rooms).emit(event, payload);
  }
}

export const conversationRoom = (conversationId: string): string => `conversation:${conversationId}`;
export const userRoom = (userId: string): string => `user:${userId}`;
