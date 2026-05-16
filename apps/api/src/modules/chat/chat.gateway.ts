import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import {
  ClientEvent,
  type HandLoweredPayload,
  type HandRaisedPayload,
  type ParticipantJoinedPayload,
  type ParticipantLeftPayload,
  type ReactionReceivedPayload,
  ServerEvent,
  SocketNamespace,
} from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { ChatService } from './chat.service';
import { MeetingsService } from '../meetings/meetings.service';
import {
  JoinRoomGatewayDto,
  ReactionGatewayDto,
  SendMessageGatewayDto,
} from './dto/send-message.dto';
import { WsJwtGuard } from './ws-jwt.guard';
import {
  extractAccessTokenFromSocket,
  type SocketUser,
} from './ws-auth.util';

type AuthSocket = Socket & { data: { user?: SocketUser } };

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

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly meetings: MeetingsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async handleConnection(client: AuthSocket): Promise<void> {
    try {
      const token = extractAccessTokenFromSocket(client);
      if (! token) {
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
    if (! user) {
      return;
    }
    for (const room of client.rooms) {
      if (room === client.id) {
        continue;
      }
      await this.meetings.leave(room, user.id);
      const payload: ParticipantLeftPayload = { participantId: user.id };
      this.server.to(room).emit(ServerEvent.PARTICIPANT_LEFT, payload);
    }
    this.logger.log(`WS disconnected: ${user.id}`);
  }

  @SubscribeMessage(ClientEvent.MEETING_JOIN)
  async onJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: JoinRoomGatewayDto,
  ): Promise<{ joined: true }> {
    const user = this.requireUser(client);
    const { meeting, participant } = await this.meetings.join(body.meetingCode, user.id);
    await client.join(meeting.code);

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

  @SubscribeMessage(ClientEvent.CHAT_SEND)
  async onChatSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: SendMessageGatewayDto,
  ): Promise<{ delivered: true }> {
    const user = this.requireUser(client);
    const meeting = await this.meetings.findRawByCode(body.meetingCode);
    if (! meeting) {
      throw new WsException('Meeting not found');
    }
    const message = await this.chat.send({
      meetingId: meeting.id,
      senderId: user.id,
      content: body.content,
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
    if (! user) {
      throw new WsException('Unauthenticated');
    }
    return user;
  }
}
