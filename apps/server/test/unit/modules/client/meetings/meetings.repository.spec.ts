import { MeetingStatus, ParticipantRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { MeetingsRepository } from '@/modules/client/meetings/repositories/meetings.repository';

describe('MeetingsRepository', () => {
  let repo: MeetingsRepository;
  let meeting: Record<string, ReturnType<typeof vi.fn>>;
  let participant: Record<string, ReturnType<typeof vi.fn>>;
  let attachment: { count: ReturnType<typeof vi.fn> };
  let recording: { groupBy: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    meeting = {
      findUnique: vi.fn().mockResolvedValue({ id: 'm1' }),
      create: vi.fn().mockResolvedValue({ id: 'm1' }),
      update: vi.fn().mockResolvedValue({ id: 'm1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    };

    participant = {
      upsert: vi.fn().mockResolvedValue({ id: 'p1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(3),
      findUnique: vi.fn().mockResolvedValue({ id: 'p1' }),
    };

    attachment = { count: vi.fn().mockResolvedValue(7) };

    recording = { groupBy: vi.fn().mockResolvedValue([]) };

    repo = new MeetingsRepository({
      meeting,
      participant,
      attachment,
      recording,
    } as unknown as PrismaService);
  });

  describe('findByCode()', () => {
    it('should query the meeting by code', async () => {
      await repo.findByCode('abc');

      expect(meeting.findUnique).toHaveBeenCalledWith({ where: { code: 'abc' } });
    });
  });

  describe('create()', () => {
    it('should start the meeting WAITING and seed the host as a HOST participant', async () => {
      await repo.create({ code: 'abc', hostId: 'u1', title: 'T' });

      expect(meeting.create).toHaveBeenCalledWith({
        data: {
          code: 'abc',
          hostId: 'u1',
          title: 'T',
          status: MeetingStatus.WAITING,
          participants: { create: { userId: 'u1', role: ParticipantRole.HOST } },
        },
      });
    });

    it('should default the title to null when omitted', async () => {
      await repo.create({ code: 'abc', hostId: 'u1' });

      expect(meeting.create.mock.calls[0][0].data.title).toBeNull();
    });
  });

  describe('createScheduled()', () => {
    it('should map invitee emails to invite rows and include them', async () => {
      const scheduledFor = new Date('2026-06-01T10:00:00Z');

      await repo.createScheduled({
        code: 'abc',
        hostId: 'u1',
        title: 'T',
        scheduledFor,
        durationMin: 30,
        recurrence: null,
        invitees: ['a@x.com', 'b@x.com'],
      });
      const arg = meeting.create.mock.calls[0][0];

      expect(arg.data.invites).toEqual({ create: [{ email: 'a@x.com' }, { email: 'b@x.com' }] });

      expect(arg.include).toEqual({ invites: true });
    });
  });

  describe('markStarted()', () => {
    it('should set ACTIVE status with a startedAt timestamp', async () => {
      await repo.markStarted('m1');

      expect(meeting.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { status: MeetingStatus.ACTIVE, startedAt: expect.any(Date) },
      });
    });
  });

  describe('markEnded()', () => {
    it('should set ENDED status with an endedAt timestamp', async () => {
      await repo.markEnded('m1');

      expect(meeting.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { status: MeetingStatus.ENDED, endedAt: expect.any(Date) },
      });
    });
  });

  describe('markParticipantLeft()', () => {
    it('should only update rows that have not already left', async () => {
      await repo.markParticipantLeft('m1', 'u1');

      expect(participant.updateMany).toHaveBeenCalledWith({
        where: { meetingId: 'm1', userId: 'u1', leftAt: null },
        data: { leftAt: expect.any(Date) },
      });
    });
  });

  describe('countActive()', () => {
    it('should count only participants who are still present', async () => {
      await expect(repo.countActive('m1')).resolves.toBe(3);

      expect(participant.count).toHaveBeenCalledWith({ where: { meetingId: 'm1', leftAt: null } });
    });
  });

  describe('isParticipant()', () => {
    it('should look up the composite key and select only the id', async () => {
      await repo.isParticipant('m1', 'u1');

      expect(participant.findUnique).toHaveBeenCalledWith({
        where: { meetingId_userId: { meetingId: 'm1', userId: 'u1' } },
        select: { id: true },
      });
    });
  });

  describe('countAttachmentsForMeeting()', () => {
    it('should count attachments via the message relation', async () => {
      await expect(repo.countAttachmentsForMeeting('m1')).resolves.toBe(7);

      expect(attachment.count).toHaveBeenCalledWith({ where: { message: { meetingId: 'm1' } } });
    });
  });

  describe('countCompletedRecordingsByMeetingIds()', () => {
    it('should short-circuit to an empty Map for empty input', async () => {
      await expect(repo.countCompletedRecordingsByMeetingIds([])).resolves.toEqual(new Map());

      expect(recording.groupBy).not.toHaveBeenCalled();
    });

    it('should build a Map from the grouped completed counts', async () => {
      recording.groupBy.mockResolvedValueOnce([{ meetingId: 'm1', _count: { _all: 4 } }]);

      await expect(repo.countCompletedRecordingsByMeetingIds(['m1'])).resolves.toEqual(
        new Map([['m1', 4]]),
      );
    });
  });
});
