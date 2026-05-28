import type { ConversationDto, ConversationMemberDto } from '@open-meet/types';

export interface ConversationDisplay {
  isGroup: boolean;
  /** Peer in a DIRECT conversation; null for groups. */
  peer: ConversationMemberDto | null;
  /** Best-effort display title (peer name or group title); may be empty. */
  title: string;
  avatar: string | null;
}

/** Derives how a conversation should be labelled for the current viewer. */
export function conversationDisplay(
  conversation: ConversationDto,
  currentUserId: string | undefined,
): ConversationDisplay {
  // Groups and channels are title-based (no single peer); DMs derive from the peer.
  if (conversation.type === 'GROUP' || conversation.type === 'CHANNEL') {
    return { isGroup: true, peer: null, title: conversation.title ?? '', avatar: null };
  }

  const peer =
    conversation.members.find((m) => m.userId !== currentUserId) ?? conversation.members[0] ?? null;

  return {
    isGroup: false,
    peer,
    title: peer?.name ?? '',
    avatar: peer?.avatar ?? null,
  };
}
