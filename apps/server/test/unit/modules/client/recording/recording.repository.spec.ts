import { RecordingStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { RecordingRepository } from '@/modules/client/recording/repositories/recording.repository';

describe('RecordingRepository', () => {
  let repo: RecordingRepository;
  let recording: Record<string, ReturnType<typeof vi.fn>>;
  let user: { findUnique: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    recording = {
      create: vi.fn().mockResolvedValue({ id: 'r1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'r1' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'r1' }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'r1' }),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    user = { findUnique: vi.fn().mockResolvedValue({ name: 'Host' }) };
    repo = new RecordingRepository({ recording, user } as unknown as PrismaService);
  });

  describe('create()', () => {
    it('should create the row with RECORDING status', async () => {
      await repo.create({ meetingId: 'm1', egressId: 'e1', startedById: 'u1', storageKey: 'k' });
      expect(recording.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'm1',
          egressId: 'e1',
          startedById: 'u1',
          storageKey: 'k',
          status: RecordingStatus.RECORDING,
        },
      });
    });
  });

  describe('findActiveForMeeting()', () => {
    it('should match RECORDING or STOPPING rows, newest first', async () => {
      await repo.findActiveForMeeting('m1');
      expect(recording.findFirst).toHaveBeenCalledWith({
        where: {
          meetingId: 'm1',
          status: { in: [RecordingStatus.RECORDING, RecordingStatus.STOPPING] },
        },
        orderBy: { startedAt: 'desc' },
      });
    });
  });

  describe('findRecordingForMeeting()', () => {
    it('should match only RECORDING rows', async () => {
      await repo.findRecordingForMeeting('m1');
      expect(recording.findFirst).toHaveBeenCalledWith({
        where: { meetingId: 'm1', status: RecordingStatus.RECORDING },
        orderBy: { startedAt: 'desc' },
      });
    });
  });

  describe('markCompleted()', () => {
    it('should set COMPLETED status and clear any prior error', async () => {
      const endedAt = new Date();
      await repo.markCompleted('e1', { durationMs: 1000, sizeBytes: BigInt(5), url: 'u', endedAt });
      expect(recording.update).toHaveBeenCalledWith({
        where: { egressId: 'e1' },
        data: {
          status: RecordingStatus.COMPLETED,
          duration: 1000,
          size: BigInt(5),
          url: 'u',
          endedAt,
          error: null,
        },
      });
    });
  });

  describe('markFailed()', () => {
    it('should default duration and size when they are omitted', async () => {
      const endedAt = new Date();
      await repo.markFailed('e1', { error: 'boom', endedAt });
      expect(recording.update).toHaveBeenCalledWith({
        where: { egressId: 'e1' },
        data: {
          status: RecordingStatus.FAILED,
          error: 'boom',
          duration: 0,
          size: BigInt(0),
          endedAt,
        },
      });
    });
  });

  describe('countCompletedByMeetingIds()', () => {
    it('should short-circuit to an empty Map for empty input', async () => {
      const result = await repo.countCompletedByMeetingIds([]);
      expect(result).toEqual(new Map());
      expect(recording.groupBy).not.toHaveBeenCalled();
    });

    it('should build a Map from the grouped completed counts', async () => {
      recording.groupBy.mockResolvedValueOnce([
        { meetingId: 'm1', _count: { _all: 2 } },
        { meetingId: 'm2', _count: { _all: 5 } },
      ]);
      const result = await repo.countCompletedByMeetingIds(['m1', 'm2']);
      expect(result).toEqual(
        new Map([
          ['m1', 2],
          ['m2', 5],
        ]),
      );
    });
  });

  describe('findStarterName()', () => {
    it('should select only the user name', async () => {
      await repo.findStarterName('u1');
      expect(user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { name: true } });
    });
  });
});
