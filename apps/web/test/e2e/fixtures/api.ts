import type { Page } from '@playwright/test';

import type {
  ActivityFeedDto,
  ConversationListDto,
  MeetingDto,
  MeetingHistoryListResponseDto,
  MessagePageDto,
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
  me?: UserDto | null;
  settings?: UserSettingsDto;
  upcoming?: UpcomingMeetingDto[];
  history?: MeetingHistoryListResponseDto;
  meeting?: MeetingResult;
  participants?: ParticipantDto[];
  messages?: MessagePageDto;
  recordings?: RecordingDto[];
  googleEnabled?: boolean;
  conversations?: ConversationListDto;
  teammates?: TeammateListDto;
  presence?: UserPresenceDto;
  unread?: UnreadSummaryDto;
  activity?: ActivityFeedDto;
  saved?: SavedMessageListDto;
  invite?: UserInviteLookupDto | null;
  authenticateOnLogin?: boolean;
}

const BARE_MEETING = /^\/meetings\/[^/]+$/;

export async function mockWebApi(page: Page, options: WebApiMockOptions = {}): Promise<void> {
  let me = options.me === undefined ? fixtures.currentUser : options.me;
  const settings = options.settings ?? fixtures.userSettings;
  const upcoming = options.upcoming ?? fixtures.upcoming;
  const history = options.history ?? fixtures.historyList;
  const meeting = options.meeting ?? fixtures.hostMeeting;
  const participants = options.participants ?? fixtures.participants;
  const messages = options.messages ?? fixtures.messagePage;
  const chatMessages = fixtures.chatMessagePage;
  const recordings = options.recordings ?? fixtures.recordings;
  const googleEnabled = options.googleEnabled ?? false;
  const conversations = options.conversations ?? fixtures.conversationList;
  const teammates = options.teammates ?? fixtures.teammateList;
  const presence = options.presence ?? fixtures.presenceMe;
  const unread = options.unread ?? fixtures.unreadSummary;
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
            ? json(200, ok({ user: me, canCreateGroups: true }))
            : json(401, err('UNAUTHORIZED', 'Authentication required', 401));
        case '/auth/google/status':
          return json(200, ok({ enabled: googleEnabled }));
        case '/auth/me/settings':
          return json(200, ok(settings));
        case '/meetings/upcoming':
          return json(200, ok(upcoming));
        case '/meetings/history':
          return json(200, ok(history));
        case '/meetings/history/datagrid':
          return json(200, ok(fixtures.historyDatagrid(history)));
        case '/messaging/conversations':
          return json(200, ok(conversations));
        case '/messaging/teammates':
          return json(200, ok(teammates));
        case '/messaging/presence/me':
          return json(200, ok(presence));
        case '/messaging/unread':
          return json(200, ok(unread));
        case '/messaging/activity':
          return json(200, ok(activity));
        case '/messaging/saved':
          return json(200, ok(saved));
        default:
          break;
      }

      if (path.startsWith('/messaging/conversations/') && path.endsWith('/messages')) {
        return json(200, ok(chatMessages));
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
          if (options.authenticateOnLogin) {
            me = fixtures.currentUser;
          }
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

      if (path.startsWith('/messaging/conversations/') && path.endsWith('/messages')) {
        const body = (request.postDataJSON() ?? {}) as { content?: string; clientNonce?: string };
        return json(
          200,
          ok({
            ...fixtures.dmConversation.lastMessage,
            id: `sent-${body.clientNonce ?? 'msg'}`,
            content: body.content ?? '',
            clientNonce: body.clientNonce ?? null,
            sender: { id: fixtures.currentUser.id, name: fixtures.currentUser.name, avatar: null },
            sentAt: '2026-05-21T11:00:00.000Z',
          }),
        );
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

export async function mockChatSocket(page: Page): Promise<void> {
  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    ws.send(
      '0' +
        JSON.stringify({
          sid: 'mock-eio',
          upgrades: [],
          pingInterval: 25000,
          pingTimeout: 20000,
          maxPayload: 1000000,
        }),
    );

    ws.onMessage((message) => {
      const data = typeof message === 'string' ? message : message.toString();

      if (data.startsWith('40')) {
        const rest = data.slice(2);
        const namespace = rest.startsWith('/') ? rest.split(',')[0] : '';
        ws.send(`40${namespace ? `${namespace},` : ''}{"sid":"mock-sio"}`);
      }
    });
  });
}
