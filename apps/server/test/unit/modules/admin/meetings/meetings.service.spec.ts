import { NotFoundException } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LiveKitService } from '@/integrations/livekit/livekit.service';
import type { StorageService } from '@/storage/storage.service';
import type { AdminMeetingsRepository } from '@/modules/admin/meetings/meetings.repository';
import { AdminMeetingsService } from '@/modules/admin/meetings/meetings.service';

function makeRow(over: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    code: 'abc',
    title: 'T',
    status: MeetingStatus.ACTIVE,
    hostId: 'h1',
    host: { id: 'h1', name: 'Host', email: 'host@x.com' },
    startedAt: new Date('2026-05-01T10:00:00Z'),
    endedAt: new Date('2026-05-01T10:30:00Z'),
    createdAt: new Date('2026-05-01T09:00:00Z'),
    _count: { participants: 4, messages: 9 },
    participants: [],
    ...over,
  };
}

describe('AdminMeetingsService', () => {
  let service: AdminMeetingsService;
  let meetings: Record<string, ReturnType<typeof vi.fn>>;
  let livekit: { closeRoom: ReturnType<typeof vi.fn>; removeParticipant: ReturnType<typeof vi.fn> };
  let storage: { publicUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    meetings = {
      list: vi.fn().mockResolvedValue([makeRow()]),
      count: vi.fn().mockResolvedValue(1),
      countActiveParticipants: vi.fn().mockResolvedValue(3),
      findById: vi.fn().mockResolvedValue(makeRow()),
      markEnded: vi.fn().mockResolvedValue({ id: 'm1', code: 'abc' }),
      listActive: vi.fn().mockResolvedValue([{ id: 'm1', code: 'abc' }]),
      markAllActiveEnded: vi.fn().mockResolvedValue(2),
      delete: vi.fn().mockResolvedValue({ id: 'm1' }),
      findParticipant: vi.fn().mockResolvedValue({ id: 'p1' }),
      markParticipantLeft: vi.fn().mockResolvedValue({ count: 1 }),
    };
    livekit = {
      closeRoom: vi.fn().mockResolvedValue(undefined),
      removeParticipant: vi.fn().mockResolvedValue(undefined),
    };
    storage = { publicUrl: vi.fn((k: string) => `pub:${k}`) };
    service = new AdminMeetingsService(
      meetings as unknown as AdminMeetingsRepository,
      livekit as unknown as LiveKitService,
      storage as unknown as StorageService,
    );
  });

  describe('list()', () => {
    it('should count active participants for ACTIVE rows and compute the duration', async () => {
      const res = await service.list({} as never);
      expect(meetings.countActiveParticipants).toHaveBeenCalledWith('m1');
      expect(res.items[0]).toMatchObject({
        activeParticipantCount: 3,
        durationMinutes: 30,
        participantCount: 4,
        messageCount: 9,
      });
    });

    it('should skip the active-participant query for non-active rows', async () => {
      meetings.list.mockResolvedValueOnce([makeRow({ status: MeetingStatus.ENDED })]);
      const res = await service.list({} as never);
      expect(meetings.countActiveParticipants).not.toHaveBeenCalled();
      expect(res.items[0].activeParticipantCount).toBe(0);
    });
  });

  describe('getById()', () => {
    it('should throw when the meeting is missing', async () => {
      meetings.findById.mockResolvedValueOnce(null);
      await expect(service.getById('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should return every participant (no scoping)', async () => {
      meetings.findById.mockResolvedValueOnce(
        makeRow({
          participants: [
            {
              id: 'p1',
              userId: 'u1',
              role: 'HOST',
              joinedAt: new Date('2026-05-01T10:00:00Z'),
              leftAt: null,
              user: { id: 'u1', name: 'One', email: 'one@x.com', avatarKey: null },
            },
            {
              id: 'p2',
              userId: 'u2',
              role: 'GUEST',
              joinedAt: new Date('2026-05-01T10:05:00Z'),
              leftAt: null,
              user: { id: 'u2', name: 'Two', email: 'two@x.com', avatarKey: null },
            },
          ],
        }),
      );

      const res = await service.getById('m1');

      expect(res.participants).toHaveLength(2);
      expect(res.participants.map((p) => p.userId)).toEqual(['u1', 'u2']);
      expect(res.participantCount).toBe(2);
      expect(res.activeParticipantCount).toBe(3);
    });
  });

  describe('forceEnd()', () => {
    it('should end an active meeting and close the LiveKit room', async () => {
      await service.forceEnd('m1');
      expect(meetings.markEnded).toHaveBeenCalledWith('m1');
      expect(livekit.closeRoom).toHaveBeenCalledWith('abc');
    });

    it('should not touch the room when the meeting already ended', async () => {
      meetings.findById.mockResolvedValue(makeRow({ status: MeetingStatus.ENDED }));
      await service.forceEnd('m1');
      expect(meetings.markEnded).not.toHaveBeenCalled();
      expect(livekit.closeRoom).not.toHaveBeenCalled();
    });
  });

  describe('bulkEndActive()', () => {
    it('should end all active meetings and close each room', async () => {
      const res = await service.bulkEndActive();
      expect(res).toEqual({ ended: 2 });
      expect(livekit.closeRoom).toHaveBeenCalledWith('abc');
      expect(meetings.listActive).toHaveBeenCalled();
      expect(meetings.markAllActiveEnded).toHaveBeenCalled();
    });
  });

  describe('kickParticipant()', () => {
    it('should mark the participant left and remove them from LiveKit', async () => {
      await expect(service.kickParticipant('m1', 'u9')).resolves.toEqual({ kicked: true });
      expect(meetings.markParticipantLeft).toHaveBeenCalledWith('m1', 'u9');
      expect(livekit.removeParticipant).toHaveBeenCalledWith('abc', 'u9');
    });

    it('should throw when the participant is not in the meeting', async () => {
      meetings.findParticipant.mockResolvedValueOnce(null);
      await expect(service.kickParticipant('m1', 'u9')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
