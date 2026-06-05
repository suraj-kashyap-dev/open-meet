import type { Server } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatBus, conversationRoom, userRoom } from '@/modules/client/messaging/chat-bus.service';

describe('ChatBus', () => {
  let bus: ChatBus;
  let emit: ReturnType<typeof vi.fn>;
  let to: ReturnType<typeof vi.fn>;
  let fetchSockets: ReturnType<typeof vi.fn>;
  let inMock: ReturnType<typeof vi.fn>;
  let server: {
    to: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    bus = new ChatBus();
    emit = vi.fn();
    to = vi.fn(() => ({ emit }));
    fetchSockets = vi.fn().mockResolvedValue([]);
    inMock = vi.fn(() => ({ fetchSockets }));
    server = { to, in: inMock };
  });

  describe('emit()', () => {
    it('should drop the emit without throwing when no server is attached', () => {
      expect(() => bus.emit('room-1', 'evt', { a: 1 })).not.toThrow();
      expect(to).not.toHaveBeenCalled();
    });

    it('should route the emit to the room when a server is attached', () => {
      bus.attach(server as unknown as Server);
      bus.emit('room-1', 'evt', { a: 1 });
      expect(to).toHaveBeenCalledWith('room-1');
      expect(emit).toHaveBeenCalledWith('evt', { a: 1 });
    });
  });

  describe('emitToRooms()', () => {
    it('should do nothing when no server is attached', () => {
      bus.emitToRooms(['r1'], 'evt', {});
      expect(to).not.toHaveBeenCalled();
    });

    it('should do nothing for an empty room list', () => {
      bus.attach(server as unknown as Server);
      bus.emitToRooms([], 'evt', {});
      expect(to).not.toHaveBeenCalled();
    });

    it('should emit to all rooms at once', () => {
      bus.attach(server as unknown as Server);
      bus.emitToRooms(['r1', 'r2'], 'evt', { a: 1 });
      expect(to).toHaveBeenCalledWith(['r1', 'r2']);
      expect(emit).toHaveBeenCalledWith('evt', { a: 1 });
    });
  });

  describe('roomHasSockets()', () => {
    it('should return null when no server is attached', async () => {
      await expect(bus.roomHasSockets('r1')).resolves.toBeNull();
    });

    it('should return false when the room is empty', async () => {
      bus.attach(server as unknown as Server);
      fetchSockets.mockResolvedValue([]);
      await expect(bus.roomHasSockets('r1')).resolves.toBe(false);
      expect(inMock).toHaveBeenCalledWith('r1');
    });

    it('should return true when the room has sockets', async () => {
      bus.attach(server as unknown as Server);
      fetchSockets.mockResolvedValue([{}, {}]);
      await expect(bus.roomHasSockets('r1')).resolves.toBe(true);
    });
  });

  describe('disconnectRoom()', () => {
    it('should return 0 when no server is attached', async () => {
      await expect(bus.disconnectRoom('r1')).resolves.toBe(0);
    });

    it('should disconnect every socket in the room and return the count', async () => {
      const s1 = { disconnect: vi.fn() };
      const s2 = { disconnect: vi.fn() };
      fetchSockets.mockResolvedValue([s1, s2]);
      bus.attach(server as unknown as Server);

      await expect(bus.disconnectRoom('r1')).resolves.toBe(2);
      expect(inMock).toHaveBeenCalledWith('r1');
      expect(s1.disconnect).toHaveBeenCalledWith(true);
      expect(s2.disconnect).toHaveBeenCalledWith(true);
    });

    it('should return 0 when the room is empty', async () => {
      fetchSockets.mockResolvedValue([]);
      bus.attach(server as unknown as Server);
      await expect(bus.disconnectRoom('r1')).resolves.toBe(0);
    });
  });

  describe('room helpers', () => {
    it('should build a conversation room key', () => {
      expect(conversationRoom('c1')).toBe('conversation:c1');
    });

    it('should build a user room key', () => {
      expect(userRoom('u1')).toBe('user:u1');
    });
  });
});
