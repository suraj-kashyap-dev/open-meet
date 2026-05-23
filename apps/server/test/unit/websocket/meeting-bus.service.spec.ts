import type { Server } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MeetingBus } from '@/websocket/meeting-bus.service';

describe('MeetingBus', () => {
  let bus: MeetingBus;
  let emit: ReturnType<typeof vi.fn>;
  let to: ReturnType<typeof vi.fn>;
  let server: { to: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    bus = new MeetingBus();
    emit = vi.fn();
    to = vi.fn(() => ({ emit }));
    server = { to };
  });

  describe('emit()', () => {
    it('should drop the emit without throwing when no server is attached yet', () => {
      expect(() => bus.emit('room-1', 'evt', { a: 1 })).not.toThrow();
      expect(to).not.toHaveBeenCalled();
    });

    it('should route the emit to the room once a server is attached', () => {
      bus.attach(server as unknown as Server);
      bus.emit('room-1', 'evt', { a: 1 });
      expect(to).toHaveBeenCalledWith('room-1');
      expect(emit).toHaveBeenCalledWith('evt', { a: 1 });
    });
  });
});
