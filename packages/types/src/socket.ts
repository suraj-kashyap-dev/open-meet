import type {
  ChatMessageDto,
  ChatMessagePriority,
  ConversationDto,
  MessageDto,
  ParticipantDto,
  PollDto,
  PresenceDto,
  PresenceStatus,
  ReactionSummaryDto,
  RecordingDto,
} from './dto';

export const SocketNamespace = '/meeting' as const;

export const ClientEvent = {
  MEETING_JOIN: 'meeting:join',
  MEETING_LEAVE: 'meeting:leave',
  MEETING_KNOCK: 'meeting:knock',
  MEETING_KNOCK_CANCEL: 'meeting:knock-cancel',
  MEETING_KNOCK_RESPOND: 'meeting:knock-respond',
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
  KNOCK_REQUESTED: 'meeting:knock-requested',
  KNOCK_RESOLVED: 'meeting:knock-resolved',
  KNOCK_CANCELLED: 'meeting:knock-cancelled',
  CHAT_MESSAGE: 'chat:message',
  REACTION_RECEIVED: 'reaction:received',
  HAND_RAISED: 'hand:raised',
  HAND_LOWERED: 'hand:lowered',
  PRESENCE_UPDATE: 'presence:update',
  RECORDING_STARTED: 'recording:started',
  RECORDING_STOPPED: 'recording:stopped',
} as const;
export type ServerEvent = (typeof ServerEvent)[keyof typeof ServerEvent];

export const KnockDenyReason = {
  HOST_DENIED: 'HOST_DENIED',
  NO_HOST_PRESENT: 'NO_HOST_PRESENT',
  HOST_LEFT: 'HOST_LEFT',
} as const;
export type KnockDenyReason = (typeof KnockDenyReason)[keyof typeof KnockDenyReason];

export interface MeetingJoinPayload {
  meetingCode: string;
}
export interface MeetingLeavePayload {
  meetingCode: string;
}
export interface KnockPayload {
  meetingCode: string;
}
export interface KnockRespondPayload {
  meetingCode: string;
  userId: string;
  admit: boolean;
}
export interface KnockRequestedPayload {
  userId: string;
  name: string;
  avatar: string | null;
  knockedAt: string;
}
export interface KnockResolvedPayload {
  admit: boolean;
  reason?: KnockDenyReason;
}
export interface KnockCancelledPayload {
  userId: string;
}
export interface ChatSendPayload {
  meetingCode: string;
  content: string;
  attachmentIds?: string[];
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
export interface RecordingStartedPayload {
  recording: RecordingDto;
}
export interface RecordingStoppedPayload {
  recording: RecordingDto;
}

export interface ClientToServerEvents {
  [ClientEvent.MEETING_JOIN]: (payload: MeetingJoinPayload) => void;
  [ClientEvent.MEETING_LEAVE]: (payload: MeetingLeavePayload) => void;
  [ClientEvent.MEETING_KNOCK]: (payload: KnockPayload) => void;
  [ClientEvent.MEETING_KNOCK_CANCEL]: (payload: KnockPayload) => void;
  [ClientEvent.MEETING_KNOCK_RESPOND]: (payload: KnockRespondPayload) => void;
  [ClientEvent.CHAT_SEND]: (payload: ChatSendPayload) => void;
  [ClientEvent.REACTION_SEND]: (payload: ReactionSendPayload) => void;
  [ClientEvent.HAND_RAISE]: (payload: HandTogglePayload) => void;
  [ClientEvent.HAND_LOWER]: (payload: HandTogglePayload) => void;
}

export interface ServerToClientEvents {
  [ServerEvent.PARTICIPANT_JOINED]: (payload: ParticipantJoinedPayload) => void;
  [ServerEvent.PARTICIPANT_LEFT]: (payload: ParticipantLeftPayload) => void;
  [ServerEvent.MEETING_ENDED]: (payload: MeetingEndedPayload) => void;
  [ServerEvent.KNOCK_REQUESTED]: (payload: KnockRequestedPayload) => void;
  [ServerEvent.KNOCK_RESOLVED]: (payload: KnockResolvedPayload) => void;
  [ServerEvent.KNOCK_CANCELLED]: (payload: KnockCancelledPayload) => void;
  [ServerEvent.CHAT_MESSAGE]: (payload: ChatMessagePayload) => void;
  [ServerEvent.REACTION_RECEIVED]: (payload: ReactionReceivedPayload) => void;
  [ServerEvent.HAND_RAISED]: (payload: HandRaisedPayload) => void;
  [ServerEvent.HAND_LOWERED]: (payload: HandLoweredPayload) => void;
  [ServerEvent.PRESENCE_UPDATE]: (payload: PresenceUpdatePayload) => void;
  [ServerEvent.RECORDING_STARTED]: (payload: RecordingStartedPayload) => void;
  [ServerEvent.RECORDING_STOPPED]: (payload: RecordingStoppedPayload) => void;
}

// --- Corporate chat (persistent messaging) - separate `/chat` namespace ---

export const ChatNamespace = '/chat' as const;

export const ChatClientEvent = {
  CONVERSATION_JOIN: 'chat:conversation:join',
  CONVERSATION_LEAVE: 'chat:conversation:leave',
  MESSAGE_SEND: 'chat:message:send',
  MESSAGE_EDIT: 'chat:message:edit',
  MESSAGE_DELETE: 'chat:message:delete',
  REACTION_ADD: 'chat:reaction:add',
  REACTION_REMOVE: 'chat:reaction:remove',
  TYPING_START: 'chat:typing:start',
  TYPING_STOP: 'chat:typing:stop',
  READ: 'chat:read',
  POLL_VOTE: 'chat:poll:vote',
  SET_PRESENCE: 'chat:presence:set',
} as const;
export type ChatClientEvent = (typeof ChatClientEvent)[keyof typeof ChatClientEvent];

export const ChatServerEvent = {
  MESSAGE_NEW: 'chat:message:new',
  MESSAGE_EDITED: 'chat:message:edited',
  MESSAGE_DELETED: 'chat:message:deleted',
  REACTION_UPDATED: 'chat:reaction:updated',
  TYPING: 'chat:typing',
  TYPING_STOPPED: 'chat:typing:stopped',
  READ_RECEIPT: 'chat:read:receipt',
  PRESENCE_UPDATE: 'chat:presence:update',
  UNREAD_UPDATE: 'chat:unread:update',
  CONVERSATION_NEW: 'chat:conversation:new',
  CONVERSATION_UPDATE: 'chat:conversation:update',
  CONVERSATION_REMOVED: 'chat:conversation:removed',
  POLL_UPDATE: 'chat:poll:update',
  PIN_UPDATE: 'chat:pin:update',
} as const;
export type ChatServerEvent = (typeof ChatServerEvent)[keyof typeof ChatServerEvent];

export interface ChatConversationRefPayload {
  conversationId: string;
}
export interface ChatMessageSendPayload {
  conversationId: string;
  content?: string;
  attachmentIds?: string[];
  parentId?: string | null;
  priority?: ChatMessagePriority;
  clientNonce?: string;
}
export interface ChatMessageEditPayload {
  messageId: string;
  content: string;
}
export interface ChatMessageDeletePayload {
  messageId: string;
}
export interface ChatReactionPayload {
  messageId: string;
  emoji: string;
}
export interface ChatReadPayload {
  conversationId: string;
  messageId?: string;
}
export interface ChatPollVotePayload {
  pollId: string;
  optionIds: string[];
}

export type ChatMessageNewPayload = ChatMessageDto;
export type ChatMessageEditedPayload = ChatMessageDto;
export interface ChatMessageDeletedPayload {
  conversationId: string;
  messageId: string;
}
export interface ChatReactionUpdatedPayload {
  conversationId: string;
  messageId: string;
  reactions: ReactionSummaryDto[];
}
export interface ChatTypingPayload {
  conversationId: string;
  userId: string;
  name: string;
}
export interface ChatTypingStoppedPayload {
  conversationId: string;
  userId: string;
}
export interface ChatReadReceiptPayload {
  conversationId: string;
  userId: string;
  lastReadAt: string;
}
export interface ChatPresencePayload {
  userId: string;
  online: boolean;
  status: PresenceStatus | null;
  customText: string | null;
  lastSeen: string | null;
}
export interface ChatSetPresencePayload {
  status: PresenceStatus;
  customText?: string | null;
}
export interface ChatUnreadUpdatePayload {
  conversationId: string;
  unread: number;
  total: number;
}
export type ChatConversationNewPayload = ConversationDto;
export type ChatConversationUpdatePayload = ConversationDto;
export interface ChatConversationRemovedPayload {
  conversationId: string;
}
export interface ChatPollUpdatePayload {
  conversationId: string;
  messageId: string;
  poll: PollDto;
}
export interface ChatPinUpdatePayload {
  conversationId: string;
  messageId: string;
  pinned: boolean;
}

export interface ChatClientToServerEvents {
  [ChatClientEvent.CONVERSATION_JOIN]: (payload: ChatConversationRefPayload) => void;
  [ChatClientEvent.CONVERSATION_LEAVE]: (payload: ChatConversationRefPayload) => void;
  [ChatClientEvent.MESSAGE_SEND]: (payload: ChatMessageSendPayload) => void;
  [ChatClientEvent.MESSAGE_EDIT]: (payload: ChatMessageEditPayload) => void;
  [ChatClientEvent.MESSAGE_DELETE]: (payload: ChatMessageDeletePayload) => void;
  [ChatClientEvent.REACTION_ADD]: (payload: ChatReactionPayload) => void;
  [ChatClientEvent.REACTION_REMOVE]: (payload: ChatReactionPayload) => void;
  [ChatClientEvent.TYPING_START]: (payload: ChatConversationRefPayload) => void;
  [ChatClientEvent.TYPING_STOP]: (payload: ChatConversationRefPayload) => void;
  [ChatClientEvent.READ]: (payload: ChatReadPayload) => void;
  [ChatClientEvent.POLL_VOTE]: (payload: ChatPollVotePayload) => void;
  [ChatClientEvent.SET_PRESENCE]: (payload: ChatSetPresencePayload) => void;
}

export interface ChatServerToClientEvents {
  [ChatServerEvent.MESSAGE_NEW]: (payload: ChatMessageNewPayload) => void;
  [ChatServerEvent.MESSAGE_EDITED]: (payload: ChatMessageEditedPayload) => void;
  [ChatServerEvent.MESSAGE_DELETED]: (payload: ChatMessageDeletedPayload) => void;
  [ChatServerEvent.REACTION_UPDATED]: (payload: ChatReactionUpdatedPayload) => void;
  [ChatServerEvent.TYPING]: (payload: ChatTypingPayload) => void;
  [ChatServerEvent.TYPING_STOPPED]: (payload: ChatTypingStoppedPayload) => void;
  [ChatServerEvent.READ_RECEIPT]: (payload: ChatReadReceiptPayload) => void;
  [ChatServerEvent.PRESENCE_UPDATE]: (payload: ChatPresencePayload) => void;
  [ChatServerEvent.UNREAD_UPDATE]: (payload: ChatUnreadUpdatePayload) => void;
  [ChatServerEvent.CONVERSATION_NEW]: (payload: ChatConversationNewPayload) => void;
  [ChatServerEvent.CONVERSATION_UPDATE]: (payload: ChatConversationUpdatePayload) => void;
  [ChatServerEvent.CONVERSATION_REMOVED]: (payload: ChatConversationRemovedPayload) => void;
  [ChatServerEvent.POLL_UPDATE]: (payload: ChatPollUpdatePayload) => void;
  [ChatServerEvent.PIN_UPDATE]: (payload: ChatPinUpdatePayload) => void;
}
