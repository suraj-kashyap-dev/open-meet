import { MeetingStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { AdminMeetingsRepository } from '@/modules/admin/meetings/repositories/meetings.repository';

describe('AdminMeetingsRepository', () => {
  let repo: AdminMeetingsRepository;
  let meeting: Record<string, ReturnType<typeof vi.fn>>;
  let participant: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    meeting = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue({ id: 'm1' }),
      update: vi.fn().mockResolvedValue({ id: 'm1', code: 'abc' }),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      delete: vi.fn().mockResolvedValue({ id: 'm1' }),
    };

    participant = {
      count: vi.fn().mockResolvedValue(2),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };

    repo = new AdminMeetingsRepository({ meeting, participant } as unknown as PrismaService);
  });

  describe('searchWhere() filters', () => {
    it('should use an empty where when no filters are given', () => {
      expect(repo.searchWhere()).toEqual({});
    });

    it('should narrow by status when a status filter is given', () => {
      expect(repo.searchWhere(undefined, MeetingStatus.ACTIVE)).toEqual({
        status: MeetingStatus.ACTIVE,
      });
    });

    it('should build a case-insensitive OR across code/title/host when searching', () => {
      expect(repo.searchWhere('foo')).toEqual({
        OR: [
          { code: { contains: 'foo', mode: 'insensitive' } },
          { title: { contains: 'foo', mode: 'insensitive' } },
          { host: { name: { contains: 'foo', mode: 'insensitive' } } },
          { host: { email: { contains: 'foo', mode: 'insensitive' } } },
        ],
      });
    });
  });

  describe('listWith() / countWith()', () => {
    it('should pass the prebuilt where and orderBy straight through', async () => {
      const where = { status: MeetingStatus.ENDED };

      await repo.listWith({ skip: 5, take: 5, where, orderBy: { startedAt: 'desc' } });

      expect(meeting.findMany.mock.calls[0][0]).toMatchObject({
        skip: 5,
        take: 5,
        where,
        orderBy: { startedAt: 'desc' },
      });

      await repo.countWith(where);

      expect(meeting.count.mock.calls[0][0].where).toBe(where);
    });
  });

  describe('countActiveParticipants()', () => {
    it('should ignore participants who have left', async () => {
      await expect(repo.countActiveParticipants('m1')).resolves.toBe(2);

      expect(participant.count).toHaveBeenCalledWith({ where: { meetingId: 'm1', leftAt: null } });
    });
  });

  describe('listActive()', () => {
    it('should select only the id and code of ACTIVE meetings', async () => {
      await repo.listActive();

      expect(meeting.findMany).toHaveBeenCalledWith({
        where: { status: MeetingStatus.ACTIVE },
        select: { id: true, code: true },
      });
    });
  });

  describe('markAllActiveEnded()', () => {
    it('should end every active meeting and return the affected count', async () => {
      await expect(repo.markAllActiveEnded()).resolves.toBe(3);

      expect(meeting.updateMany).toHaveBeenCalledWith({
        where: { status: MeetingStatus.ACTIVE },
        data: { status: MeetingStatus.ENDED, endedAt: expect.any(Date) },
      });
    });
  });
});
