import type { ConversationDto, ConversationMemberDto } from '@open-meet/types';

export interface ConversationDisplay {
  isGroup: boolean;
  peer: ConversationMemberDto | null;
  title: string;
  avatar: string | null;
}

export function conversationDisplay(
  conversation: ConversationDto,
  currentUserId: string | undefined,
): ConversationDisplay {
  if (conversation.type === 'GROUP') {
    return {
      isGroup: true,
      peer: null,
      title: conversation.title ?? '',
      avatar: conversation.avatar,
    };
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
