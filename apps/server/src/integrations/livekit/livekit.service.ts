import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingStatus } from '@prisma/client';
import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
  type VideoGrant,
  type WebhookEvent,
} from 'livekit-server-sdk';

import type { ApiEnv } from '@open-meet/config';
import type { LiveKitTokenResponseDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { AuthRepository } from '../../modules/client/auth/auth.repository';
import { AvatarsService } from '../../modules/client/auth/avatars.service';
import { MeetingsService } from '../../modules/client/meetings/meetings.service';
import { RecordingEvents } from '../../modules/client/recording/recording.events';
import { RecordingService } from '../../modules/client/recording/recording.service';

const TOKEN_TTL_SECONDS = 60 * 60 * 4;

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private readonly webhookReceiver: WebhookReceiver;
  private readonly roomService: RoomServiceClient;

  constructor(
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly meetings: MeetingsService,
    private readonly users: AuthRepository,
    private readonly avatars: AvatarsService,
    private readonly recordings: RecordingService,
    private readonly recordingEvents: RecordingEvents,
  ) {
    const apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');

    this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret);
    this.roomService = new RoomServiceClient(
      this.toHttpUrl(this.config.getOrThrow<string>('LIVEKIT_HOST')),
      apiKey,
      apiSecret,
    );
  }

  private toHttpUrl(wsUrl: string): string {
    return wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
  }

  async closeRoom(meetingCode: string): Promise<void> {
    await this.roomService.deleteRoom(meetingCode);
  }

  async removeParticipant(meetingCode: string, identity: string): Promise<void> {
    await this.roomService.removeParticipant(meetingCode, identity);
  }

  async mintToken(input: {
    meetingCode: string;
    userId: string;
    name: string;
    isGuest?: boolean;
    guestMeetingCode?: string | null;
  }): Promise<LiveKitTokenResponseDto> {
    if (input.isGuest && input.guestMeetingCode !== input.meetingCode) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Guest access is limited to the invited meeting.',
      });
    }

    await this.meetings.assertWithinDurationLimit(input.meetingCode);

    const meeting = await this.meetings.findRawByCode(input.meetingCode);
    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${input.meetingCode}" does not exist`,
      });
    }

    if (meeting.status === MeetingStatus.ENDED) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_ENDED,
        message: 'This meeting has already ended',
      });
    }

    const isHost = meeting.hostId === input.userId;

    const grant: VideoGrant = {
      room: input.meetingCode,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    };

    if (isHost) {
      grant.roomAdmin = true;
      grant.roomCreate = true;
    }

    const user = await this.users.findById(input.userId);
    const avatarUrl = this.avatars.resolveUrl(user?.avatarKey ?? null);

    const accessToken = new AccessToken(
      this.config.getOrThrow<string>('LIVEKIT_API_KEY'),
      this.config.getOrThrow<string>('LIVEKIT_API_SECRET'),
      {
        identity: input.userId,
        name: input.name,
        metadata: JSON.stringify({ avatar: avatarUrl }),
        ttl: TOKEN_TTL_SECONDS,
      },
    );

    accessToken.addGrant(grant);

    const token = await accessToken.toJwt();

    return {
      token,
      url:
        this.config.get<string>('LIVEKIT_PUBLIC_URL') ??
        this.config.getOrThrow<string>('LIVEKIT_HOST'),
      identity: input.userId,
      room: input.meetingCode,
    };
  }

  async receiveWebhook(rawBody: string, authHeader: string | undefined): Promise<WebhookEvent> {
    if (!authHeader) {
      throw new ForbiddenException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Missing LiveKit signature header',
      });
    }

    let event: WebhookEvent;

    try {
      event = await this.webhookReceiver.receive(rawBody, authHeader);
    } catch (err) {
      this.logger.warn(`LiveKit webhook signature rejected: ${(err as Error).message}`);

      throw new ForbiddenException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Invalid LiveKit signature',
      });
    }

    await this.handleEvent(event);

    return event;
  }

  private async handleEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`LiveKit event: ${event.event}`);

    if (event.event === 'room_finished' && event.room?.name) {
      const meeting = await this.meetings.findRawByCode(event.room.name);

      if (!meeting) {
        return;
      }

      if (meeting.status !== MeetingStatus.ENDED) {
        await this.meetings.end(event.room.name, { id: meeting.hostId });
      }

      return;
    }

    if (
      event.event === 'egress_started' ||
      event.event === 'egress_updated' ||
      event.event === 'egress_ended'
    ) {
      await this.handleEgress(event);
    }
  }

  private async handleEgress(event: WebhookEvent): Promise<void> {
    const info = event.egressInfo;

    if (!info) {
      this.logger.warn(`Egress webhook had no egressInfo payload: ${event.event}`);
      return;
    }

    this.logger.log(
      `Egress ${event.event} egressId=${info.egressId} status=${info.status} files=${info.fileResults.length}`,
    );

    const record = await this.recordings.handleEgressEvent({
      name: event.event as 'egress_started' | 'egress_updated' | 'egress_ended',
      info,
    });

    if (!record || event.event !== 'egress_ended') {
      return;
    }

    const meeting = await this.meetings.findRawByMeetingId(record.meetingId);

    if (!meeting) {
      return;
    }

    const dto = await this.recordings.toDto(record);

    this.recordingEvents.emitStopped(meeting.code, dto);
  }
}
