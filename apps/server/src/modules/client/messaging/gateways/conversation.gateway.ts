import { HttpException, Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { ApiEnv } from '@open-meet/config';
import {
  ChatClientEvent,
  ChatNamespace,
  ChatServerEvent,
  type ChatConversationRefPayload,
  type ChatMessageDeletePayload,
  type ChatMessageEditPayload,
  type ChatMessageSendPayload,
  type ChatPollVotePayload,
  type ChatReactionPayload,
  type ChatReadPayload,
  type ChatDeliveredPayload,
  type ChatSetPresencePayload,
} from '@open-meet/types';

import { extractAccessTokenFromSocket, type SocketUser } from '../../chat/ws-auth.util';
import { WsJwtGuard } from '../../chat/ws-jwt.guard';

import {
  ChatBus,
  conversationRoom,
  userRoom,
} from '../services/chat-bus.service';
import { ChatPermissionsService } from '../services/chat-permissions.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { MessagesService } from '../services/messages.service';
import { PollsService } from '../services/polls.service';
import { PresenceService } from '../services/presence.service';
import { ReactionsService } from '../services/reactions.service';
import { ReadStateService } from '../services/read-state.service';

type AuthSocket = Socket & { data: { user?: SocketUser } };

@WebSocketGateway({
  namespace: ChatNamespace,
  cors: { origin: true, credentials: true },
})
@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ConversationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ConversationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly bus: ChatBus,
    private readonly conversations: ConversationsRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly messages: MessagesService,
    private readonly reactions: ReactionsService,
    private readonly readState: ReadStateService,
    private readonly polls: PollsService,
    private readonly presence: PresenceService,
  ) {}

  afterInit(server: Server): void {
    this.bus.attach(server);
  }

  async handleConnection(client: AuthSocket): Promise<void> {
    try {
      const token = extractAccessTokenFromSocket(client);

      if (!token) {
        throw new Error('No token');
      }

      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; name: string }>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') },
      );

      if ((payload as { guest?: boolean }).guest === true) {
        throw new Error('Guest tokens cannot access team chat');
      }

      client.data.user = { id: payload.sub, email: payload.email, name: payload.name };

      const userId = payload.sub;

      await client.join(userRoom(userId));

      const conversationIds = await this.conversations.conversationIdsForUser(userId);

      await Promise.all(conversationIds.map((id) => client.join(conversationRoom(id))));

      if (await this.presence.connect(userId)) {
        await this.broadcastPresence(userId, conversationIds);
      }
    } catch (err) {
      this.logger.warn(`Chat WS rejected: ${(err as Error).message}`);

      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthSocket): Promise<void> {
    const user = client.data?.user;

    if (!user) {
      return;
    }

    if (await this.presence.disconnect(user.id)) {
      const conversationIds = await this.conversations.conversationIdsForUser(user.id);

      await this.broadcastPresence(user.id, conversationIds);
    }
  }

  private async broadcastPresence(userId: string, conversationIds: string[]): Promise<void> {
    const snap = await this.presence.forUser(userId);
    const payload = {
      userId,
      online: snap.online,
      status: snap.status,
      customText: snap.customText,
      lastSeen: snap.lastSeen,
    };

    for (const id of conversationIds) {
      this.server.to(conversationRoom(id)).emit(ChatServerEvent.PRESENCE_UPDATE, payload);
    }
  }

  @SubscribeMessage(ChatClientEvent.CONVERSATION_JOIN)
  async onJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatConversationRefPayload,
  ): Promise<{ joined: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.permissions.assertConversationMember(body.conversationId, user.id);

      await client.join(conversationRoom(body.conversationId));

      return { joined: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.CONVERSATION_LEAVE)
  async onLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatConversationRefPayload,
  ): Promise<{ left: true }> {
    await client.leave(conversationRoom(body.conversationId));

    return { left: true };
  }

  @SubscribeMessage(ChatClientEvent.MESSAGE_SEND)
  async onSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatMessageSendPayload,
  ): Promise<{ delivered: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.messages.send({
        conversationId: body.conversationId,
        senderId: user.id,
        content: body.content,
        attachmentIds: body.attachmentIds,
        parentId: body.parentId,
        priority: body.priority,
        clientNonce: body.clientNonce,
      });

      return { delivered: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.MESSAGE_EDIT)
  async onEdit(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatMessageEditPayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.messages.edit(body.messageId, user.id, body.content);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.MESSAGE_DELETE)
  async onDelete(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatMessageDeletePayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.messages.remove(body.messageId, user.id);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.REACTION_ADD)
  async onReactionAdd(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatReactionPayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.reactions.add(body.messageId, user.id, body.emoji);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.REACTION_REMOVE)
  async onReactionRemove(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatReactionPayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.reactions.remove(body.messageId, user.id, body.emoji);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.TYPING_START)
  onTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatConversationRefPayload,
  ): void {
    const user = this.requireUser(client);
    const room = conversationRoom(body.conversationId);

    if (client.rooms.has(room)) {
      client.to(room).emit(ChatServerEvent.TYPING, {
        conversationId: body.conversationId,
        userId: user.id,
        name: user.name,
      });
    }
  }

  @SubscribeMessage(ChatClientEvent.TYPING_STOP)
  onTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatConversationRefPayload,
  ): void {
    const user = this.requireUser(client);
    const room = conversationRoom(body.conversationId);

    if (client.rooms.has(room)) {
      client.to(room).emit(ChatServerEvent.TYPING_STOPPED, {
        conversationId: body.conversationId,
        userId: user.id,
      });
    }
  }

  @SubscribeMessage(ChatClientEvent.READ)
  async onRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatReadPayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.readState.markRead(body.conversationId, user.id, body.messageId);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.DELIVERED)
  async onDelivered(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatDeliveredPayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.readState.markDelivered(body.conversationId, user.id);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.POLL_VOTE)
  async onPollVote(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatPollVotePayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.polls.vote(body.pollId, user.id, body.optionIds);

      return { ok: true };
    });
  }

  @SubscribeMessage(ChatClientEvent.SET_PRESENCE)
  async onSetPresence(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ChatSetPresencePayload,
  ): Promise<{ ok: true }> {
    const user = this.requireUser(client);

    return this.guard(async () => {
      await this.presence.setStatus(user.id, body.status, body.customText ?? null);
      const conversationIds = await this.conversations.conversationIdsForUser(user.id);

      await this.broadcastPresence(user.id, conversationIds);

      return { ok: true };
    });
  }

  private requireUser(client: AuthSocket): SocketUser {
    const user = client.data?.user;

    if (!user) {
      throw new WsException('Unauthenticated');
    }

    return user;
  }

  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof WsException) {
        throw err;
      }

      if (err instanceof HttpException) {
        const response = err.getResponse();

        throw new WsException(
          typeof response === 'object' ? (response as object) : { message: String(response) },
        );
      }

      this.logger.error(`Chat WS handler failed: ${(err as Error).message}`);
      throw new WsException('Chat error');
    }
  }
}
