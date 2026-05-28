import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { LiveKitService } from '@/integrations/livekit/livekit.service';
import { AuthRepository } from '@/modules/client/auth/auth.repository';
import { AvatarsService } from '@/modules/client/auth/avatars.service';
import { MeetingsService } from '@/modules/client/meetings/meetings.service';
import { RecordingEvents } from '@/modules/client/recording/recording.events';
import { RecordingService } from '@/modules/client/recording/recording.service';

describe('LiveKitService', () => {
  let service: LiveKitService;
  let meetings: {
    assertWithinDurationLimit: ReturnType<typeof vi.fn>;
    findRawByCode: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
  let users: { findById: ReturnType<typeof vi.fn> };
  let avatars: { resolveUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    meetings = {
      assertWithinDurationLimit: vi.fn().mockResolvedValue(undefined),
      findRawByCode: vi.fn(),
      end: vi.fn(),
    };

    users = {
      findById: vi.fn().mockResolvedValue(null),
    };

    avatars = {
      resolveUrl: vi.fn().mockReturnValue(null),
    };

    const env: Record<string, string> = {
      LIVEKIT_API_KEY: 'devkey',
      LIVEKIT_API_SECRET: 'secret-of-at-least-some-length-for-jwt',
      LIVEKIT_HOST: 'ws://livekit:7880',
      LIVEKIT_PUBLIC_URL: 'ws://localhost:7880',
    };

    const config = {
      get: (key: string) => env[key],
      getOrThrow: (key: string) => {
        const v = env[key];
        if (v === undefined) {
          throw new Error(`Missing ${key}`);
        }
        return v;
      },
    };

    const recordings = {
      handleEgressEvent: vi.fn(),
      toDto: vi.fn(),
    };

    const recordingEvents = {
      emitStarted: vi.fn(),
      emitStopped: vi.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKitService,
        { provide: ConfigService, useValue: config },
        { provide: MeetingsService, useValue: meetings },
        { provide: AuthRepository, useValue: users },
        { provide: AvatarsService, useValue: avatars },
        { provide: RecordingService, useValue: recordings },
        { provide: RecordingEvents, useValue: recordingEvents },
      ],
    }).compile();

    service = moduleRef.get(LiveKitService);
  });

  describe('mintToken()', () => {
    it('should throw NotFound for an unknown meeting code', async () => {
      meetings.findRawByCode.mockResolvedValue(null);
      await expect(
        service.mintToken({ meetingCode: 'missing', userId: 'u1', name: 'Ada' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should refuse to mint for ended meetings', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ENDED,
      });
      await expect(
        service.mintToken({ meetingCode: 'abcd', userId: 'u1', name: 'Ada' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should mint a JWT scoped to the room', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });
      const result = await service.mintToken({
        meetingCode: 'abcd-efgh-ijkl',
        userId: 'u1',
        name: 'Ada',
      });
      expect(result.room).toBe('abcd-efgh-ijkl');
      expect(result.identity).toBe('u1');
      expect(result.token.split('.').length).toBe(3);
      expect(meetings.assertWithinDurationLimit).toHaveBeenCalledWith('abcd-efgh-ijkl');
    });

    it('should return the browser-reachable LIVEKIT_PUBLIC_URL, not the internal host', async () => {
      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });
      const result = await service.mintToken({
        meetingCode: 'abcd-efgh-ijkl',
        userId: 'u1',
        name: 'Ada',
      });
      expect(result.url).toBe('ws://localhost:7880');
    });

    it('should fall back to LIVEKIT_HOST when LIVEKIT_PUBLIC_URL is unset', async () => {
      const fallbackEnv: Record<string, string> = {
        LIVEKIT_API_KEY: 'devkey',
        LIVEKIT_API_SECRET: 'secret-of-at-least-some-length-for-jwt',
        LIVEKIT_HOST: 'ws://livekit:7880',
      };
      const fallbackConfig = {
        get: (key: string) => fallbackEnv[key],
        getOrThrow: (key: string) => {
          const v = fallbackEnv[key];
          if (v === undefined) {
            throw new Error(`Missing ${key}`);
          }
          return v;
        },
      } as unknown as ConstructorParameters<typeof LiveKitService>[0];
      const fallbackService = new LiveKitService(
        fallbackConfig,
        meetings as unknown as MeetingsService,
        users as unknown as AuthRepository,
        avatars as unknown as AvatarsService,
        {} as unknown as RecordingService,
        {} as unknown as RecordingEvents,
      );

      meetings.findRawByCode.mockResolvedValue({
        id: 'm1',
        hostId: 'u1',
        status: MeetingStatus.ACTIVE,
      });
      const result = await fallbackService.mintToken({
        meetingCode: 'abcd-efgh-ijkl',
        userId: 'u1',
        name: 'Ada',
      });
      expect(result.url).toBe('ws://livekit:7880');
    });
  });
});
