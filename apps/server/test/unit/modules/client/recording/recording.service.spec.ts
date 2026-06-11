import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MeetingStatus, type Recording, RecordingStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MeetingsService } from '@/modules/client/meetings/services/meetings.service';
import { RecordingRepository } from '@/modules/client/recording/repositories/recording.repository';
import { RecordingService } from '@/modules/client/recording/services/recording.service';

const startRoomCompositeEgress = vi.fn();
const stopEgress = vi.fn();

vi.mock('livekit-server-sdk', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('livekit-server-sdk')>();

  class FakeEgressClient {
    startRoomCompositeEgress = startRoomCompositeEgress;
    stopEgress = stopEgress;
  }

  return { ...actual, EgressClient: FakeEgressClient };
});

function record(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'r1',
    meetingId: 'm1',
    egressId: 'eg-1',
    status: RecordingStatus.RECORDING,
    startedById: 'u1',
    storageKey: 'recordings/2026-05-17/abcd-efgh-ijkl-1.mp4',
    url: null,
    mime: 'video/mp4',
    duration: 0,
    size: BigInt(0),
    error: null,
    startedAt: new Date('2026-05-17T10:00:00Z'),
    endedAt: null,
    createdAt: new Date('2026-05-17T10:00:00Z'),
    updatedAt: new Date('2026-05-17T10:00:00Z'),
    ...overrides,
  };
}

describe('RecordingService', () => {
  let service: RecordingService;
  let repo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByEgressId: ReturnType<typeof vi.fn>;
    findActiveForMeeting: ReturnType<typeof vi.fn>;
    findRecordingForMeeting: ReturnType<typeof vi.fn>;
    listForMeeting: ReturnType<typeof vi.fn>;
    countCompletedByMeetingIds: ReturnType<typeof vi.fn>;
    markStopping: ReturnType<typeof vi.fn>;
    markCompleted: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
    findStarterName: ReturnType<typeof vi.fn>;
  };
  let meetings: {
    findRawByCode: ReturnType<typeof vi.fn>;
    findRawByMeetingId: ReturnType<typeof vi.fn>;
    assertParticipant: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    startRoomCompositeEgress.mockReset();

    stopEgress.mockReset();

    repo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEgressId: vi.fn(),
      findActiveForMeeting: vi.fn(),
      findRecordingForMeeting: vi.fn(),
      listForMeeting: vi.fn(),
      countCompletedByMeetingIds: vi.fn(),
      markStopping: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      findStarterName: vi.fn().mockResolvedValue({ name: 'Alice' }),
    };

    meetings = {
      findRawByCode: vi.fn(),
      findRawByMeetingId: vi.fn(),
      assertParticipant: vi.fn(),
    };

    const config = {
      getOrThrow: (key: string): string => {
        const map: Record<string, string> = {
          LIVEKIT_API_KEY: 'k',
          LIVEKIT_API_SECRET: 's',
          LIVEKIT_HOST: 'ws://livekit:7880',
          RECORDING_EGRESS_FILEPATH_PREFIX: '/out',
          RECORDING_STORAGE_SUBDIR: 'recordings',
          RECORDING_LAYOUT: 'grid',
        };

        return map[key]!;
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RecordingService,
        { provide: ConfigService, useValue: config },
        { provide: RecordingRepository, useValue: repo },
        { provide: MeetingsService, useValue: meetings },
      ],
    }).compile();

    service = moduleRef.get(RecordingService);
  });

  describe('start()', () => {
    it('should reject non-hosts', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });

      await expect(service.start('abcd-efgh-ijkl', 'u2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(startRoomCompositeEgress).not.toHaveBeenCalled();
    });

    it('should reject when the meeting is not active', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.WAITING,
      });

      await expect(service.start('abcd-efgh-ijkl', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject when a recording is already active', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });

      repo.findRecordingForMeeting.mockResolvedValue(record());

      await expect(service.start('abcd-efgh-ijkl', 'u1')).rejects.toThrow(/already in progress/i);
    });

    it('should start egress and persist the recording row', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });

      repo.findRecordingForMeeting.mockResolvedValue(null);

      startRoomCompositeEgress.mockResolvedValue({ egressId: 'eg-1' });

      repo.create.mockImplementation(async (data) =>
        record({ egressId: data.egressId, storageKey: data.storageKey }),
      );

      const dto = await service.start('abcd-efgh-ijkl', 'u1');

      expect(startRoomCompositeEgress).toHaveBeenCalledTimes(1);
      const [room, output, opts] = startRoomCompositeEgress.mock.calls[0]!;

      expect(room).toBe('abcd-efgh-ijkl');

      expect(output.filepath).toMatch(/^\/out\/recordings\//);

      expect(output.filepath).toMatch(/\.mp4$/);

      expect(opts.layout).toBe('grid');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingId: 'm1',
          egressId: 'eg-1',
          startedById: 'u1',
        }),
      );

      expect(dto.status).toBe('RECORDING');

      expect(dto.startedByName).toBe('Alice');
    });
  });

  describe('stop()', () => {
    it('should reject non-hosts', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });

      await expect(service.stop('abcd-efgh-ijkl', 'u2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should reject when there is no active recording', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });

      repo.findActiveForMeeting.mockResolvedValue(null);

      await expect(service.stop('abcd-efgh-ijkl', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should call egress.stopEgress and transition to STOPPING', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });
      const active = record();

      repo.findActiveForMeeting.mockResolvedValue(active);

      stopEgress.mockResolvedValue({});

      repo.markStopping.mockResolvedValue(record({ status: RecordingStatus.STOPPING }));

      const dto = await service.stop('abcd-efgh-ijkl', 'u1');

      expect(stopEgress).toHaveBeenCalledWith('eg-1');

      expect(repo.markStopping).toHaveBeenCalledWith('r1');

      expect(dto.status).toBe('STOPPING');
    });

    it('should still mark STOPPING when the egress stop call fails', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });

      repo.findActiveForMeeting.mockResolvedValue(record());

      stopEgress.mockRejectedValue(new Error('boom'));

      repo.markStopping.mockResolvedValue(record({ status: RecordingStatus.STOPPING }));

      const dto = await service.stop('abcd-efgh-ijkl', 'u1');

      expect(dto.status).toBe('STOPPING');
    });
  });

  describe('handleEgressEvent()', () => {
    it('should complete the recording on egress_ended with COMPLETE status', async () => {
      repo.findByEgressId.mockResolvedValue(record());

      repo.markCompleted.mockResolvedValue(
        record({
          status: RecordingStatus.COMPLETED,
          duration: 12_000,
          size: BigInt(987_654),
          url: '/api/recordings/r1/stream',
          endedAt: new Date('2026-05-17T10:01:00Z'),
        }),
      );

      const result = await service.handleEgressEvent({
        name: 'egress_ended',
        info: {
          egressId: 'eg-1',
          status: 3,
          error: '',
          fileResults: [
            {
              duration: BigInt(12_000) * BigInt(1_000_000),
              size: BigInt(987_654),
              location: '/out/recordings/2026-05-17/abcd.mp4',
              endedAt: BigInt(Date.parse('2026-05-17T10:01:00Z')) * BigInt(1_000_000),
            },
          ],
        } as never,
      });

      expect(result?.status).toBe(RecordingStatus.COMPLETED);

      expect(repo.markCompleted).toHaveBeenCalledWith(
        'eg-1',
        expect.objectContaining({
          durationMs: 12_000,
          sizeBytes: BigInt(987_654),
          url: '/api/recordings/r1/stream',
        }),
      );
    });

    it('should mark failed on egress_ended with FAILED status', async () => {
      repo.findByEgressId.mockResolvedValue(record());

      repo.markFailed.mockResolvedValue(record({ status: RecordingStatus.FAILED }));

      const result = await service.handleEgressEvent({
        name: 'egress_ended',
        info: {
          egressId: 'eg-1',
          status: 4,
          error: 'compositor crashed',
          fileResults: [],
        } as never,
      });

      expect(result?.status).toBe(RecordingStatus.FAILED);

      expect(repo.markFailed).toHaveBeenCalledWith(
        'eg-1',
        expect.objectContaining({ error: 'compositor crashed' }),
      );
    });

    it('should return the existing record without a DB write on egress_started', async () => {
      const existing = record();

      repo.findByEgressId.mockResolvedValue(existing);

      const result = await service.handleEgressEvent({
        name: 'egress_started',
        info: { egressId: 'eg-1', status: 1, error: '', fileResults: [] } as never,
      });

      expect(result).toBe(existing);

      expect(repo.markCompleted).not.toHaveBeenCalled();

      expect(repo.markFailed).not.toHaveBeenCalled();
    });

    it('should return null for an unknown egress id', async () => {
      repo.findByEgressId.mockResolvedValue(null);

      const result = await service.handleEgressEvent({
        name: 'egress_ended',
        info: { egressId: 'eg-unknown', status: 3, error: '', fileResults: [] } as never,
      });

      expect(result).toBeNull();
    });
  });
});
