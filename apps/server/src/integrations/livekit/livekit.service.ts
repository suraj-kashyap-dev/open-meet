import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingStatus } from '@prisma/client';
import {
  AccessToken,
  WebhookReceiver,
  type VideoGrant,
  type WebhookEvent,
} from 'livekit-server-sdk';

import type { ApiEnv } from '@open-meet/config';
import type { LiveKitTokenResponseDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { MeetingsService } from '../../modules/client/meetings/meetings.service';

const TOKEN_TTL_SECONDS = 60 * 60 * 4;

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private readonly webhookReceiver: WebhookReceiver;

  constructor(
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly meetings: MeetingsService,
  ) {
    this.webhookReceiver = new WebhookReceiver(
      this.config.getOrThrow<string>('LIVEKIT_API_KEY'),
      this.config.getOrThrow<string>('LIVEKIT_API_SECRET'),
    );
  }

  async mintToken(input: {
    meetingCode: string;
    userId: string;
    name: string;
  }): Promise<LiveKitTokenResponseDto> {
    const meeting = await this.meetings.findRawByCode(input.meetingCode);
    if (! meeting) {
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

    const accessToken = new AccessToken(
      this.config.getOrThrow<string>('LIVEKIT_API_KEY'),
      this.config.getOrThrow<string>('LIVEKIT_API_SECRET'),
      {
        identity: input.userId,
        name: input.name,
        ttl: TOKEN_TTL_SECONDS,
      },
    );
    accessToken.addGrant(grant);

    const token = await accessToken.toJwt();

    return {
      token,
      url: this.config.getOrThrow<string>('LIVEKIT_HOST'),
      identity: input.userId,
      room: input.meetingCode,
    };
  }

  async receiveWebhook(rawBody: string, authHeader: string | undefined): Promise<WebhookEvent> {
    if (! authHeader) {
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
      if (! meeting) {
        return;
      }
      if (meeting.status !== MeetingStatus.ENDED) {
        await this.meetings.end(event.room.name, meeting.hostId);
      }
    }
  }
}
