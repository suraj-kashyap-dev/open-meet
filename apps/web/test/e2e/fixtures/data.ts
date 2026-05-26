import type {
  AuthResponseDto,
  GoogleAuthStatusDto,
  LiveKitTokenResponseDto,
  MeetingDto,
  MeetingHistoryListResponseDto,
  MessagePageDto,
  ParticipantDto,
  RecordingDto,
  UpcomingMeetingDto,
  UserDto,
  UserSettingsDto,
} from '@open-meet/types';

export const MEETING_CODE = 'abcd-efgh-ijkl';

export const currentUser: UserDto = {
  id: 'user-self',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  avatar: null,
  timezone: 'UTC',
  language: 'en',
  bio: 'Mathematician and first programmer.',
  createdAt: '2026-01-02T09:00:00.000Z',
};

export const authResponse: AuthResponseDto = { user: currentUser };

export const googleStatus: GoogleAuthStatusDto = { enabled: false };

export const userSettings: UserSettingsDto = {
  meetingPreferences: {
    defaultMicMuted: false,
    defaultCameraOff: false,
    defaultView: 'GALLERY',
    enableJoinSound: true,
    enableNotifications: true,
  },
  privacySettings: {
    showEmailToParticipants: true,
    allowDirectMessages: true,
    profileVisibility: 'PARTICIPANTS_ONLY',
    shareUsageData: false,
  },
};

/** A meeting the current user hosts (used for the lobby + host paths). */
export const hostMeeting: MeetingDto = {
  id: 'meeting-1',
  code: MEETING_CODE,
  title: 'Quarterly review',
  hostId: currentUser.id,
  status: 'WAITING',
  scheduledFor: null,
  recurrence: null,
  durationMin: null,
  startedAt: null,
  endedAt: null,
  createdAt: '2026-05-20T08:55:00.000Z',
};

/** A meeting hosted by someone else — drives the guest WaitingRoom path. */
export const guestMeeting: MeetingDto = {
  ...hostMeeting,
  hostId: 'user-other',
  title: "Grace's standup",
};

/** A finished meeting — used by the history detail page (status has a label). */
export const endedMeeting: MeetingDto = {
  ...hostMeeting,
  status: 'ENDED',
  startedAt: '2026-05-19T14:00:00.000Z',
  endedAt: '2026-05-19T14:45:00.000Z',
};

export const upcoming: UpcomingMeetingDto[] = [];

export const historyList: MeetingHistoryListResponseDto = {
  page: 1,
  pageSize: 20,
  total: 1,
  items: [
    {
      id: 'meeting-1',
      code: MEETING_CODE,
      title: 'Quarterly review',
      status: 'ENDED',
      startedAt: '2026-05-19T14:00:00.000Z',
      endedAt: '2026-05-19T14:45:00.000Z',
      createdAt: '2026-05-19T13:55:00.000Z',
      durationMinutes: 45,
      isHost: true,
      hostName: currentUser.name,
      participantCount: 4,
      participantsPreview: [
        { id: 'user-self', name: 'Ada Lovelace', avatar: null },
        { id: 'user-other', name: 'Grace Hopper', avatar: null },
      ],
      messageCount: 12,
      attachmentCount: 2,
      recordingCount: 1,
    },
  ],
};

export const emptyHistory: MeetingHistoryListResponseDto = {
  page: 1,
  pageSize: 20,
  total: 0,
  items: [],
};

export const participants: ParticipantDto[] = [
  {
    id: 'participant-1',
    meetingId: 'meeting-1',
    userId: currentUser.id,
    name: currentUser.name,
    avatar: null,
    role: 'HOST',
    joinedAt: '2026-05-20T09:00:00.000Z',
    leftAt: null,
  },
];

export const messagePage: MessagePageDto = {
  nextCursor: null,
  items: [
    {
      id: 'message-1',
      meetingId: 'meeting-1',
      content: 'Thanks everyone for joining today.',
      sender: { id: 'user-other', name: 'Grace Hopper', avatar: null },
      sentAt: '2026-05-19T14:05:00.000Z',
      attachments: [],
    },
  ],
};

export const emptyMessages: MessagePageDto = { nextCursor: null, items: [] };

export const recordings: RecordingDto[] = [
  {
    id: 'recording-1',
    meetingId: 'meeting-1',
    status: 'COMPLETED',
    startedById: currentUser.id,
    startedByName: currentUser.name,
    url: 'https://example.com/recordings/recording-1.mp4',
    mime: 'video/mp4',
    durationMs: 2_700_000,
    sizeBytes: 104_857_600,
    error: null,
    startedAt: '2026-05-19T14:00:00.000Z',
    endedAt: '2026-05-19T14:45:00.000Z',
    createdAt: '2026-05-19T14:00:00.000Z',
  },
];

export const emptyRecordings: RecordingDto[] = [];

export const livekitToken: LiveKitTokenResponseDto = {
  token: 'fake-lk-token',
  url: 'ws://127.0.0.1:59324',
  identity: currentUser.id,
  room: MEETING_CODE,
};

export const joinResponse: { meeting: MeetingDto; participant: ParticipantDto } = {
  meeting: hostMeeting,
  participant: participants[0]!,
};
