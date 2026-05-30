import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingStatus, ParticipantRole } from '@prisma/client';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { MailService } from '@/integrations/mail/mail.service';
import { StorageService } from '@/storage/storage.service';
import { AuthRepository } from '@/modules/client/auth/auth.repository';
import { AuthService } from '@/modules/client/auth/auth.service';
import { MeetingsService } from '@/modules/client/meetings/meetings.service';
import { MeetingsRepository } from '@/modules/client/meetings/meetings.repository';
import { WorkspaceConfigService } from '@/modules/config/workspace-config.service';
import { MeetingBus } from '@/websocket/meeting-bus.service';

function meeting(
  overrides: Partial<{
    id: string;
    code: string;
    hostId: string;
    status: MeetingStatus;
    title: string | null;
    scheduledFor: Date | null;
    recurrence: string | null;
    durationMin: number | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }> = {},
) {
  return {
    id: 'm1',
    code: 'abcd-efgh-ijkl',
    title: null,
    hostId: 'u1',
    status: MeetingStatus.WAITING,
    scheduledFor: null,
    recurrence: null,
    durationMin: null,
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
    createScheduled: ReturnType<typeof vi.fn>;
    upsertParticipant: ReturnType<typeof vi.fn>;
    markStarted: ReturnType<typeof vi.fn>;
    markEnded: ReturnType<typeof vi.fn>;
    markParticipantLeft: ReturnType<typeof vi.fn>;
    listActiveParticipants: ReturnType<typeof vi.fn>;
    updateTitle: ReturnType<typeof vi.fn>;
    markInviteSent: ReturnType<typeof vi.fn>;
  };
  let workspaceConfig: {
    getConfig: ReturnType<typeof vi.fn>;
  };
  let bus: {
    emit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      findByCode: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      createScheduled: vi.fn(),
      upsertParticipant: vi.fn(),
      markStarted: vi.fn(),
      markEnded: vi.fn(),
      markParticipantLeft: vi.fn(),
      listActiveParticipants: vi.fn(),
      updateTitle: vi.fn(),
      markInviteSent: vi.fn(),
    };

    workspaceConfig = {
      getConfig: vi.fn().mockResolvedValue({
        defaultMeetingTitle: 'Team Sync',
        allowGuestJoin: true,
        maxMeetingMinutes: null,
      }),
    };

    bus = {
      emit: vi.fn(),
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
        { provide: WorkspaceConfigService, useValue: workspaceConfig },
        { provide: AuthRepository, useValue: { createGuest: vi.fn() } },
        { provide: AuthService, useValue: { issueGuestAccessToken: vi.fn() } },
        { provide: MeetingBus, useValue: bus },
      ],
    }).compile();

    service = moduleRef.get(MeetingsService);
  });

  describe('create()', () => {
    it('should generate a unique code and persist the meeting', async () => {
      repo.create.mockImplementation(async (data: { code: string; hostId: string }) =>
        meeting({ code: data.code, hostId: data.hostId }),
      );

      const result = await service.create('u1', 'Sync');
      expect(result.hostId).toBe('u1');
      expect(result.code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    });

    it('should retry on unique-constraint collisions', async () => {
      let calls = 0;
      repo.create.mockImplementation(async (data: { code: string; title?: string | null }) => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('unique');
          (err as unknown as { code: string }).code = 'P2002';
          throw err;
        }
        return meeting({ code: data.code, title: data.title ?? null });
      });

      const result = await service.create('u1', undefined);
      expect(calls).toBe(3);
      expect(result.code).toBeDefined();
      expect(result.title).toBe('Team Sync');
      expect(workspaceConfig.getConfig).toHaveBeenCalled();
    });

    it('should apply the workspace default title when the instant meeting title is blank', async () => {
      repo.create.mockImplementation(
        async (data: { code: string; hostId: string; title?: string | null }) =>
          meeting({ code: data.code, hostId: data.hostId, title: data.title ?? null }),
      );

      const result = await service.create('u1', '   ');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hostId: 'u1',
          title: 'Team Sync',
        }),
      );
      expect(result.title).toBe('Team Sync');
    });
  });

  describe('schedule()', () => {
    it('should apply the workspace default title when scheduling without one', async () => {
      const scheduledFor = new Date('2099-06-01T10:00:00.000Z');

      repo.createScheduled.mockResolvedValue(
        Object.assign(
          meeting({
            code: 'abcd-efgh-ijkl',
            hostId: 'u1',
            title: 'Team Sync',
            scheduledFor,
            durationMin: 45,
          }),
          { invites: [] },
        ),
      );

      const result = await service.schedule(
        { id: 'u1', email: 'host@example.com', name: 'Host User' },
        {
          scheduledFor: scheduledFor.toISOString(),
          durationMin: 45,
          invitees: [],
        },
      );

      expect(repo.createScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          hostId: 'u1',
          title: 'Team Sync',
          scheduledFor,
          durationMin: 45,
          recurrence: null,
          invitees: [],
        }),
      );
      expect(result.title).toBe('Team Sync');
    });

    it('should clamp the scheduled duration to the workspace limit', async () => {
      const scheduledFor = new Date('2099-06-01T10:00:00.000Z');

      workspaceConfig.getConfig.mockResolvedValue({
        defaultMeetingTitle: 'Team Sync',
        allowGuestJoin: true,
        maxMeetingMinutes: 20,
      });
      repo.createScheduled.mockResolvedValue(
        Object.assign(
          meeting({
            code: 'abcd-efgh-ijkl',
            hostId: 'u1',
            title: 'Team Sync',
            scheduledFor,
            durationMin: 20,
          }),
          { invites: [] },
        ),
      );

      const result = await service.schedule(
        { id: 'u1', email: 'host@example.com', name: 'Host User' },
        {
          title: 'Planning',
          scheduledFor: scheduledFor.toISOString(),
          durationMin: 45,
        },
      );

      expect(repo.createScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Planning',
          durationMin: 20,
        }),
      );
      expect(result.durationMin).toBe(20);
    });

    it('should expand a recurring meeting into concrete future occurrences', async () => {
      const scheduledFor = new Date('2099-06-01T10:00:00.000Z');
      const recurrence = 'FREQ=WEEKLY;COUNT=3';
      const created: Array<Record<string, unknown>> = [];

      repo.createScheduled.mockImplementation(async (data: Record<string, unknown>) => {
        created.push(data);

        return Object.assign(
          meeting({
            code: `code-${created.length}`,
            hostId: data.hostId as string,
            title: data.title as string,
            scheduledFor: data.scheduledFor as Date,
            durationMin: data.durationMin as number,
            recurrence: data.recurrence as string,
          }),
          { invites: [] },
        );
      });

      const result = await service.schedule(
        { id: 'u1', email: 'host@example.com', name: 'Host User' },
        {
          title: 'Planning',
          scheduledFor: scheduledFor.toISOString(),
          durationMin: 30,
          recurrence,
        },
      );

      expect(repo.createScheduled).toHaveBeenCalledTimes(3);
      expect(created.map((row) => (row.scheduledFor as Date).toISOString())).toEqual([
        '2099-06-01T10:00:00.000Z',
        '2099-06-08T10:00:00.000Z',
        '2099-06-15T10:00:00.000Z',
      ]);

      const settings = created.map(
        (row) => row.settings as { recurrenceSeriesId: string; recurrenceOccurrenceIndex: number },
      );

      expect(settings[0]?.recurrenceOccurrenceIndex).toBe(0);
      expect(settings[1]?.recurrenceOccurrenceIndex).toBe(1);
      expect(settings[2]?.recurrenceOccurrenceIndex).toBe(2);
      expect(settings.every((row) => row.recurrenceSeriesId === settings[0]?.recurrenceSeriesId)).toBe(true);
      expect(result.recurrence).toBe(recurrence);
    });
  });

  describe('getByCode()', () => {
    it('should return the meeting when found', async () => {
      repo.findByCode.mockResolvedValue(meeting());
      const result = await service.getByCode('abcd-efgh-ijkl');
      expect(result.code).toBe('abcd-efgh-ijkl');
    });

    it('should throw NotFound when missing', async () => {
      repo.findByCode.mockResolvedValue(null);
      await expect(service.getByCode('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('join()', () => {
    it('should transition WAITING -> ACTIVE on the first join', async () => {
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

      const result = await service.join('abcd-efgh-ijkl', { id: 'u2' });
      expect(repo.markStarted).toHaveBeenCalledWith('m1');
      expect(result.meeting.status).toBe('ACTIVE');
      expect(result.participant.name).toBe('Bob');
    });

    it('should reject joining an ended meeting', async () => {
      repo.findByCode.mockResolvedValue(meeting({ status: MeetingStatus.ENDED }));
      await expect(service.join('abcd-efgh-ijkl', { id: 'u2' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should end the meeting when it has exceeded the workspace time limit', async () => {
      const startedAt = new Date(Date.now() - 31 * 60_000);

      workspaceConfig.getConfig.mockResolvedValue({
        defaultMeetingTitle: 'Team Sync',
        allowGuestJoin: true,
        maxMeetingMinutes: 30,
      });
      repo.findByCode
        .mockResolvedValueOnce(
          meeting({
            code: 'expired-room',
            status: MeetingStatus.ACTIVE,
            hostId: 'u1',
            startedAt,
          }),
        )
        .mockResolvedValueOnce(
          meeting({
            code: 'expired-room',
            status: MeetingStatus.ACTIVE,
            hostId: 'u1',
            startedAt,
          }),
        );
      repo.markEnded.mockResolvedValue(
        meeting({
          code: 'expired-room',
          status: MeetingStatus.ENDED,
          hostId: 'u1',
          startedAt,
          endedAt: new Date(),
        }),
      );

      await expect(service.join('expired-room', { id: 'u2' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.markEnded).toHaveBeenCalledWith('m1');
      expect(bus.emit).toHaveBeenCalled();
    });
  });

  describe('updateTitle()', () => {
    it('should allow only the host to rename', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1' }));
      await expect(
        service.updateTitle('abcd-efgh-ijkl', { id: 'u2' }, 'New title'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should reject renaming an ended meeting', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1', status: MeetingStatus.ENDED }));
      await expect(
        service.updateTitle('abcd-efgh-ijkl', { id: 'u1' }, 'New title'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should trim and persist a new title', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1' }));
      repo.updateTitle.mockResolvedValue(meeting({ hostId: 'u1', title: 'Sprint sync' }));

      const result = await service.updateTitle('abcd-efgh-ijkl', { id: 'u1' }, '  Sprint sync  ');
      expect(repo.updateTitle).toHaveBeenCalledWith('m1', 'Sprint sync');
      expect(result.title).toBe('Sprint sync');
    });

    it('should treat empty/whitespace as clearing the title', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1', title: 'Old' }));
      repo.updateTitle.mockResolvedValue(meeting({ hostId: 'u1', title: null }));

      const result = await service.updateTitle('abcd-efgh-ijkl', { id: 'u1' }, '   ');
      expect(repo.updateTitle).toHaveBeenCalledWith('m1', null);
      expect(result.title).toBeNull();
    });

    it('should skip a no-op write when the title is unchanged', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1', title: 'Same' }));
      const result = await service.updateTitle('abcd-efgh-ijkl', { id: 'u1' }, 'Same');
      expect(repo.updateTitle).not.toHaveBeenCalled();
      expect(result.title).toBe('Same');
    });
  });

  describe('end()', () => {
    it('should allow only the host to end', async () => {
      repo.findByCode.mockResolvedValue(meeting({ hostId: 'u1' }));
      await expect(service.end('abcd-efgh-ijkl', { id: 'u2' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should let the host end an active meeting', async () => {
      repo.findByCode.mockResolvedValue(meeting({ status: MeetingStatus.ACTIVE }));
      repo.markEnded.mockResolvedValue(
        meeting({ status: MeetingStatus.ENDED, endedAt: new Date('2026-01-01T02:00:00Z') }),
      );
      const result = await service.end('abcd-efgh-ijkl', { id: 'u1' });
      expect(result.status).toBe('ENDED');
      expect(bus.emit).toHaveBeenCalledWith('abcd-efgh-ijkl', 'meeting:ended', {
        endedAt: '2026-01-01T02:00:00.000Z',
      });
    });
  });
});
