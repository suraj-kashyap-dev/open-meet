import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingStatus, ParticipantRole } from '@prisma/client';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { MailService } from '../../../integrations/mail/mail.service';
import { StorageService } from '../../../storage/storage.service';
import { MeetingsService } from './meetings.service';
import { MeetingsRepository } from './meetings.repository';

function meeting(
  overrides: Partial<{
    id: string;
    code: string;
    hostId: string;
    status: MeetingStatus;
    title: string | null;
  }> = {},
) {
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
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    upsertParticipant: ReturnType<typeof vi.fn>;
    markStarted: ReturnType<typeof vi.fn>;
    markEnded: ReturnType<typeof vi.fn>;
    markParticipantLeft: ReturnType<typeof vi.fn>;
    listActiveParticipants: ReturnType<typeof vi.fn>;
    updateTitle: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      findByCode: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      upsertParticipant: vi.fn(),
      markStarted: vi.fn(),
      markEnded: vi.fn(),
      markParticipantLeft: vi.fn(),
      listActiveParticipants: vi.fn(),
      updateTitle: vi.fn(),
    };

    const storage = {
      publicUrl: (key: string) => `https://cdn.test/${key}`,
    };

    const mail = {
      send: vi.fn(),
    };

    const config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'FRONTEND_URL') {
          return 'http://localhost:3000';
        }

        if (key === 'MAIL_FROM') {
          return 'open-meet <noreply@open-meet.local>';
        }

        return '';
      }),
      get: vi.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        { provide: MeetingsRepository, useValue: repo },
        { provide: StorageService, useValue: storage },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: config },
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

  describe('updateTitle', () => {
    it('only the host can rename', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1' }));
      await expect(service.updateTitle('abcd-efgh-ijkl', 'u2', 'New title')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects renaming an ended meeting', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1', status: MeetingStatus.ENDED }));
      await expect(service.updateTitle('abcd-efgh-ijkl', 'u1', 'New title')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('trims and persists a new title', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1' }));
      repo.updateTitle.mockResolvedValue(meeting({ hostId: 'u1', title: 'Sprint sync' }));

      const result = await service.updateTitle('abcd-efgh-ijkl', 'u1', '  Sprint sync  ');
      expect(repo.updateTitle).toHaveBeenCalledWith('m1', 'Sprint sync');
      expect(result.title).toBe('Sprint sync');
    });

    it('treats empty/whitespace as clearing the title', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1', title: 'Old' }));
      repo.updateTitle.mockResolvedValue(meeting({ hostId: 'u1', title: null }));

      const result = await service.updateTitle('abcd-efgh-ijkl', 'u1', '   ');
      expect(repo.updateTitle).toHaveBeenCalledWith('m1', null);
      expect(result.title).toBeNull();
    });

    it('skips a no-op write when title is unchanged', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1', title: 'Same' }));
      const result = await service.updateTitle('abcd-efgh-ijkl', 'u1', 'Same');
      expect(repo.updateTitle).not.toHaveBeenCalled();
      expect(result.title).toBe('Same');
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
