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

export interface MeetingDto {
  id: string;
  code: string;
  title: string | null;
  hostId: string;
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
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
