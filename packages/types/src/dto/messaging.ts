import type { AttachmentDto, MessageSenderDto } from './chat';

export const ConversationType = {
  DIRECT: 'DIRECT',
  GROUP: 'GROUP',
} as const;
export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType];

export const ConversationMemberRole = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const;
export type ConversationMemberRole =
  (typeof ConversationMemberRole)[keyof typeof ConversationMemberRole];

export const ChatMessageType = {
  TEXT: 'TEXT',
  POLL: 'POLL',
  SYSTEM: 'SYSTEM',
} as const;
export type ChatMessageType = (typeof ChatMessageType)[keyof typeof ChatMessageType];

export const ChatMessagePriority = {
  NORMAL: 'NORMAL',
  IMPORTANT: 'IMPORTANT',
  URGENT: 'URGENT',
} as const;
export type ChatMessagePriority = (typeof ChatMessagePriority)[keyof typeof ChatMessagePriority];

export const MentionKind = {
  USER: 'USER',
  EVERYONE: 'EVERYONE',
} as const;
export type MentionKind = (typeof MentionKind)[keyof typeof MentionKind];

export const ShareHistoryMode = {
  NONE: 'NONE',
  DAYS: 'DAYS',
  ALL: 'ALL',
} as const;
export type ShareHistoryMode = (typeof ShareHistoryMode)[keyof typeof ShareHistoryMode];

export interface ShareHistoryDto {
  mode: ShareHistoryMode;
  days?: number;
}

export const PresenceStatus = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  DND: 'DND',
  BRB: 'BRB',
  AWAY: 'AWAY',
  OFFLINE: 'OFFLINE',
} as const;
export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];

export interface UserPresenceDto {
  userId: string;
  online: boolean;
  status: PresenceStatus;
  customText: string | null;
  lastSeen: string | null;
}

export interface SetPresenceDto {
  status: PresenceStatus;
  customText?: string | null;
}

export interface ConversationStateDto {
  muted?: boolean;
  pinned?: boolean;
  hidden?: boolean;
  manualUnread?: boolean;
}

export interface ConversationMemberDto {
  userId: string;
  name: string;
  avatar: string | null;
  role: ConversationMemberRole;
  lastReadAt: string | null;
  lastDeliveredAt: string | null;
  online: boolean;
  status: PresenceStatus | null;
  customText: string | null;
  lastSeen: string | null;
  chatDisabled: boolean;
}

export interface ReactionSummaryDto {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe: boolean;
}

export interface PollOptionDto {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  votedByMe: boolean;
}

export interface PollDto {
  id: string;
  question: string;
  multiple: boolean;
  closedAt: string | null;
  totalVotes: number;
  options: PollOptionDto[];
}

export interface ChatMessageReplyDto {
  id: string;
  content: string;
  sender: MessageSenderDto | null;
  deletedAt: string | null;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  type: ChatMessageType;
  priority: ChatMessagePriority;
  content: string;
  sender: MessageSenderDto | null;
  parentId: string | null;
  parent: ChatMessageReplyDto | null;
  replyCount: number;
  attachments: AttachmentDto[];
  reactions: ReactionSummaryDto[];
  poll: PollDto | null;
  mentionedUserIds: string[];
  mentionsEveryone: boolean;
  pinned: boolean;
  saved: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  sentAt: string;
  clientNonce?: string | null;
}

export interface ConversationDto {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatar: string | null;
  members: ConversationMemberDto[];
  lastMessage: ChatMessageDto | null;
  lastMessageAt: string | null;
  unreadCount: number;
  muted: boolean;
  pinned: boolean;
  hidden: boolean;
  youAreAdmin: boolean;
  createdAt: string;
}

export interface CreateGroupBodyDto {
  title: string;
  description?: string | null;
  memberIds: string[];
}

export interface UpdateGroupBodyDto {
  title?: string;
  description?: string | null;
}

export interface AddGroupMembersBodyDto {
  userIds: string[];
  history?: ShareHistoryDto;
}

export interface UpdateGroupMemberRoleBodyDto {
  role: ConversationMemberRole;
}

export interface ConversationListDto {
  items: ConversationDto[];
}

export interface ChatMessagePageDto {
  items: ChatMessageDto[];
  nextCursor: string | null;
}

export interface OpenDirectDto {
  targetUserId: string;
}

export interface SendChatMessageDto {
  content?: string;
  attachmentIds?: string[];
  parentId?: string | null;
  priority?: ChatMessagePriority;
  clientNonce?: string;
}

export interface EditChatMessageDto {
  content: string;
}

export interface ForwardChatMessageDto {
  targetConversationId: string;
}

export interface SavedMessageDto {
  message: ChatMessageDto;
  conversationId: string;
  conversationTitle: string | null;
}

export interface SavedMessageListDto {
  items: SavedMessageDto[];
}

export interface PinnedMessageListDto {
  items: ChatMessageDto[];
}

export interface CreatePollDto {
  question: string;
  options: string[];
  multiple?: boolean;
}

export interface VotePollDto {
  optionIds: string[];
}

export interface MarkReadDto {
  messageId?: string;
}

export interface TeammateDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  chatDisabled: boolean;
  allowDirectMessages: boolean;
  online: boolean;
  status: PresenceStatus | null;
  lastSeen: string | null;
  conversationId: string | null;
}

export interface TeammateListDto {
  items: TeammateDto[];
}

export interface UnreadSummaryDto {
  total: number;
  byConversation: Record<string, number>;
}

export interface GifDto {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

export interface GifSearchResultDto {
  items: GifDto[];
}

export interface ActivityItemDto {
  message: ChatMessageDto;
  conversationId: string;
  conversationTitle: string | null;
}

export interface ActivityFeedDto {
  items: ActivityItemDto[];
}

export interface AdminGroupMemberDto {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface AdminGroupDto {
  id: string;
  title: string;
  memberCount: number;
  createdAt: string;
}

export interface AdminGroupDetailDto extends AdminGroupDto {
  members: AdminGroupMemberDto[];
}

export interface AdminCreateGroupDto {
  title: string;
  memberIds: string[];
}

export interface AdminUpdateGroupDto {
  title?: string;
}

export interface AdminAddGroupMembersDto {
  userIds: string[];
  history?: ShareHistoryDto;
}

export const UserInviteStatus = {
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
} as const;
export type UserInviteStatus = (typeof UserInviteStatus)[keyof typeof UserInviteStatus];

export interface AdminCreateUserInviteDto {
  email: string;
  name: string;
}

export interface UserInviteDto {
  id: string;
  email: string;
  name: string;
  status: UserInviteStatus;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface UserInviteListResponseDto {
  items: UserInviteDto[];
}

export interface UserInviteLookupDto {
  email: string;
  name: string;
  expiresAt: string;
}

export interface AcceptUserInviteDto {
  token: string;
  password: string;
  timezone?: string;
  language?: string;
  bio?: string | null;
}
