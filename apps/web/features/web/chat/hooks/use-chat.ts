'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ChatMessageDto,
  ChatMessagePriority,
  ConversationListDto,
  ConversationStateDto,
  CreatePollDto,
  GifSearchResultDto,
  PinnedMessageListDto,
  PublicUserDto,
  SavedMessageListDto,
  TeammateListDto,
  UserPresenceDto,
} from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';

import { chatApi } from '../services/chat';
import { useChatStore } from '../stores';
import { patchMessage, upsertMessage, type MessagesData } from '../lib/message-cache';

export const chatKeys = {
  conversations: () => ['chat', 'conversations'] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  teammates: (search: string) => ['chat', 'teammates', search] as const,
  pins: (conversationId: string) => ['chat', 'pins', conversationId] as const,
  saved: () => ['chat', 'saved'] as const,
};

function makeNonce(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function useConversations(opts: { includeHidden?: boolean } = {}) {
  const includeHidden = opts.includeHidden ?? false;

  return useQuery<ConversationListDto>({
    queryKey: [...chatKeys.conversations(), { includeHidden }],
    queryFn: ({ signal }) => chatApi.conversations({ includeHidden }, signal),
    staleTime: 15_000,
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useInfiniteQuery<
    Awaited<ReturnType<typeof chatApi.messages>>,
    Error,
    MessagesData,
    ReturnType<typeof chatKeys.messages>,
    string | undefined
  >({
    queryKey: chatKeys.messages(conversationId ?? ''),
    enabled: Boolean(conversationId),
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      chatApi.messages(conversationId as string, { cursor: pageParam, limit: 50 }, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 15_000,
  });
}

interface SendVars {
  content: string;
  attachmentIds: string[];
  parentId: string | null;
  priority: ChatMessagePriority;
  clientNonce: string;
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  const mutation = useMutation<ChatMessageDto, Error, SendVars>({
    mutationFn: (vars) =>
      chatApi.send(conversationId, {
        content: vars.content,
        attachmentIds: vars.attachmentIds,
        parentId: vars.parentId,
        priority: vars.priority,
        clientNonce: vars.clientNonce,
      }),
    onMutate: (vars) => {
      if (!user) {
        return;
      }

      const optimistic: ChatMessageDto = {
        id: `temp-${vars.clientNonce}`,
        conversationId,
        type: 'TEXT',
        priority: vars.priority,
        content: vars.content,
        sender: { id: user.id, name: user.name, avatar: user.avatar },
        parentId: vars.parentId,
        parent: null,
        replyCount: 0,
        attachments: [],
        reactions: [],
        poll: null,
        mentionedUserIds: [],
        mentionsEveryone: false,
        pinned: false,
        saved: false,
        editedAt: null,
        deletedAt: null,
        sentAt: new Date().toISOString(),
        clientNonce: vars.clientNonce,
      };

      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        upsertMessage(data, optimistic),
      );
    },
    onSuccess: (real) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        upsertMessage(data, real),
      );
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
    },
  });

  const send = (input: {
    content: string;
    attachmentIds: string[];
    parentId: string | null;
    priority?: ChatMessagePriority;
  }) =>
    mutation.mutate({
      ...input,
      priority: input.priority ?? 'NORMAL',
      clientNonce: makeNonce(),
    });

  return { ...mutation, send };
}

export function useEditMessage(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      chatApi.editMessage(messageId, content),
    onSuccess: (message) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        upsertMessage(data, message),
      );
    },
  });
}

export function useDeleteMessage(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => chatApi.deleteMessage(messageId),
    onSuccess: (message) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        upsertMessage(data, message),
      );
    },
  });
}

export function useToggleReaction(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      emoji,
      reactedByMe,
    }: {
      messageId: string;
      emoji: string;
      reactedByMe: boolean;
    }) =>
      reactedByMe
        ? chatApi.removeReaction(messageId, emoji)
        : chatApi.addReaction(messageId, emoji),
    onSuccess: (message) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        upsertMessage(data, message),
      );
    },
  });
}

export function useCreatePoll(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (poll: CreatePollDto) => chatApi.createPoll(conversationId, poll),
    onSuccess: (message) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        upsertMessage(data, message),
      );
    },
  });
}

export function usePollVote(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      pollId,
      optionIds,
    }: {
      messageId: string;
      pollId: string;
      optionIds: string[];
    }) => chatApi.votePoll(pollId, optionIds),
    onSuccess: (poll, { messageId }) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { poll }),
      );
    },
  });
}

export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  const clearUnread = useChatStore((s) => s.clearUnread);

  return useMutation({
    mutationFn: (messageId?: string) => chatApi.markRead(conversationId, messageId),
    onSuccess: () => {
      clearUnread(conversationId);
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useTeammates(search: string) {
  return useQuery<TeammateListDto>({
    queryKey: chatKeys.teammates(search),
    queryFn: ({ signal }) => chatApi.teammates(search || undefined, signal),
    staleTime: 30_000,
  });
}

export function useTogglePin(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      pinned,
    }: {
      messageId: string;
      pinned: boolean;
    }): Promise<{ pinned: boolean }> =>
      pinned ? chatApi.unpin(messageId) : chatApi.pin(messageId),
    onSuccess: (_res, { messageId, pinned }) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { pinned: !pinned }),
      );
      void qc.invalidateQueries({ queryKey: chatKeys.pins(conversationId) });
    },
  });
}

export function useToggleSave(conversationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      saved,
    }: {
      messageId: string;
      saved: boolean;
    }): Promise<{ saved: boolean }> =>
      saved ? chatApi.unsave(messageId) : chatApi.save(messageId),
    onSuccess: (_res, { messageId, saved }) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { saved: !saved }),
      );
      void qc.invalidateQueries({ queryKey: chatKeys.saved() });
    },
  });
}

export function useForwardMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      targetConversationId,
    }: {
      messageId: string;
      targetConversationId: string;
    }) => chatApi.forward(messageId, targetConversationId),
    onSuccess: (message) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(message.conversationId), (data) =>
        upsertMessage(data, message),
      );
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function usePins(conversationId: string | undefined) {
  return useQuery<PinnedMessageListDto>({
    queryKey: chatKeys.pins(conversationId ?? ''),
    queryFn: ({ signal }) => chatApi.listPins(conversationId as string, signal),
    enabled: Boolean(conversationId),
    staleTime: 15_000,
  });
}

export function useSaved() {
  return useQuery<SavedMessageListDto>({
    queryKey: chatKeys.saved(),
    queryFn: ({ signal }) => chatApi.listSaved(signal),
    staleTime: 15_000,
  });
}

export function useConversationState() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      state,
    }: {
      conversationId: string;
      state: ConversationStateDto;
    }) => chatApi.setState(conversationId, state),
    onSuccess: (_res, { conversationId, state }) => {
      // Update EVERY cached conversation-list variant (both includeHidden=false
      // and includeHidden=true) via prefix-matching setQueriesData. Mutate the
      // matched conversation's flags; the subsequent invalidateQueries refetch
      // reconciles whether the item should stay/leave each variant.
      qc.setQueriesData<ConversationListDto>(
        { queryKey: chatKeys.conversations() },
        (list) => {
          if (!list) return list;
          const items = list.items.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  ...(state.muted !== undefined ? { muted: state.muted } : {}),
                  ...(state.pinned !== undefined ? { pinned: state.pinned } : {}),
                  ...(state.hidden !== undefined ? { hidden: state.hidden } : {}),
                }
              : c,
          );
          return { items };
        },
      );
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useGifs(query: string, enabled: boolean) {
  return useQuery<GifSearchResultDto>({
    queryKey: ['chat', 'gifs', query],
    queryFn: ({ signal }) => chatApi.gifs(query, signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useMyTeams() {
  return useQuery({
    queryKey: ['chat', 'teams'],
    queryFn: ({ signal }) => chatApi.myTeams(signal),
    staleTime: 30_000,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: ['chat', 'activity'],
    queryFn: ({ signal }) => chatApi.activity(signal),
    staleTime: 15_000,
  });
}

export const presenceMeKey = ['chat', 'presence', 'me'] as const;

export function usePresenceMe() {
  return useQuery<UserPresenceDto>({
    queryKey: presenceMeKey,
    queryFn: ({ signal }) => chatApi.presenceMe(signal),
    staleTime: 30_000,
  });
}

// --- Groups (user-initiated) ---

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string | null; memberIds: string[] }) =>
      chatApi.createGroup(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useUpdateGroup(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; description?: string | null }) =>
      chatApi.updateGroup(conversationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useAddGroupMembers(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => chatApi.addGroupMembers(conversationId, userIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useRemoveGroupMember(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => chatApi.removeGroupMember(conversationId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useSetGroupMemberRole(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) =>
      chatApi.setGroupMemberRole(conversationId, userId, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.deleteGroup(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function usePublicUser(userId: string | null | undefined) {
  return useQuery<PublicUserDto>({
    queryKey: ['chat', 'public-user', userId ?? ''],
    queryFn: ({ signal }) => chatApi.publicUser(userId as string, signal),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
