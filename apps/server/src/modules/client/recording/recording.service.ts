import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingStatus, type Recording, RecordingStatus } from '@prisma/client';
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  type EgressInfo,
} from 'livekit-server-sdk';

import type { ApiEnv } from '@open-meet/config';
import type { RecordingDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { MeetingsService } from '../meetings/meetings.service';
import { RecordingRepository } from './recording.repository';

const NS_PER_MS = 1_000_000n;

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private readonly egress: EgressClient;
  private readonly egressFilepathPrefix: string;
  private readonly storageSubdir: string;
  private readonly layout: string;

  constructor(
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly recordings: RecordingRepository,
    private readonly meetings: MeetingsService,
  ) {
    const apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');
    const host = this.toHttpUrl(this.config.getOrThrow<string>('LIVEKIT_HOST'));

    this.egress = new EgressClient(host, apiKey, apiSecret);
    this.egressFilepathPrefix = this.config
      .getOrThrow<string>('RECORDING_EGRESS_FILEPATH_PREFIX')
      .replace(/\/$/, '');
    this.storageSubdir = this.config
      .getOrThrow<string>('RECORDING_STORAGE_SUBDIR')
      .replace(/^\/+|\/+$/g, '');
    this.layout = this.config.getOrThrow<string>('RECORDING_LAYOUT');
  }

  private toHttpUrl(wsUrl: string): string {
    return wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
  }

  async start(code: string, userId: string): Promise<RecordingDto> {
    const meeting = await this.meetings.findRawByCode(code);

    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }

    if (meeting.hostId !== userId) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Only the host can start recording',
      });
    }

    if (meeting.status !== MeetingStatus.ACTIVE) {
      throw new BadRequestException({
        code: ApiErrorCode.MEETING_ENDED,
        message: 'Recording can only be started while the meeting is active',
      });
    }

    const active = await this.recordings.findRecordingForMeeting(meeting.id);

    if (active) {
      throw new BadRequestException({
        code: ApiErrorCode.RECORDING_ALREADY_ACTIVE,
        message: 'A recording is already in progress for this meeting',
      });
    }

    const date = new Date();
    const datePart = date.toISOString().slice(0, 10);
    const filename = `${code}-${date.getTime()}.mp4`;
    const storageKey = `${this.storageSubdir}/${datePart}/${filename}`;
    const egressFilepath = `${this.egressFilepathPrefix}/${storageKey}`;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: egressFilepath,
    });

    let info: EgressInfo;

    try {
      info = await this.egress.startRoomCompositeEgress(code, fileOutput, {
        layout: this.layout,
      });
    } catch (err) {
      this.logger.error(`Failed to start egress for ${code}: ${(err as Error).message}`);
      throw new BadRequestException({
        code: ApiErrorCode.RECORDING_FAILED,
        message: 'Recording service is unavailable',
      });
    }

    const record = await this.recordings.create({
      meetingId: meeting.id,
      egressId: info.egressId,
      startedById: userId,
      storageKey,
    });

    return this.toDto(record);
  }

  async stop(code: string, userId: string): Promise<RecordingDto> {
    const meeting = await this.meetings.findRawByCode(code);

    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: `Meeting "${code}" does not exist`,
      });
    }

    if (meeting.hostId !== userId) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'Only the host can stop recording',
      });
    }

    const active = await this.recordings.findActiveForMeeting(meeting.id);

    if (!active) {
      throw new BadRequestException({
        code: ApiErrorCode.RECORDING_NOT_ACTIVE,
        message: 'No recording is currently in progress',
      });
    }

    try {
      await this.egress.stopEgress(active.egressId);
    } catch (err) {
      this.logger.warn(`stopEgress failed for ${active.egressId}: ${(err as Error).message}`);
    }

    const updated = await this.recordings.markStopping(active.id);
    return this.toDto(updated);
  }

  async getActive(code: string, userId: string): Promise<RecordingDto | null> {
    const { meetingId } = await this.meetings.assertParticipant(code, userId);
    const active = await this.recordings.findRecordingForMeeting(meetingId);
    return active ? this.toDto(active) : null;
  }

  async listForMeeting(code: string, userId: string): Promise<RecordingDto[]> {
    const { meetingId } = await this.meetings.assertParticipant(code, userId);
    const list = await this.recordings.listForMeeting(meetingId);
    return Promise.all(list.map((r) => this.toDto(r)));
  }

  async getStreamFor(
    recordingId: string,
    userId: string,
  ): Promise<{ recording: Recording; storageKey: string }> {
    const recording = await this.recordings.findById(recordingId);

    if (!recording) {
      throw new NotFoundException({
        code: ApiErrorCode.RECORDING_NOT_FOUND,
        message: 'Recording not found',
      });
    }

    if (recording.status !== RecordingStatus.COMPLETED || !recording.storageKey) {
      throw new BadRequestException({
        code: ApiErrorCode.RECORDING_NOT_ACTIVE,
        message: 'Recording is not ready for playback',
      });
    }

    const meeting = await this.meetings.findRawByMeetingId(recording.meetingId);

    if (!meeting) {
      throw new NotFoundException({
        code: ApiErrorCode.MEETING_NOT_FOUND,
        message: 'Meeting not found',
      });
    }

    await this.meetings.assertParticipant(meeting.code, userId);

    return { recording, storageKey: recording.storageKey };
  }

  async handleEgressEvent(event: {
    name: 'egress_started' | 'egress_updated' | 'egress_ended';
    info: EgressInfo;
  }): Promise<Recording | null> {
    const { info } = event;

    if (!info.egressId) {
      return null;
    }

    const recording = await this.recordings.findByEgressId(info.egressId);

    if (!recording) {
      this.logger.warn(`Egress event for unknown recording: ${info.egressId}`);
      return null;
    }

    if (event.name !== 'egress_ended') {
      return recording;
    }

    const fileInfo = info.fileResults[0];
    const durationMs = fileInfo ? Number(fileInfo.duration / NS_PER_MS) : 0;
    const sizeBytes = fileInfo ? fileInfo.size : BigInt(0);
    const endedAt =
      fileInfo && fileInfo.endedAt > 0n
        ? new Date(Number(fileInfo.endedAt / NS_PER_MS))
        : new Date();

    const isFailure = info.status === 4 || info.status === 5;

    if (isFailure) {
      return this.recordings.markFailed(info.egressId, {
        error: info.error || `Egress finished with status ${info.status}`,
        durationMs,
        sizeBytes,
        endedAt,
      });
    }

    const url = recording.storageKey ? `/api/recordings/${recording.id}/stream` : null;

    return this.recordings.markCompleted(info.egressId, {
      durationMs,
      sizeBytes,
      url,
      endedAt,
    });
  }

  async countCompletedByMeetingIds(meetingIds: string[]): Promise<Map<string, number>> {
    return this.recordings.countCompletedByMeetingIds(meetingIds);
  }

  async toDto(record: Recording): Promise<RecordingDto> {
    const starter = await this.recordings.findStarterName(record.startedById);

    return {
      id: record.id,
      meetingId: record.meetingId,
      status: record.status as RecordingDto['status'],
      startedById: record.startedById,
      startedByName: starter?.name ?? null,
      url: record.status === RecordingStatus.COMPLETED ? record.url : null,
      mime: record.mime,
      durationMs: record.duration,
      sizeBytes: Number(record.size),
      error: record.error,
      startedAt: record.startedAt.toISOString(),
      endedAt: record.endedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
