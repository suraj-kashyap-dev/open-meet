import type {
  ActivityFeedDto,
  ChatMessageDto,
  ChatMessagePageDto,
  ConversationDto,
  ConversationListDto,
  ConversationStateDto,
  CreatePollDto,
  GifSearchResultDto,
  MyTeamsResponseDto,
  PinnedMessageListDto,
  PollDto,
  SavedMessageListDto,
  SendChatMessageDto,
  TeammateListDto,
  ThreadDto,
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
  conversations: (signal?: AbortSignal) =>
    api.get<ConversationListDto>('/messaging/conversations', { signal }),

  conversation: (id: string, signal?: AbortSignal) =>
    api.get<ConversationDto>(`/messaging/conversations/${id}`, { signal }),

  messages: (id: string, params: { cursor?: string; limit?: number }, signal?: AbortSignal) =>
    api.get<ChatMessagePageDto>(`/messaging/conversations/${id}/messages${query(params)}`, {
      signal,
    }),

  send: (id: string, body: SendChatMessageDto) =>
    api.post<ChatMessageDto>(`/messaging/conversations/${id}/messages`, body),

  openDirect: (targetUserId: string) =>
    api.post<ConversationDto>('/messaging/conversations/direct', { targetUserId }),

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

  myTeams: (signal?: AbortSignal) => api.get<MyTeamsResponseDto>('/messaging/teams', { signal }),

  activity: (signal?: AbortSignal) => api.get<ActivityFeedDto>('/messaging/activity', { signal }),

  thread: (rootId: string, signal?: AbortSignal) =>
    api.get<ThreadDto>(`/messaging/threads/${rootId}`, { signal }),
};
