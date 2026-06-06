import type {
  ActivityFeedDto,
  AuthResponseDto,
  ChatMessageDto,
  ChatMessagePageDto,
  ConversationDto,
  ConversationListDto,
  GoogleAuthStatusDto,
  LiveKitTokenResponseDto,
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
  appearance: {
    accentColorOverride: null,
  },
};

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

export const guestMeeting: MeetingDto = {
  ...hostMeeting,
  hostId: 'user-other',
  title: "Grace's standup",
};

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

const otherUser = { id: 'user-other', name: 'Grace Hopper', avatar: null };

export const dmConversation: ConversationDto = {
  id: 'conversation-dm',
  type: 'DIRECT',
  title: null,
  description: null,
  members: [
    {
      userId: currentUser.id,
      name: currentUser.name,
      avatar: null,
      role: 'MEMBER',
      lastReadAt: '2026-05-21T10:05:00.000Z',
      online: true,
      status: 'AVAILABLE',
      customText: null,
      lastSeen: null,
      chatDisabled: false,
    },
    {
      userId: otherUser.id,
      name: otherUser.name,
      avatar: null,
      role: 'MEMBER',
      lastReadAt: '2026-05-21T10:00:00.000Z',
      online: true,
      status: 'AVAILABLE',
      customText: null,
      lastSeen: null,
      chatDisabled: false,
    },
  ],
  lastMessage: {
    id: 'chat-message-1',
    conversationId: 'conversation-dm',
    type: 'TEXT',
    priority: 'NORMAL',
    content: 'Did you get a chance to review the deck?',
    sender: otherUser,
    parentId: null,
    parent: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    poll: null,
    mentionedUserIds: [],
    mentionsEveryone: false,
    pinned: false,
    saved: false,
    editedAt: null,
    deletedAt: null,
    sentAt: '2026-05-21T10:00:00.000Z',
  },
  lastMessageAt: '2026-05-21T10:00:00.000Z',
  unreadCount: 0,
  muted: false,
  pinned: false,
  hidden: false,
  youAreAdmin: false,
  createdAt: '2026-05-20T09:00:00.000Z',
};

export const conversationList: ConversationListDto = {
  items: [dmConversation],
};

export const chatMessagePage: ChatMessagePageDto = {
  nextCursor: null,
  items: dmConversation.lastMessage ? [dmConversation.lastMessage] : [],
};

export const emptyConversationList: ConversationListDto = { items: [] };

export const unreadSummary: UnreadSummaryDto = {
  total: 0,
  byConversation: {},
};

export const presenceMe: UserPresenceDto = {
  userId: currentUser.id,
  online: true,
  status: 'AVAILABLE',
  customText: null,
  lastSeen: null,
};

export const teammateList: TeammateListDto = {
  items: [
    {
      id: otherUser.id,
      name: otherUser.name,
      email: 'grace@example.com',
      avatar: null,
      chatDisabled: false,
      allowDirectMessages: true,
      online: true,
      status: 'AVAILABLE',
      lastSeen: null,
      conversationId: dmConversation.id,
    },
  ],
};

const mentionMessage: ChatMessageDto = {
  id: 'chat-message-mention',
  conversationId: dmConversation.id,
  type: 'TEXT',
  priority: 'NORMAL',
  content: 'Hey @Ada Lovelace can you take a look at this?',
  sender: otherUser,
  parentId: null,
  parent: null,
  replyCount: 0,
  attachments: [],
  reactions: [],
  poll: null,
  mentionedUserIds: [currentUser.id],
  mentionsEveryone: false,
  pinned: false,
  saved: false,
  editedAt: null,
  deletedAt: null,
  sentAt: '2026-05-21T11:00:00.000Z',
};

export const activityFeed: ActivityFeedDto = {
  items: [
    {
      message: mentionMessage,
      conversationId: dmConversation.id,
      conversationTitle: null,
    },
  ],
};

export const emptyActivity: ActivityFeedDto = { items: [] };

export const savedMessages: SavedMessageListDto = {
  items: [
    {
      message: {
        ...dmConversation.lastMessage!,
        id: 'chat-message-saved',
        content: 'Remember to send the quarterly report.',
        saved: true,
      },
      conversationId: dmConversation.id,
      conversationTitle: 'Grace Hopper',
    },
  ],
};

export const emptySaved: SavedMessageListDto = { items: [] };

export const pendingInvite: UserInviteLookupDto = {
  email: 'newcomer@example.com',
  name: 'New Comer',
  expiresAt: '2026-06-30T00:00:00.000Z',
};

export const INVITE_TOKEN = 'invite-token-123';
