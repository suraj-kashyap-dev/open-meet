import type { Page } from '@playwright/test';

import type {
  ActivityFeedDto,
  ConversationListDto,
  MeetingDto,
  MeetingHistoryListResponseDto,
  MessagePageDto,
  MyTeamsResponseDto,
  ParticipantDto,
  RecordingDto,
  SavedMessageListDto,
  TeammateListDto,
  UnreadSummaryDto,
  UpcomingMeetingDto,
  UserDto,
  UserInviteLookupDto,
  UserPresenceDto,
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
  /** Chat conversation list returned by `GET /messaging/conversations`. */
  conversations?: ConversationListDto;
  teammates?: TeammateListDto;
  presence?: UserPresenceDto;
  unread?: UnreadSummaryDto;
  teams?: MyTeamsResponseDto;
  activity?: ActivityFeedDto;
  saved?: SavedMessageListDto;
  /** Invite returned by `GET /auth/invite/:token`, or null to simulate an invalid/expired link (404). */
  invite?: UserInviteLookupDto | null;
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
  const conversations = options.conversations ?? fixtures.conversationList;
  const teammates = options.teammates ?? fixtures.teammateList;
  const presence = options.presence ?? fixtures.presenceMe;
  const unread = options.unread ?? fixtures.unreadSummary;
  const teams = options.teams ?? fixtures.myTeams;
  const activity = options.activity ?? fixtures.activityFeed;
  const saved = options.saved ?? fixtures.savedMessages;
  const invite = options.invite === undefined ? fixtures.pendingInvite : options.invite;

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
        case '/messaging/conversations':
          return json(200, ok(conversations));
        case '/messaging/teammates':
          return json(200, ok(teammates));
        case '/messaging/presence/me':
          return json(200, ok(presence));
        case '/messaging/unread':
          return json(200, ok(unread));
        case '/messaging/teams':
          return json(200, ok(teams));
        case '/messaging/activity':
          return json(200, ok(activity));
        case '/messaging/saved':
          return json(200, ok(saved));
        default:
          break;
      }

      if (path.startsWith('/meetings/')) {
        if (path.endsWith('/messages')) return json(200, ok(messages));
        if (path.endsWith('/recordings')) return json(200, ok(recordings));
        if (path.endsWith('/participants')) return json(200, ok(participants));
        if (BARE_MEETING.test(path)) return meetingResponse();
      }

      if (path.startsWith('/auth/invite/')) {
        return invite
          ? json(200, ok(invite))
          : json(404, err('INVITE_NOT_FOUND', 'Invitation not found', 404));
      }
    }

    if (method === 'POST') {
      switch (path) {
        case '/auth/login':
        case '/auth/register':
        case '/auth/invite/accept':
          return json(200, ok(fixtures.authResponse));
        case '/messaging/conversations/direct':
          return json(200, ok(fixtures.dmConversation));
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
