import type { Page } from '@playwright/test';

import type {
  MeetingDto,
  MeetingHistoryListResponseDto,
  MessagePageDto,
  ParticipantDto,
  RecordingDto,
  UpcomingMeetingDto,
  UserDto,
  UserSettingsDto,
} from '@open-meet/types';

import * as fixtures from './data';

function ok<T>(data: T) {
  return { success: true, data, meta: { timestamp: new Date().toISOString() } };
}

function err(code: string, message: string, statusCode: number) {
  return { success: false, error: { code, message, statusCode } };
}

type MeetingResult = MeetingDto | { errorStatus: number; code?: string };

export interface WebApiMockOptions {
  /** Current user. `undefined` → default user; `null` → signed out (401 on /auth/me). */
  me?: UserDto | null;
  settings?: UserSettingsDto;
  upcoming?: UpcomingMeetingDto[];
  history?: MeetingHistoryListResponseDto;
  /** Meeting returned by `GET /meetings/:code`, or an error to simulate (e.g. 404). */
  meeting?: MeetingResult;
  participants?: ParticipantDto[];
  messages?: MessagePageDto;
  recordings?: RecordingDto[];
  googleEnabled?: boolean;
}

const BARE_MEETING = /^\/meetings\/[^/]+$/;

export async function mockWebApi(page: Page, options: WebApiMockOptions = {}): Promise<void> {
  const me = options.me === undefined ? fixtures.currentUser : options.me;
  const settings = options.settings ?? fixtures.userSettings;
  const upcoming = options.upcoming ?? fixtures.upcoming;
  const history = options.history ?? fixtures.historyList;
  const meeting = options.meeting ?? fixtures.hostMeeting;
  const participants = options.participants ?? fixtures.participants;
  const messages = options.messages ?? fixtures.messagePage;
  const recordings = options.recordings ?? fixtures.recordings;
  const googleEnabled = options.googleEnabled ?? false;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');

    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    const meetingResponse = () =>
      'errorStatus' in meeting
        ? json(
            meeting.errorStatus,
            err(meeting.code ?? 'MEETING_NOT_FOUND', 'Meeting not found', meeting.errorStatus),
          )
        : json(200, ok(meeting));

    if (method === 'GET') {
      switch (path) {
        case '/auth/me':
          return me
            ? json(200, ok(me))
            : json(401, err('UNAUTHORIZED', 'Authentication required', 401));
        case '/auth/google/status':
          return json(200, ok({ enabled: googleEnabled }));
        case '/auth/me/settings':
          return json(200, ok(settings));
        case '/meetings/upcoming':
          return json(200, ok(upcoming));
        case '/meetings/history':
          return json(200, ok(history));
        default:
          break;
      }

      if (path.startsWith('/meetings/')) {
        if (path.endsWith('/messages')) return json(200, ok(messages));
        if (path.endsWith('/recordings')) return json(200, ok(recordings));
        if (path.endsWith('/participants')) return json(200, ok(participants));
        if (BARE_MEETING.test(path)) return meetingResponse();
      }
    }

    if (method === 'POST') {
      switch (path) {
        case '/auth/login':
        case '/auth/register':
          return json(200, ok(fixtures.authResponse));
        case '/auth/logout':
          return json(200, ok({ loggedOut: true }));
        case '/auth/refresh':
          return json(200, ok({ refreshed: true }));
        case '/auth/me/password':
          return json(200, ok({ changed: true }));
        case '/livekit/token':
          return json(200, ok(fixtures.livekitToken));
        case '/meetings':
          return json(200, ok('errorStatus' in meeting ? fixtures.hostMeeting : meeting));
        default:
          break;
      }

      if (path.startsWith('/meetings/')) {
        if (path.endsWith('/join')) return json(200, ok(fixtures.joinResponse));
        if (path.endsWith('/leave')) return json(200, ok(null));
        if (path.endsWith('/end')) return meetingResponse();
      }
    }

    if (method === 'PATCH') {
      if (path === '/auth/me') return json(200, ok(me));
      if (BARE_MEETING.test(path)) return meetingResponse();
    }

    if (method === 'DELETE' && path === '/auth/me/avatar') {
      return json(200, ok(me));
    }

    return json(200, ok({ ok: true }));
  });
}
