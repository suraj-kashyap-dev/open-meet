export const MeetingStatus = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const;
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus];

export const ParticipantRole = {
  HOST: 'HOST',
  GUEST: 'GUEST',
} as const;
export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];

export interface CreateMeetingDto {
  title?: string;
}

export interface UpdateMeetingDto {
  title?: string | null;
}

export interface ScheduleMeetingDto {
  title?: string;
  scheduledFor: string;
  durationMin?: number;
  recurrence?: string | null;
  invitees?: string[];
}

export interface CreateGuestMeetingSessionDto {
  name: string;
}

export interface GuestMeetingSessionDto {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface MeetingDto {
  id: string;
  code: string;
  title: string | null;
  hostId: string;
  status: MeetingStatus;
  scheduledFor: string | null;
  recurrence: string | null;
  durationMin: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface UpcomingMeetingDto {
  id: string;
  code: string;
  title: string | null;
  hostName: string;
  isHost: boolean;
  scheduledFor: string;
  durationMin: number | null;
  recurrence: string | null;
  inviteeCount: number;
}

export interface ParticipantDto {
  id: string;
  meetingId: string;
  userId: string;
  name: string;
  avatar: string | null;
  role: ParticipantRole;
  joinedAt: string;
  leftAt: string | null;
}

export interface PresenceDto {
  userId: string;
  name: string;
  avatar: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
}

export interface HistoryParticipantPreviewDto {
  id: string;
  name: string;
  avatar: string | null;
}

export interface MeetingHistoryItemDto {
  id: string;
  code: string;
  title: string | null;
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  durationMinutes: number | null;
  isHost: boolean;
  hostName: string;
  participantCount: number;
  participantsPreview: HistoryParticipantPreviewDto[];
  messageCount: number;
  attachmentCount: number;
  recordingCount: number;
}

export interface MeetingHistoryListResponseDto {
  items: MeetingHistoryItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MeetingMessagesQueryDto {
  cursor?: string;
  limit?: number;
}
