import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServerEvent } from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import type { MeetingsService } from '@/modules/client/meetings/meetings.service';
import type { ChatService } from '@/modules/client/chat/chat.service';
import type { MeetingBus } from '@/websocket/meeting-bus.service';
import { ChatGateway } from '@/modules/client/chat/chat.gateway';
import type { SocketUser } from '@/modules/client/chat/ws-auth.util';

const USER: SocketUser = { id: 'u1', email: 'a@x.com', name: 'Alice' };
const GUEST_USER: SocketUser = {
  id: 'g1',
  email: 'guest@x.com',
  name: 'Guest',
  isGuest: true,
  guestMeetingCode: 'guest-room',
};

function makeServer() {
  const emits: Array<{ room: string; event: string; payload: unknown }> = [];
  let hostSockets: unknown[] = [];
  const server = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emits.push({ room, event, payload }),
    }),
    in: () => ({ fetchSockets: () => Promise.resolve(hostSockets) }),
  } as unknown as Server;
  return {
    server,
    emits,
    setHostPresent: (present: boolean) => {
      hostSockets = present ? [{}] : [];
    },
  };
}

function makeClient(
  user: SocketUser | undefined,
  handshake: Record<string, unknown> = { auth: {}, headers: {} },
) {
  const emits: Array<{ event: string; payload: unknown }> = [];
  const toEmits: Array<{ room: string; event: string; payload: unknown }> = [];
  const client = {
    id: 'sock1',
    data: { user },
    rooms: new Set<string>(['sock1']),
    handshake,
    join: vi.fn(),
    leave: vi.fn(),
    disconnect: vi.fn(),
    emit: (event: string, payload: unknown) => emits.push({ event, payload }),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => toEmits.push({ room, event, payload }),
    }),
  };
  return { client, emits, toEmits };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chat: { send: ReturnType<typeof vi.fn> };
  let meetings: Record<string, ReturnType<typeof vi.fn>>;
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let srv: ReturnType<typeof makeServer>;

  beforeEach(() => {
    chat = { send: vi.fn().mockResolvedValue({ id: 'msg1', content: 'hi' }) };
    meetings = {
      join: vi.fn().mockResolvedValue({
        meeting: { id: 'm1', code: 'abc', hostId: 'h1' },
        participant: { id: 'p1' },
      }),
      leave: vi.fn().mockResolvedValue(undefined),
      findRawByCode: vi.fn().mockResolvedValue({ id: 'm1', code: 'abc', hostId: 'h2' }),
    };
    jwt = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'u1', email: 'a@x.com', name: 'Alice' }),
    };
    const config = { getOrThrow: () => 'secret' } as unknown as ConfigService<ApiEnv, true>;
    const bus = { attach: vi.fn() } as unknown as MeetingBus;
    gateway = new ChatGateway(
      chat as unknown as ChatService,
      meetings as unknown as MeetingsService,
      jwt as unknown as JwtService,
      config,
      bus,
    );
    srv = makeServer();
    gateway.server = srv.server;
  });

  describe('handleConnection()', () => {
    it('should authenticate and attach the user from the token', async () => {
      const { client } = makeClient(undefined, { auth: { token: 'tok' }, headers: {} });
      await gateway.handleConnection(client as never);
      expect(client.data.user).toEqual({
        id: 'u1',
        email: 'a@x.com',
        name: 'Alice',
        isGuest: false,
        guestMeetingCode: null,
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect when no token is present', async () => {
      const { client } = makeClient(undefined, { auth: {}, headers: {} });
      await gateway.handleConnection(client as never);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('requireUser (auth on handlers)', () => {
    it('should reject an unauthenticated socket', async () => {
      const { client } = makeClient(undefined);
      await expect(
        gateway.onReaction(client as never, { meetingCode: 'abc', emoji: '👍' }),
      ).rejects.toBeInstanceOf(WsException);
    });
  });

  describe('onJoin()', () => {
    it('should join the meeting room and notify others for a non-host', async () => {
      const { client, toEmits } = makeClient(USER);
      await gateway.onJoin(client as never, { meetingCode: 'abc' });
      expect(client.join).toHaveBeenCalledWith('abc');
      expect(client.join).not.toHaveBeenCalledWith('host:abc');
      expect(toEmits).toContainEqual({
        room: 'abc',
        event: ServerEvent.PARTICIPANT_JOINED,
        payload: { participant: { id: 'p1' } },
      });
    });

    it('should also join the host room when the joiner is the host', async () => {
      meetings.join.mockResolvedValueOnce({
        meeting: { id: 'm1', code: 'abc', hostId: 'u1' },
        participant: { id: 'p1' },
      });
      const { client } = makeClient(USER);
      await gateway.onJoin(client as never, { meetingCode: 'abc' });
      expect(client.join).toHaveBeenCalledWith('abc');
      expect(client.join).toHaveBeenCalledWith('host:abc');
    });
  });

  describe('onLeave()', () => {
    it('should leave the room and broadcast PARTICIPANT_LEFT', async () => {
      const { client } = makeClient(USER);
      await gateway.onLeave(client as never, { meetingCode: 'abc' });
      expect(meetings.leave).toHaveBeenCalledWith('abc', USER);
      expect(client.leave).toHaveBeenCalledWith('abc');
      expect(srv.emits).toContainEqual({
        room: 'abc',
        event: ServerEvent.PARTICIPANT_LEFT,
        payload: { participantId: 'u1' },
      });
    });
  });

  describe('onChatSend()', () => {
    it('should reject an empty message with no attachments', async () => {
      const { client } = makeClient(USER);
      await expect(
        gateway.onChatSend(client as never, { meetingCode: 'abc', content: '   ' }),
      ).rejects.toBeInstanceOf(WsException);
      expect(chat.send).not.toHaveBeenCalled();
    });

    it('should reject when the meeting is unknown', async () => {
      meetings.findRawByCode.mockResolvedValueOnce(null);
      const { client } = makeClient(USER);
      await expect(
        gateway.onChatSend(client as never, { meetingCode: 'abc', content: 'hi' }),
      ).rejects.toBeInstanceOf(WsException);
    });

    it('should persist and broadcast a valid message', async () => {
      const { client } = makeClient(USER);
      await gateway.onChatSend(client as never, {
        meetingCode: 'abc',
        content: ' hi ',
        attachmentIds: ['a1'],
      });
      expect(chat.send).toHaveBeenCalledWith({
        meetingId: 'm1',
        senderId: 'u1',
        content: 'hi',
        attachmentIds: ['a1'],
      });
      expect(srv.emits).toContainEqual({
        room: 'abc',
        event: ServerEvent.CHAT_MESSAGE,
        payload: { id: 'msg1', content: 'hi' },
      });
    });
  });

  describe('onReaction()', () => {
    it('should broadcast the reaction to the room', async () => {
      const { client } = makeClient(USER);
      await gateway.onReaction(client as never, { meetingCode: 'abc', emoji: '🎉' });
      expect(srv.emits).toContainEqual({
        room: 'abc',
        event: ServerEvent.REACTION_RECEIVED,
        payload: { emoji: '🎉', senderId: 'u1', senderName: 'Alice' },
      });
    });

    it('should reject a guest token targeting a different meeting code', async () => {
      const { client } = makeClient(GUEST_USER);
      await expect(
        gateway.onReaction(client as never, { meetingCode: 'abc', emoji: '🎉' }),
      ).rejects.toBeInstanceOf(WsException);
    });
  });

  describe('onKnock()', () => {
    it('should immediately deny the knock when no host is present', async () => {
      srv.setHostPresent(false);
      const { client, emits } = makeClient(USER);
      await gateway.onKnock(client as never, { meetingCode: 'abc' });
      expect(emits.some((e) => e.event === ServerEvent.KNOCK_RESOLVED)).toBe(true);
    });

    it('should notify the host room when a host is present', async () => {
      srv.setHostPresent(true);
      const { client } = makeClient(USER);
      await gateway.onKnock(client as never, { meetingCode: 'abc' });
      expect(
        srv.emits.some((e) => e.room === 'host:abc' && e.event === ServerEvent.KNOCK_REQUESTED),
      ).toBe(true);
    });

    it('should reject a knock from the host themselves', async () => {
      meetings.findRawByCode.mockResolvedValueOnce({ id: 'm1', code: 'abc', hostId: 'u1' });
      const { client } = makeClient(USER);
      await expect(gateway.onKnock(client as never, { meetingCode: 'abc' })).rejects.toBeInstanceOf(
        WsException,
      );
    });
  });

  describe('onKnockRespond()', () => {
    it('should reject a non-host responder', async () => {
      const { client } = makeClient(USER); // meeting hostId is h2, user is u1
      await expect(
        gateway.onKnockRespond(client as never, { meetingCode: 'abc', userId: 'u9', admit: true }),
      ).rejects.toBeInstanceOf(WsException);
    });
  });

  describe('onHandRaise()', () => {
    it('should broadcast HAND_RAISED to the room', async () => {
      const { client } = makeClient(USER);
      await gateway.onHandRaise(client as never, { meetingCode: 'abc' });
      expect(srv.emits).toContainEqual({
        room: 'abc',
        event: ServerEvent.HAND_RAISED,
        payload: { userId: 'u1', name: 'Alice' },
      });
    });
  });
});
