import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { LiveKitService } from './livekit.service';
import { MeetingsService } from '../meetings/meetings.service';

describe('LiveKitService', () => {
  let service: LiveKitService;
  let meetings: { findRawByCode: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    meetings = {
      findRawByCode: vi.fn(),
      end: vi.fn(),
    };

    const config = {
      getOrThrow: (key: string) => {
        const env: Record<string, string> = {
          LIVEKIT_API_KEY: 'devkey',
          LIVEKIT_API_SECRET: 'secret-of-at-least-some-length-for-jwt',
          LIVEKIT_HOST: 'ws://localhost:7880',
        };
        const v = env[key];
        if (v === undefined) {
          throw new Error(`Missing ${key}`);
        }
        return v;
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKitService,
        { provide: ConfigService, useValue: config },
        { provide: MeetingsService, useValue: meetings },
      ],
    }).compile();

    service = moduleRef.get(LiveKitService);
  });

  it('throws NotFound for unknown meeting code', async () => {
    meetings.findRawByCode.mockResolvedValue(null);
    await expect(
      service.mintToken({ meetingCode: 'missing', userId: 'u1', name: 'Ada' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to mint for ended meetings', async () => {
    meetings.findRawByCode.mockResolvedValue({
      id: 'm1',
      hostId: 'u1',
      status: MeetingStatus.ENDED,
    });
    await expect(
      service.mintToken({ meetingCode: 'abcd', userId: 'u1', name: 'Ada' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mints a JWT with room scope', async () => {
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
    expect(result.url).toBe('ws://localhost:7880');
    expect(result.token.split('.').length).toBe(3);
  });
});
