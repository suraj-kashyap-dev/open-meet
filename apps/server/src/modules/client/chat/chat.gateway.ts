import { Logger, UseGuards } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type JwtService } from '@nestjs/jwt';
import {
  MessageBody,
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import {
  ClientEvent,
  KnockDenyReason,
  type HandLoweredPayload,
  type HandRaisedPayload,
  type KnockCancelledPayload,
  type KnockRequestedPayload,
  type KnockResolvedPayload,
  type ParticipantJoinedPayload,
  type ParticipantLeftPayload,
  type ReactionReceivedPayload,
  ServerEvent,
  SocketNamespace,
} from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { type ChatService } from './chat.service';
import { type MeetingsService } from '../meetings/meetings.service';
import {
  type JoinRoomGatewayDto,
  type KnockRespondGatewayDto,
  type ReactionGatewayDto,
  type SendMessageGatewayDto,
} from './dto/send-message.dto';
import { WsJwtGuard } from './ws-jwt.guard';
import { extractAccessTokenFromSocket, type SocketUser } from './ws-auth.util';

type AuthSocket = Socket & { data: { user?: SocketUser } };

interface KnockEntry {
  socketId: string;
  userId: string;
  name: string;
  avatar: string | null;
  knockedAt: string;
}

const hostRoom = (code: string): string => `host:${code}`;

@WebSocketGateway({
  namespace: SocketNamespace,
  cors: {
    origin: true,
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  private readonly pendingKnocks = new Map<string, Map<string, KnockEntry>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly meetings: MeetingsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  private knocksFor(code: string): Map<string, KnockEntry> {
    let bucket = this.pendingKnocks.get(code);

    if (!bucket) {
      bucket = new Map();
      this.pendingKnocks.set(code, bucket);
    }

    return bucket;
  }

  private removeKnock(code: string, userId: string): KnockEntry | null {
    const bucket = this.pendingKnocks.get(code);

    if (!bucket) {
      return null;
    }

    const entry = bucket.get(userId) ?? null;
    bucket.delete(userId);

    if (bucket.size === 0) {
      this.pendingKnocks.delete(code);
    }

    return entry;
  }

  private async hasHostPresent(code: string): Promise<boolean> {
    const sockets = await this.server.in(hostRoom(code)).fetchSockets();
    return sockets.length > 0;
  }

  async handleConnection(client: AuthSocket): Promise<void> {
    try {
      const token = extractAccessTokenFromSocket(client);
      if (!token) {
        throw new Error('No token');
      }
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        name: string;
      }>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
      this.logger.log(`WS connected: ${payload.sub}`);
    } catch (err) {
      this.logger.warn(`WS rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthSocket): Promise<void> {
    const user = client.data?.user;
    if (!user) {
      return;
    }

    for (const [code, bucket] of this.pendingKnocks) {
      const entry = bucket.get(user.id);

      if (entry && entry.socketId === client.id) {
        this.removeKnock(code, user.id);
        const payload: KnockCancelledPayload = { userId: user.id };
        this.server.to(hostRoom(code)).emit(ServerEvent.KNOCK_CANCELLED, payload);
      }
    }

    for (const room of client.rooms) {
      if (room === client.id) {
        continue;
      }

      if (room.startsWith('host:')) {
        const code = room.slice('host:'.length);
        const remaining = await this.server.in(hostRoom(code)).fetchSockets();

        if (remaining.length === 0) {
          await this.denyAllPending(code, KnockDenyReason.HOST_LEFT);
        }

        continue;
      }

      await this.meetings.leave(room, user.id);
      const payload: ParticipantLeftPayload = { participantId: user.id };
      this.server.to(room).emit(ServerEvent.PARTICIPANT_LEFT, payload);
    }

    this.logger.log(`WS disconnected: ${user.id}`);
  }

  private async denyAllPending(code: string, reason: KnockDenyReason): Promise<void> {
    const bucket = this.pendingKnocks.get(code);

    if (!bucket) {
      return;
    }

    const payload: KnockResolvedPayload = { admit: false, reason };

    for (const entry of bucket.values()) {
      this.server.to(entry.socketId).emit(ServerEvent.KNOCK_RESOLVED, payload);
    }

    this.pendingKnocks.delete(code);
  }

  @SubscribeMessage(ClientEvent.MEETING_JOIN)
  async onJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ joined: true }> {
    const user = this.requireUser(client);
    const { meeting, participant } = await this.meetings.join(body.meetingCode, user.id);
    await client.join(meeting.code);

    if (meeting.hostId === user.id) {
      await client.join(hostRoom(meeting.code));
      const bucket = this.pendingKnocks.get(meeting.code);

      if (bucket) {
        for (const entry of bucket.values()) {
          const replay: KnockRequestedPayload = {
            userId: entry.userId,
            name: entry.name,
            avatar: entry.avatar,
            knockedAt: entry.knockedAt,
          };
          client.emit(ServerEvent.KNOCK_REQUESTED, replay);
        }
      }
    }

    const payload: ParticipantJoinedPayload = { participant };
    client.to(meeting.code).emit(ServerEvent.PARTICIPANT_JOINED, payload);
    return { joined: true };
  }

  @SubscribeMessage(ClientEvent.MEETING_LEAVE)
  async onLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ left: true }> {
    const user = this.requireUser(client);
    await this.meetings.leave(body.meetingCode, user.id);
    await client.leave(body.meetingCode);

    const payload: ParticipantLeftPayload = { participantId: user.id };
    this.server.to(body.meetingCode).emit(ServerEvent.PARTICIPANT_LEFT, payload);
    return { left: true };
  }

  @SubscribeMessage(ClientEvent.MEETING_KNOCK)
  async onKnock(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ knocked: true }> {
    const user = this.requireUser(client);
    const meeting = await this.meetings.findRawByCode(body.meetingCode);

    if (!meeting) {
      throw new WsException('Meeting not found');
    }

    if (meeting.hostId === user.id) {
      throw new WsException('Host does not need to knock');
    }

    if (!(await this.hasHostPresent(body.meetingCode))) {
      const payload: KnockResolvedPayload = {
        admit: false,
        reason: KnockDenyReason.NO_HOST_PRESENT,
      };
      client.emit(ServerEvent.KNOCK_RESOLVED, payload);
      return { knocked: true };
    }

    const entry: KnockEntry = {
      socketId: client.id,
      userId: user.id,
      name: user.name,
      avatar: null,
      knockedAt: new Date().toISOString(),
    };

    this.knocksFor(body.meetingCode).set(user.id, entry);

    const payload: KnockRequestedPayload = {
      userId: entry.userId,
      name: entry.name,
      avatar: entry.avatar,
      knockedAt: entry.knockedAt,
    };
    this.server.to(hostRoom(body.meetingCode)).emit(ServerEvent.KNOCK_REQUESTED, payload);
    return { knocked: true };
  }

  @SubscribeMessage(ClientEvent.MEETING_KNOCK_CANCEL)
  async onKnockCancel(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ cancelled: true }> {
    const user = this.requireUser(client);
    const removed = this.removeKnock(body.meetingCode, user.id);

    if (removed) {
      const payload: KnockCancelledPayload = { userId: user.id };
      this.server.to(hostRoom(body.meetingCode)).emit(ServerEvent.KNOCK_CANCELLED, payload);
    }

    return { cancelled: true };
  }

  @SubscribeMessage(ClientEvent.MEETING_KNOCK_RESPOND)
  async onKnockRespond(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: KnockRespondGatewayDto,
  ): Promise<{ responded: true }> {
    const user = this.requireUser(client);
    const meeting = await this.meetings.findRawByCode(body.meetingCode);

    if (!meeting) {
      throw new WsException('Meeting not found');
    }

    if (meeting.hostId !== user.id) {
      throw new WsException('Only the host can respond to knocks');
    }

    const entry = this.removeKnock(body.meetingCode, body.userId);

    if (!entry) {
      return { responded: true };
    }

    const resolved: KnockResolvedPayload = {
      admit: body.admit,
      reason: body.admit ? undefined : KnockDenyReason.HOST_DENIED,
    };
    this.server.to(entry.socketId).emit(ServerEvent.KNOCK_RESOLVED, resolved);

    const cancelled: KnockCancelledPayload = { userId: body.userId };
    this.server.to(hostRoom(body.meetingCode)).emit(ServerEvent.KNOCK_CANCELLED, cancelled);
    return { responded: true };
  }

  @SubscribeMessage(ClientEvent.CHAT_SEND)
  async onChatSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: SendMessageGatewayDto,
  ): Promise<{ delivered: true }> {
    const user = this.requireUser(client);
    const meeting = await this.meetings.findRawByCode(body.meetingCode);

    if (!meeting) {
      throw new WsException('Meeting not found');
    }

    const trimmedContent = body.content.trim();
    const attachmentIds = body.attachmentIds ?? [];

    if (trimmedContent.length === 0 && attachmentIds.length === 0) {
      throw new WsException('Message must have content or at least one attachment');
    }

    const message = await this.chat.send({
      meetingId: meeting.id,
      senderId: user.id,
      content: trimmedContent,
      attachmentIds,
    });
    this.server.to(body.meetingCode).emit(ServerEvent.CHAT_MESSAGE, message);
    return { delivered: true };
  }

  @SubscribeMessage(ClientEvent.REACTION_SEND)
  async onReaction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: ReactionGatewayDto,
  ): Promise<{ delivered: true }> {
    const user = this.requireUser(client);
    const payload: ReactionReceivedPayload = {
      emoji: body.emoji,
      senderId: user.id,
      senderName: user.name,
    };
    this.server.to(body.meetingCode).emit(ServerEvent.REACTION_RECEIVED, payload);
    return { delivered: true };
  }

  @SubscribeMessage(ClientEvent.HAND_RAISE)
  async onHandRaise(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ delivered: true }> {
    const user = this.requireUser(client);
    const payload: HandRaisedPayload = { userId: user.id, name: user.name };
    this.server.to(body.meetingCode).emit(ServerEvent.HAND_RAISED, payload);
    return { delivered: true };
  }

  @SubscribeMessage(ClientEvent.HAND_LOWER)
  async onHandLower(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ delivered: true }> {
    const user = this.requireUser(client);
    const payload: HandLoweredPayload = { userId: user.id };
    this.server.to(body.meetingCode).emit(ServerEvent.HAND_LOWERED, payload);
    return { delivered: true };
  }

  private requireUser(client: AuthSocket): SocketUser {
    const user = client.data?.user;
    if (!user) {
      throw new WsException('Unauthenticated');
    }
    return user;
  }
}
