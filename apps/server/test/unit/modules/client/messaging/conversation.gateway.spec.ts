import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { ConversationGateway } from '@/modules/client/messaging/gateways/conversation.gateway';
import { type ChatBus } from '@/modules/client/messaging/services/chat-bus.service';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';
import { type MessagesService } from '@/modules/client/messaging/services/messages.service';
import { type ReactionsService } from '@/modules/client/messaging/services/reactions.service';
import { type ReadStateService } from '@/modules/client/messaging/services/read-state.service';
import { type PollsService } from '@/modules/client/messaging/services/polls.service';
import { type PresenceService } from '@/modules/client/messaging/services/presence.service';
import type { SocketUser } from '@/modules/client/chat/ws-auth.util';

const USER: SocketUser = { id: 'u1', email: 'a@x.com', name: 'Alice' };

function makeServer() {
  const emits: Array<{ room: string; event: string; payload: unknown }> = [];
  const server = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emits.push({ room, event, payload }),
    }),
  } as unknown as Server;

  return { server, emits };
}

function makeClient(
  user: SocketUser | undefined,
  rooms: string[] = ['sock1'],
  handshake: Record<string, unknown> = { auth: { token: 'tok' }, headers: {} },
) {
  const toEmits: Array<{ room: string; event: string; payload: unknown }> = [];
  const client = {
    id: 'sock1',
    data: { user },
    rooms: new Set<string>(rooms),
    handshake,
    join: vi.fn(),
    leave: vi.fn(),
    disconnect: vi.fn(),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => toEmits.push({ room, event, payload }),
    }),
  };

  return { client, toEmits };
}

describe('ConversationGateway', () => {
  let gateway: ConversationGateway;
  let bus: { attach: ReturnType<typeof vi.fn> };
  let conversations: { conversationIdsForUser: ReturnType<typeof vi.fn> };
  let permissions: { assertConversationMember: ReturnType<typeof vi.fn> };
  let messages: {
    send: ReturnType<typeof vi.fn>;
    edit: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let reactions: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let readState: { markRead: ReturnType<typeof vi.fn> };
  let polls: { vote: ReturnType<typeof vi.fn> };
  let presence: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    forUser: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
  };
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let srv: ReturnType<typeof makeServer>;

  beforeEach(() => {
    bus = { attach: vi.fn() };

    conversations = { conversationIdsForUser: vi.fn().mockResolvedValue(['c1', 'c2']) };

    permissions = { assertConversationMember: vi.fn() };

    messages = { send: vi.fn(), edit: vi.fn(), remove: vi.fn() };

    reactions = { add: vi.fn(), remove: vi.fn() };

    readState = { markRead: vi.fn() };

    polls = { vote: vi.fn() };

    presence = {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(true),
      forUser: vi.fn().mockResolvedValue({
        online: true,
        status: 'ONLINE',
        customText: null,
        lastSeen: null,
      }),
      setStatus: vi.fn(),
    };

    jwt = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'u1', email: 'a@x.com', name: 'Alice' }),
    };
    const config = { getOrThrow: () => 'secret' } as unknown as ConfigService<ApiEnv, true>;

    gateway = new ConversationGateway(
      jwt as unknown as JwtService,
      config,
      bus as unknown as ChatBus,
      conversations as unknown as ConversationsRepository,
      permissions as unknown as ChatPermissionsService,
      messages as unknown as MessagesService,
      reactions as unknown as ReactionsService,
      readState as unknown as ReadStateService,
      polls as unknown as PollsService,
      presence as unknown as PresenceService,
    );

    srv = makeServer();

    gateway.server = srv.server;
  });

  describe('afterInit()', () => {
    it('should attach the server to the chat bus', () => {
      gateway.afterInit(srv.server);

      expect(bus.attach).toHaveBeenCalledWith(srv.server);
    });
  });

  describe('handleConnection()', () => {
    it('should join the user and conversation rooms and broadcast presence', async () => {
      const { client } = makeClient(undefined);

      await gateway.handleConnection(client as never);

      expect(client.data.user).toEqual({ id: 'u1', email: 'a@x.com', name: 'Alice' });

      expect(client.join).toHaveBeenCalledWith('user:u1');

      expect(client.join).toHaveBeenCalledWith('conversation:c1');

      expect(client.join).toHaveBeenCalledWith('conversation:c2');

      expect(srv.emits.some((e) => e.event === ChatServerEvent.PRESENCE_UPDATE)).toBe(true);
    });

    it('should not broadcast presence when connect reports no transition', async () => {
      presence.connect.mockResolvedValue(false);
      const { client } = makeClient(undefined);

      await gateway.handleConnection(client as never);

      expect(srv.emits).toHaveLength(0);
    });

    it('should disconnect when no token is present', async () => {
      const { client } = makeClient(undefined, ['sock1'], { auth: {}, headers: {} });

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalledWith(true);

      expect(jwt.verifyAsync).not.toHaveBeenCalled();
    });

    it('should disconnect when token verification fails', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      const { client } = makeClient(undefined);

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject guest tokens', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'g1',
        email: 'g@x.com',
        name: 'Guest',
        guest: true,
      });
      const { client } = makeClient(undefined);

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect()', () => {
    it('should do nothing when the socket has no user', async () => {
      const { client } = makeClient(undefined);

      await gateway.handleDisconnect(client as never);

      expect(presence.disconnect).not.toHaveBeenCalled();
    });

    it('should broadcast presence when disconnect reports a transition', async () => {
      const { client } = makeClient(USER);

      await gateway.handleDisconnect(client as never);

      expect(presence.disconnect).toHaveBeenCalledWith('u1');

      expect(srv.emits.some((e) => e.event === ChatServerEvent.PRESENCE_UPDATE)).toBe(true);
    });
  });

  describe('requireUser', () => {
    it('should reject an unauthenticated socket', async () => {
      const { client } = makeClient(undefined);

      await expect(
        gateway.onSend(client as never, { conversationId: 'c1', content: 'hi' }),
      ).rejects.toBeInstanceOf(WsException);

      expect(messages.send).not.toHaveBeenCalled();
    });
  });

  describe('onJoin()', () => {
    it('should assert membership then join the room', async () => {
      const { client } = makeClient(USER);
      const result = await gateway.onJoin(client as never, { conversationId: 'c1' });

      expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

      expect(client.join).toHaveBeenCalledWith('conversation:c1');

      expect(result).toEqual({ joined: true });
    });

    it('should translate a permission HttpException into a WsException', async () => {
      permissions.assertConversationMember.mockRejectedValue(
        new ForbiddenException({ code: 'X', message: 'no' }),
      );
      const { client } = makeClient(USER);

      await expect(
        gateway.onJoin(client as never, { conversationId: 'c1' }),
      ).rejects.toBeInstanceOf(WsException);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('onLeave()', () => {
    it('should leave the conversation room', async () => {
      const { client } = makeClient(USER);
      const result = await gateway.onLeave(client as never, { conversationId: 'c1' });

      expect(client.leave).toHaveBeenCalledWith('conversation:c1');

      expect(result).toEqual({ left: true });
    });
  });

  describe('onSend()', () => {
    it('should delegate to the messages service with the socket user as sender', async () => {
      const { client } = makeClient(USER);
      const result = await gateway.onSend(client as never, {
        conversationId: 'c1',
        content: 'hi',
        attachmentIds: ['a1'],
        parentId: 'p1',
        clientNonce: 'n1',
      });

      expect(messages.send).toHaveBeenCalledWith({
        conversationId: 'c1',
        senderId: 'u1',
        content: 'hi',
        attachmentIds: ['a1'],
        parentId: 'p1',
        priority: undefined,
        clientNonce: 'n1',
      });

      expect(result).toEqual({ delivered: true });
    });

    it('should surface a service HttpException as a WsException', async () => {
      messages.send.mockRejectedValue(new ForbiddenException({ code: 'X', message: 'no' }));
      const { client } = makeClient(USER);

      await expect(
        gateway.onSend(client as never, { conversationId: 'c1', content: 'hi' }),
      ).rejects.toBeInstanceOf(WsException);
    });
  });

  describe('onEdit() / onDelete()', () => {
    it('should delegate edits to the messages service', async () => {
      const { client } = makeClient(USER);

      await gateway.onEdit(client as never, { messageId: 'm1', content: 'new' });

      expect(messages.edit).toHaveBeenCalledWith('m1', 'u1', 'new');
    });

    it('should delegate deletes to the messages service', async () => {
      const { client } = makeClient(USER);

      await gateway.onDelete(client as never, { messageId: 'm1' });

      expect(messages.remove).toHaveBeenCalledWith('m1', 'u1');
    });
  });

  describe('reactions / read / poll', () => {
    it('should add a reaction', async () => {
      const { client } = makeClient(USER);

      await gateway.onReactionAdd(client as never, { messageId: 'm1', emoji: '👍' });

      expect(reactions.add).toHaveBeenCalledWith('m1', 'u1', '👍');
    });

    it('should remove a reaction', async () => {
      const { client } = makeClient(USER);

      await gateway.onReactionRemove(client as never, { messageId: 'm1', emoji: '👍' });

      expect(reactions.remove).toHaveBeenCalledWith('m1', 'u1', '👍');
    });

    it('should mark a conversation read', async () => {
      const { client } = makeClient(USER);

      await gateway.onRead(client as never, { conversationId: 'c1', messageId: 'm1' });

      expect(readState.markRead).toHaveBeenCalledWith('c1', 'u1', 'm1');
    });

    it('should cast a poll vote', async () => {
      const { client } = makeClient(USER);

      await gateway.onPollVote(client as never, { pollId: 'p1', optionIds: ['o1'] });

      expect(polls.vote).toHaveBeenCalledWith('p1', 'u1', ['o1']);
    });
  });

  describe('typing', () => {
    it('should relay typing to others only when the socket is in the room', () => {
      const { client, toEmits } = makeClient(USER, ['conversation:c1']);

      gateway.onTypingStart(client as never, { conversationId: 'c1' });

      expect(toEmits).toContainEqual({
        room: 'conversation:c1',
        event: ChatServerEvent.TYPING,
        payload: { conversationId: 'c1', userId: 'u1', name: 'Alice' },
      });
    });

    it('should not relay typing when the socket is not in the room', () => {
      const { client, toEmits } = makeClient(USER, ['sock1']);

      gateway.onTypingStart(client as never, { conversationId: 'c1' });

      expect(toEmits).toHaveLength(0);
    });

    it('should relay typing stop when in the room', () => {
      const { client, toEmits } = makeClient(USER, ['conversation:c1']);

      gateway.onTypingStop(client as never, { conversationId: 'c1' });

      expect(toEmits).toContainEqual({
        room: 'conversation:c1',
        event: ChatServerEvent.TYPING_STOPPED,
        payload: { conversationId: 'c1', userId: 'u1' },
      });
    });
  });

  describe('onSetPresence()', () => {
    it('should set status and broadcast presence to the user conversations', async () => {
      const { client } = makeClient(USER);

      await gateway.onSetPresence(client as never, { status: 'BUSY', customText: 'busy' });

      expect(presence.setStatus).toHaveBeenCalledWith('u1', 'BUSY', 'busy');

      expect(conversations.conversationIdsForUser).toHaveBeenCalledWith('u1');

      expect(srv.emits.some((e) => e.event === ChatServerEvent.PRESENCE_UPDATE)).toBe(true);
    });

    it('should default a missing customText to null', async () => {
      const { client } = makeClient(USER);

      await gateway.onSetPresence(client as never, { status: 'AWAY' } as never);

      expect(presence.setStatus).toHaveBeenCalledWith('u1', 'AWAY', null);
    });
  });
});
