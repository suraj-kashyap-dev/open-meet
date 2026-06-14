import type {
  ActivityFeedDto,
  ChatMessageDto,
  ChatMessagePageDto,
  ConversationDto,
  ConversationListDto,
  ConversationStateDto,
  CreatePollDto,
  GifSearchResultDto,
  PinnedMessageListDto,
  PollDto,
  PublicUserDto,
  SavedMessageListDto,
  SendChatMessageDto,
  ShareHistoryDto,
  TeammateListDto,
  UnreadSummaryDto,
  UserPresenceDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const str = search.toString();

  return str ? `?${str}` : '';
}

export const chatApi = {
  conversations: (params: { includeHidden?: boolean } = {}, signal?: AbortSignal) =>
    api.get<ConversationListDto>(
      `/messaging/conversations${query({ includeHidden: params.includeHidden ? 1 : undefined })}`,
      { signal },
    ),

  conversation: (id: string, signal?: AbortSignal) =>
    api.get<ConversationDto>(`/messaging/conversations/${id}`, { signal }),

  clearConversation: (id: string) => api.post<{ ok: true }>(`/messaging/conversations/${id}/clear`),

  deleteConversation: (id: string) =>
    api.post<{ ok: true }>(`/messaging/conversations/${id}/delete`),

  messages: (id: string, params: { cursor?: string; limit?: number }, signal?: AbortSignal) =>
    api.get<ChatMessagePageDto>(`/messaging/conversations/${id}/messages${query(params)}`, {
      signal,
    }),

  send: (id: string, body: SendChatMessageDto) =>
    api.post<ChatMessageDto>(`/messaging/conversations/${id}/messages`, body),

  openDirect: (targetUserId: string) =>
    api.post<ConversationDto>('/messaging/conversations/direct', { targetUserId }),

  createGroup: (body: { title: string; description?: string | null; memberIds: string[] }) =>
    api.post<ConversationDto>('/messaging/groups', body),

  updateGroup: (id: string, body: { title?: string; description?: string | null }) =>
    api.patch<ConversationDto>(`/messaging/groups/${id}`, body),

  addGroupMembers: (id: string, userIds: string[], history?: ShareHistoryDto) =>
    api.post<ConversationDto>(`/messaging/groups/${id}/members`, { userIds, history }),

  removeGroupMember: (id: string, userId: string) =>
    api.delete<void>(`/messaging/groups/${id}/members/${userId}`),

  setGroupMemberRole: (id: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    api.post<ConversationDto>(`/messaging/groups/${id}/members/${userId}/role`, { role }),

  deleteGroup: (id: string) => api.delete<void>(`/messaging/groups/${id}`),

  markRead: (id: string, messageId?: string) =>
    api.post<{ unread: number }>(`/messaging/conversations/${id}/read`, { messageId }),

  editMessage: (messageId: string, content: string) =>
    api.patch<ChatMessageDto>(`/messaging/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string) =>
    api.delete<ChatMessageDto>(`/messaging/messages/${messageId}`),

  addReaction: (messageId: string, emoji: string) =>
    api.post<ChatMessageDto>(`/messaging/messages/${messageId}/reactions`, { emoji }),

  removeReaction: (messageId: string, emoji: string) =>
    api.delete<ChatMessageDto>(
      `/messaging/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    ),

  createPoll: (id: string, body: CreatePollDto) =>
    api.post<ChatMessageDto>(`/messaging/conversations/${id}/polls`, body),

  votePoll: (pollId: string, optionIds: string[]) =>
    api.post<PollDto>(`/messaging/polls/${pollId}/vote`, { optionIds }),

  forward: (messageId: string, targetConversationId: string) =>
    api.post<ChatMessageDto>(`/messaging/messages/${messageId}/forward`, { targetConversationId }),

  pin: (messageId: string) => api.post<{ pinned: true }>(`/messaging/messages/${messageId}/pin`),

  unpin: (messageId: string) =>
    api.delete<{ pinned: false }>(`/messaging/messages/${messageId}/pin`),

  listPins: (conversationId: string, signal?: AbortSignal) =>
    api.get<PinnedMessageListDto>(`/messaging/conversations/${conversationId}/pins`, { signal }),

  save: (messageId: string) => api.post<{ saved: true }>(`/messaging/messages/${messageId}/save`),

  unsave: (messageId: string) =>
    api.delete<{ saved: false }>(`/messaging/messages/${messageId}/save`),

  listSaved: (signal?: AbortSignal) => api.get<SavedMessageListDto>('/messaging/saved', { signal }),

  teammates: (search: string | undefined, signal?: AbortSignal) =>
    api.get<TeammateListDto>(`/messaging/teammates${query({ search })}`, { signal }),

  unread: (signal?: AbortSignal) => api.get<UnreadSummaryDto>('/messaging/unread', { signal }),

  setState: (conversationId: string, body: ConversationStateDto) =>
    api.patch<{ ok: true }>(`/messaging/conversations/${conversationId}/state`, body),

  presenceMe: (signal?: AbortSignal) =>
    api.get<UserPresenceDto>('/messaging/presence/me', { signal }),

  gifs: (q: string, signal?: AbortSignal) =>
    api.get<GifSearchResultDto>(`/messaging/gifs${query({ q })}`, { signal }),

  activity: (signal?: AbortSignal) => api.get<ActivityFeedDto>('/messaging/activity', { signal }),

  publicUser: (userId: string, signal?: AbortSignal) =>
    api.get<PublicUserDto>(`/users/${userId}/public`, { signal }),
};
