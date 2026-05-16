import type { MessageDto, ParticipantDto, PresenceDto } from './dto';

export const SocketNamespace = '/meeting' as const;

export const ClientEvent = {
  MEETING_JOIN: 'meeting:join',
  MEETING_LEAVE: 'meeting:leave',
  CHAT_SEND: 'chat:send',
  REACTION_SEND: 'reaction:send',
  HAND_RAISE: 'hand:raise',
  HAND_LOWER: 'hand:lower',
} as const;
export type ClientEvent = (typeof ClientEvent)[keyof typeof ClientEvent];

export const ServerEvent = {
  PARTICIPANT_JOINED: 'meeting:participant-joined',
  PARTICIPANT_LEFT: 'meeting:participant-left',
  MEETING_ENDED: 'meeting:ended',
  CHAT_MESSAGE: 'chat:message',
  REACTION_RECEIVED: 'reaction:received',
  HAND_RAISED: 'hand:raised',
  HAND_LOWERED: 'hand:lowered',
  PRESENCE_UPDATE: 'presence:update',
} as const;
export type ServerEvent = (typeof ServerEvent)[keyof typeof ServerEvent];

export interface MeetingJoinPayload {
  meetingCode: string;
}
export interface MeetingLeavePayload {
  meetingCode: string;
}
export interface ChatSendPayload {
  meetingCode: string;
  content: string;
}
export interface ReactionSendPayload {
  meetingCode: string;
  emoji: string;
}
export interface HandTogglePayload {
  meetingCode: string;
}

export interface ParticipantJoinedPayload {
  participant: ParticipantDto;
}
export interface ParticipantLeftPayload {
  participantId: string;
}
export interface MeetingEndedPayload {
  endedAt: string;
}
export type ChatMessagePayload = MessageDto;
export interface ReactionReceivedPayload {
  emoji: string;
  senderId: string;
  senderName: string;
}
export interface HandRaisedPayload {
  userId: string;
  name: string;
}
export interface HandLoweredPayload {
  userId: string;
}
export interface PresenceUpdatePayload {
  participants: PresenceDto[];
}

export interface ClientToServerEvents {
  [ClientEvent.MEETING_JOIN]: (payload: MeetingJoinPayload) => void;
  [ClientEvent.MEETING_LEAVE]: (payload: MeetingLeavePayload) => void;
  [ClientEvent.CHAT_SEND]: (payload: ChatSendPayload) => void;
  [ClientEvent.REACTION_SEND]: (payload: ReactionSendPayload) => void;
  [ClientEvent.HAND_RAISE]: (payload: HandTogglePayload) => void;
  [ClientEvent.HAND_LOWER]: (payload: HandTogglePayload) => void;
}

export interface ServerToClientEvents {
  [ServerEvent.PARTICIPANT_JOINED]: (payload: ParticipantJoinedPayload) => void;
  [ServerEvent.PARTICIPANT_LEFT]: (payload: ParticipantLeftPayload) => void;
  [ServerEvent.MEETING_ENDED]: (payload: MeetingEndedPayload) => void;
  [ServerEvent.CHAT_MESSAGE]: (payload: ChatMessagePayload) => void;
  [ServerEvent.REACTION_RECEIVED]: (payload: ReactionReceivedPayload) => void;
  [ServerEvent.HAND_RAISED]: (payload: HandRaisedPayload) => void;
  [ServerEvent.HAND_LOWERED]: (payload: HandLoweredPayload) => void;
  [ServerEvent.PRESENCE_UPDATE]: (payload: PresenceUpdatePayload) => void;
}
