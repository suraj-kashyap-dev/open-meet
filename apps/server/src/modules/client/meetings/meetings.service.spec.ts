import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingStatus, ParticipantRole } from '@prisma/client';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { StorageService } from '../../../storage/storage.service';
import { MeetingsService } from './meetings.service';
import { MeetingsRepository } from './meetings.repository';

function meeting(overrides: Partial<{ id: string; code: string; hostId: string; status: MeetingStatus }> = {}) {
  return {
    id: 'm1',
    code: 'abcd-efgh-ijkl',
    title: null,
    hostId: 'u1',
    status: MeetingStatus.WAITING,
    settings: {},
    startedAt: null,
    endedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('MeetingsService', () => {
  let service: MeetingsService;
  let repo: {
    findByCode: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    upsertParticipant: ReturnType<typeof vi.fn>;
    markStarted: ReturnType<typeof vi.fn>;
    markEnded: ReturnType<typeof vi.fn>;
    markParticipantLeft: ReturnType<typeof vi.fn>;
    listActiveParticipants: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      findByCode: vi.fn(),
      create: vi.fn(),
      upsertParticipant: vi.fn(),
      markStarted: vi.fn(),
      markEnded: vi.fn(),
      markParticipantLeft: vi.fn(),
      listActiveParticipants: vi.fn(),
    };

    const storage = {
      publicUrl: (key: string) => `https://cdn.test/${key}`,
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        { provide: MeetingsRepository, useValue: repo },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(MeetingsService);
  });

  describe('create', () => {
    it('generates a unique code and persists', async () => {
      repo.create.mockImplementation(async (data: { code: string; hostId: string }) =>
        meeting({ code: data.code, hostId: data.hostId }),
      );

      const result = await service.create('u1', 'Sync');
      expect(result.hostId).toBe('u1');
      expect(result.code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    });

    it('retries on unique-constraint collisions', async () => {
      let calls = 0;
      repo.create.mockImplementation(async (data: { code: string }) => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('unique');
          (err as unknown as { code: string }).code = 'P2002';
          throw err;
        }
        return meeting({ code: data.code });
      });

      const result = await service.create('u1', undefined);
      expect(calls).toBe(3);
      expect(result.code).toBeDefined();
    });
  });

  describe('getByCode', () => {
    it('returns meeting when found', async () => {
      repo.findByCode.mockResolvedValue(meeting());
      const result = await service.getByCode('abcd-efgh-ijkl');
      expect(result.code).toBe('abcd-efgh-ijkl');
    });

    it('throws NotFound when missing', async () => {
      repo.findByCode.mockResolvedValue(null);
      await expect(service.getByCode('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('join', () => {
    it('transitions WAITING → ACTIVE on first join', async () => {
      repo.findByCode.mockResolvedValue(meeting({ status: MeetingStatus.WAITING }));
      repo.upsertParticipant.mockResolvedValue({
        id: 'p1',
        meetingId: 'm1',
        userId: 'u2',
        role: ParticipantRole.GUEST,
        joinedAt: new Date('2026-01-01T01:00:00Z'),
        leftAt: null,
        user: { id: 'u2', name: 'Bob', avatarKey: null },
      });
      repo.markStarted.mockResolvedValue(meeting({ status: MeetingStatus.ACTIVE }));

      const result = await service.join('abcd-efgh-ijkl', 'u2');
      expect(repo.markStarted).toHaveBeenCalledWith('m1');
      expect(result.meeting.status).toBe('ACTIVE');
      expect(result.participant.name).toBe('Bob');
    });

    it('rejects joining an ended meeting', async () => {
      repo.findByCode.mockResolvedValue(meeting({ status: MeetingStatus.ENDED }));
      await expect(service.join('abcd-efgh-ijkl', 'u2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('end', () => {
    it('only the host can end', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1' }));
      await expect(service.end('abcd-efgh-ijkl', 'u2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('host can end an active meeting', async () => {
      repo.findByCode.mockResolvedValue(meeting({ status: MeetingStatus.ACTIVE }));
      repo.markEnded.mockResolvedValue(meeting({ status: MeetingStatus.ENDED }));
      const result = await service.end('abcd-efgh-ijkl', 'u1');
      expect(result.status).toBe('ENDED');
    });
  });
});
