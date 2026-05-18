import type { Page } from '@playwright/test';

import {
  DEFAULT_USER_SETTINGS,
  MeetingStatus,
  type MeetingDto,
  type UserDto,
  type UserSettingsDto,
} from '@open-meet/types';

/**
 * In-memory backend stub for browser-based E2E tests. Each `installMockApi`
 * call owns its own state, so tests are isolated even when they run in
 * parallel — Playwright pages each get their own route handlers.
 *
 * The stub intentionally implements only what the UI under test exercises;
 * unknown endpoints return 404 so missing wiring fails loudly rather than
 * silently passing through to a real network.
 */

export interface MockState {
  user: UserDto | null;
  settings: UserSettingsDto;
  meetings: Map<string, MeetingDto>;
  seedUser: (overrides?: Partial<UserDto>) => UserDto;
}

interface JsonResponse {
  status: number;
  contentType: string;
  body: string;
}

function ok<T>(data: T, status: number = 200): JsonResponse {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    }),
  };
}

function fail(code: string, message: string, status: number): JsonResponse {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: { code, message, statusCode: status },
    }),
  };
}

function rand(len: number = 8): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

function makeUser(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: `user-${rand()}`,
    name: 'Ada Lovelace',
    email: `mock+${rand(6)}@example.test`,
    avatar: null,
    timezone: 'UTC',
    language: 'en',
    bio: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function randomMeetingCode(): string {
  return `${rand(4)}-${rand(4)}-${rand(4)}`;
}

function parseJsonBody(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// 1×1 transparent PNG used to serve mocked avatar URLs so Radix's Avatar
// component actually swaps in the <img> (it hides the image on load error).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
  'base64',
);

export async function installMockApi(page: Page): Promise<MockState> {
  const state: MockState = {
    user: null,
    settings: {
      meetingPreferences: { ...DEFAULT_USER_SETTINGS.meetingPreferences },
      privacySettings: { ...DEFAULT_USER_SETTINGS.privacySettings },
    },
    meetings: new Map(),
    seedUser: (overrides) => {
      state.user = makeUser(overrides);
      return state.user;
    },
  };

  // Mocked avatar image bytes — keep it cheap so reloads stay fast.
  await page.route('**/avatars/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PNG_1X1,
    });
  });

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    const reply = (response: JsonResponse) => route.fulfill(response);
    const requireUser = (): UserDto | null => state.user;

    // ── auth ───────────────────────────────────────────────────────────────
    if (method === 'POST' && path.endsWith('/api/auth/register')) {
      const body = parseJsonBody(req.postData()) as { name?: string; email?: string };
      state.user = makeUser({
        name: body.name ?? 'New User',
        email: body.email ?? `mock+${rand(6)}@example.test`,
      });
      return reply(ok({ user: state.user }, 201));
    }

    if (method === 'POST' && path.endsWith('/api/auth/login')) {
      const body = parseJsonBody(req.postData()) as { email?: string };
      if (!state.user) {
        state.user = makeUser({ email: body.email ?? `mock+${rand(6)}@example.test` });
      }
      return reply(ok({ user: state.user }));
    }

    if (method === 'POST' && path.endsWith('/api/auth/logout')) {
      state.user = null;
      return reply(ok({ success: true }));
    }

    if (method === 'GET' && path.endsWith('/api/auth/me')) {
      const u = requireUser();
      if (!u) {
        return reply(fail('UNAUTHORIZED', 'No session', 401));
      }
      return reply(ok(u));
    }

    if (method === 'PATCH' && path.endsWith('/api/auth/me')) {
      const u = requireUser();
      if (!u) {
        return reply(fail('UNAUTHORIZED', 'No session', 401));
      }
      const updates = parseJsonBody(req.postData());
      state.user = { ...u, ...updates };
      return reply(ok(state.user));
    }

    if (method === 'POST' && path.endsWith('/api/auth/me/password')) {
      return reply(ok({ success: true }));
    }

    if (method === 'POST' && path.endsWith('/api/auth/me/avatar')) {
      const u = requireUser();
      if (!u) {
        return reply(fail('UNAUTHORIZED', 'No session', 401));
      }
      state.user = { ...u, avatar: `/avatars/${u.id}-${rand(4)}.png` };
      return reply(ok(state.user, 201));
    }

    if (method === 'DELETE' && path.endsWith('/api/auth/me/avatar')) {
      const u = requireUser();
      if (!u) {
        return reply(fail('UNAUTHORIZED', 'No session', 401));
      }
      state.user = { ...u, avatar: null };
      return reply(ok(state.user));
    }

    // ── settings ───────────────────────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/api/auth/me/settings')) {
      return reply(ok(state.settings));
    }

    if (method === 'PATCH' && path.endsWith('/api/auth/me/settings')) {
      const updates = parseJsonBody(req.postData()) as {
        meetingPreferences?: Partial<UserSettingsDto['meetingPreferences']>;
        privacySettings?: Partial<UserSettingsDto['privacySettings']>;
      };
      state.settings = {
        meetingPreferences: {
          ...state.settings.meetingPreferences,
          ...(updates.meetingPreferences ?? {}),
        },
        privacySettings: {
          ...state.settings.privacySettings,
          ...(updates.privacySettings ?? {}),
        },
      };
      return reply(ok(state.settings));
    }

    // ── meetings ───────────────────────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/api/meetings/history')) {
      return reply(ok({ items: [], total: 0, page: 1, pageSize: 5 }));
    }

    if (method === 'POST' && path.endsWith('/api/meetings')) {
      const u = requireUser();
      if (!u) {
        return reply(fail('UNAUTHORIZED', 'No session', 401));
      }
      const body = parseJsonBody(req.postData()) as { title?: string };
      const code = randomMeetingCode();
      const meeting: MeetingDto = {
        id: `meeting-${code}`,
        code,
        title: body.title ?? null,
        hostId: u.id,
        status: MeetingStatus.WAITING,
        scheduledFor: null,
        recurrence: null,
        durationMin: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date().toISOString(),
      };
      state.meetings.set(code, meeting);
      return reply(ok(meeting, 201));
    }

    const codeMatch = path.match(
      /^.*\/api\/meetings\/([a-zA-Z0-9-]+)(?:\/(join|leave|end|participants))?$/,
    );
    if (codeMatch) {
      const [, code, sub] = codeMatch;
      const safeCode = code!;
      let meeting = state.meetings.get(safeCode);

      // GET /api/meetings/:code
      if (method === 'GET' && !sub) {
        if (!meeting) {
          // Allow tests that "join by code" via the dashboard input — they
          // expect the code to resolve, so synthesize one.
          meeting = {
            id: `meeting-${safeCode}`,
            code: safeCode,
            title: null,
            hostId: state.user?.id ?? 'host',
            status: MeetingStatus.WAITING,
            scheduledFor: null,
            recurrence: null,
            durationMin: null,
            startedAt: null,
            endedAt: null,
            createdAt: new Date().toISOString(),
          };
          state.meetings.set(safeCode, meeting);
        }
        return reply(ok(meeting));
      }

      // POST /api/meetings/:code/join
      if (method === 'POST' && sub === 'join') {
        if (!meeting) {
          meeting = {
            id: `meeting-${safeCode}`,
            code: safeCode,
            title: null,
            hostId: state.user?.id ?? 'host',
            status: MeetingStatus.WAITING,
            scheduledFor: null,
            recurrence: null,
            durationMin: null,
            startedAt: null,
            endedAt: null,
            createdAt: new Date().toISOString(),
          };
        }
        meeting = {
          ...meeting,
          status: MeetingStatus.ACTIVE,
          startedAt: meeting.startedAt ?? new Date().toISOString(),
        };
        state.meetings.set(safeCode, meeting);
        return reply(
          ok({
            meeting,
            participant: {
              id: `participant-${rand()}`,
              userId: state.user?.id ?? 'host',
              meetingId: meeting.id,
              role: 'PARTICIPANT',
              name: state.user?.name ?? 'Guest',
              avatar: state.user?.avatar ?? null,
              joinedAt: new Date().toISOString(),
              leftAt: null,
            },
          }),
        );
      }

      if (method === 'POST' && sub === 'leave') {
        return reply(ok({ success: true }));
      }

      if (method === 'POST' && sub === 'end') {
        if (meeting) {
          meeting = { ...meeting, status: MeetingStatus.ENDED, endedAt: new Date().toISOString() };
          state.meetings.set(safeCode, meeting);
        }
        return reply(ok(meeting ?? { code: safeCode }));
      }

      if (method === 'GET' && sub === 'participants') {
        return reply(ok([]));
      }
    }

    // ── livekit + everything else ──────────────────────────────────────────
    if ((method === 'GET' || method === 'POST') && path.includes('/api/livekit/token')) {
      // Non-routable IP (RFC 5737 TEST-NET-1) so the WebSocket attempt hangs
      // rather than failing fast — keeps the meeting shell mounted for tests
      // / screenshot captures instead of immediately flipping to EndedView.
      return reply(ok({ token: 'mock-token', url: 'wss://192.0.2.1:7880' }));
    }

    if (method === 'GET' && path.match(/\/api\/meetings\/[^/]+\/recording\/active$/)) {
      return reply(ok({ recording: null }));
    }

    if (method === 'GET' && path.match(/\/api\/meetings\/[^/]+\/messages/)) {
      return reply(ok({ items: [], nextCursor: null }));
    }

    return reply(fail('NOT_FOUND', `No mock for ${method} ${path}`, 404));
  });

  return state;
}
