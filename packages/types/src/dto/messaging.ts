import type { AttachmentDto, MessageSenderDto } from './chat';

export const ConversationType = {
  DIRECT: 'DIRECT',
  GROUP: 'GROUP',
  CHANNEL: 'CHANNEL',
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
  CHANNEL: 'CHANNEL',
  EVERYONE: 'EVERYONE',
} as const;
export type MentionKind = (typeof MentionKind)[keyof typeof MentionKind];

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
  online: boolean;
  status: PresenceStatus | null;
  customText: string | null;
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

/** Lightweight quoted parent shown inside a reply bubble. */
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
  /** null once the sender's account is deleted. */
  sender: MessageSenderDto | null;
  parentId: string | null;
  parent: ChatMessageReplyDto | null;
  /** Thread reply count for channel root posts (0 elsewhere). */
  replyCount: number;
  attachments: AttachmentDto[];
  reactions: ReactionSummaryDto[];
  poll: PollDto | null;
  /** User ids @mentioned in this message; the client derives "mentions me". */
  mentionedUserIds: string[];
  /** True when the message @mentions everyone / the whole channel. */
  mentionsEveryone: boolean;
  /** True when this message is pinned in its conversation (same for all viewers). */
  pinned: boolean;
  /** True when the requesting viewer has saved this message (REST only; false over socket). */
  saved: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  /** createdAt — named `sentAt` so the shared message-grouping util works for both meeting and chat messages. */
  sentAt: string;
  /** Echoed back to the sender so an optimistic message can be reconciled. */
  clientNonce?: string | null;
}

export interface ConversationDto {
  id: string;
  type: ConversationType;
  /** Group/channel title; null for DIRECT (the FE derives the peer's name from members). */
  title: string | null;
  /** Channel topic; null for DIRECT/GROUP. */
  description: string | null;
  /** Owning team for CHANNEL conversations; null otherwise. */
  teamId: string | null;
  members: ConversationMemberDto[];
  lastMessage: ChatMessageDto | null;
  lastMessageAt: string | null;
  unreadCount: number;
  /** The requesting viewer's per-conversation flags. */
  muted: boolean;
  pinned: boolean;
  createdAt: string;
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

/** A saved/pinned message bundled with its conversation for the Saved / Pinned views. */
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
  online: boolean;
  /** An existing DM with this teammate, if one exists. */
  conversationId: string | null;
}

export interface TeammateListDto {
  items: TeammateDto[];
}

export interface UnreadSummaryDto {
  total: number;
  byConversation: Record<string, number>;
}

// --- GIFs (Tenor) ---

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

// --- Channels & threads (client) ---

/** A team the viewer belongs to, with its channels (each a CHANNEL conversation). */
export interface MyTeamDto {
  teamId: string;
  teamName: string;
  channels: ConversationDto[];
}

export interface MyTeamsResponseDto {
  items: MyTeamDto[];
}

/** A channel thread: the root post plus its replies. */
export interface ThreadDto {
  root: ChatMessageDto;
  replies: ChatMessageDto[];
}

// --- Activity feed ---

export interface ActivityItemDto {
  message: ChatMessageDto;
  conversationId: string;
  conversationTitle: string | null;
}

export interface ActivityFeedDto {
  items: ActivityItemDto[];
}

// --- Admin: teams ---

export interface AdminTeamMemberDto {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  joinedAt: string;
}

export interface AdminTeamDto {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export interface AdminTeamDetailDto extends AdminTeamDto {
  members: AdminTeamMemberDto[];
}

export interface AdminTeamListResponseDto {
  items: AdminTeamDto[];
}

export interface AdminCreateTeamDto {
  name: string;
}

export interface AdminUpdateTeamDto {
  name?: string;
}

export interface AdminAddTeamMembersDto {
  userIds: string[];
}

// --- Admin: channels (within a team) ---

export interface AdminChannelDto {
  id: string;
  name: string;
  description: string | null;
  isGeneral: boolean;
  memberCount: number;
  createdAt: string;
}

export interface AdminChannelListResponseDto {
  items: AdminChannelDto[];
}

export interface AdminCreateChannelDto {
  name: string;
  description?: string | null;
}

export interface AdminUpdateChannelDto {
  name?: string;
  description?: string | null;
}

// --- Admin: groups (group conversations) ---

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

export interface AdminGroupListResponseDto {
  items: AdminGroupDto[];
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
}

// --- User invites (invite-only signup; mirrors the admin invite flow) ---

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
}
