'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import {
  ChatClientEvent,
  ChatServerEvent,
  type ChatMessageDeletedPayload,
  type ChatMessageDto,
  type ChatPinUpdatePayload,
  type ChatPollUpdatePayload,
  type ChatPresencePayload,
  type PresenceStatus,
  type ChatReactionUpdatedPayload,
  type ChatReadReceiptPayload,
  type ChatDeliveryReceiptPayload,
  type ChatTypingPayload,
  type ChatTypingStoppedPayload,
  type ConversationDto,
  type ConversationListDto,
} from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useNotification } from '@/hooks/use-notification';
import { previewText } from '@/components/shared/chat';
import { useRouter } from '@/i18n/navigation';

import { chatApi } from '../services/chat';
import { chatKeys, presenceMeKey } from '../hooks/use-chat';
import { useChatSocket, type ChatSocket } from '../hooks/use-chat-socket';
import { patchMessage, upsertMessage, type MessagesData } from '../lib/message-cache';
import { useChatStore } from '../stores';

interface ChatSocketContextValue {
  socket: ChatSocket | null;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markDelivered: (conversationId: string) => void;
  setPresence: (status: PresenceStatus, customText?: string | null) => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

export function useChatSocketContext(): ChatSocketContextValue {
  const ctx = useContext(ChatSocketContext);

  if (!ctx) {
    return {
      socket: null,
      joinConversation: () => {},
      leaveConversation: () => {},
      startTyping: () => {},
      stopTyping: () => {},
      markDelivered: () => {},
      setPresence: () => {},
    };
  }

  return ctx;
}

function applyIncoming(
  list: ConversationListDto | undefined,
  message: ChatMessageDto,
  incrementUnread: boolean,
): ConversationListDto | undefined {
  if (!list) {
    return list;
  }

  const index = list.items.findIndex((c) => c.id === message.conversationId);

  if (index === -1) {
    return list;
  }

  const current = list.items[index]!;

  const updated: ConversationDto = {
    ...current,
    lastMessage: message,
    lastMessageAt: message.sentAt,
    unreadCount: incrementUnread ? current.unreadCount + 1 : current.unreadCount,
  };

  return { items: [updated, ...list.items.filter((_, i) => i !== index)] };
}

function removeConversation(
  list: ConversationListDto | undefined,
  conversationId: string,
): ConversationListDto | undefined {
  if (!list) {
    return list;
  }

  return { items: list.items.filter((conversation) => conversation.id !== conversationId) };
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const socket = useChatSocket(Boolean(user));
  const qc = useQueryClient();
  const router = useRouter();
  const { notify } = useNotification();

  const setPresence = useChatStore((s) => s.setPresence);
  const setTyping = useChatStore((s) => s.setTyping);
  const clearTyping = useChatStore((s) => s.clearTyping);
  const setConnection = useChatStore((s) => s.setConnection);
  const bumpUnread = useChatStore((s) => s.bumpUnread);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const setConversationUnread = useChatStore((s) => s.setConversationUnread);
  const setUnreadSummary = useChatStore((s) => s.setUnreadSummary);

  const unread = useQuery({
    queryKey: ['chat', 'unread'],
    queryFn: ({ signal }) => chatApi.unread(signal),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (unread.data) {
      setUnreadSummary(unread.data.byConversation);
    }
  }, [unread.data, setUnreadSummary]);

  useEffect(() => {
    if (!socket) {
      setConnection('offline');
      return;
    }

    const onConnect = () => {
      setConnection('connected');
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      void qc.invalidateQueries({ queryKey: presenceMeKey });
    };

    const onDisconnect = () => setConnection('reconnecting');

    const onMessageNew = (message: ChatMessageDto) => {
      const isMine = message.sender?.id === user?.id;
      const isActive = useChatStore.getState().activeConversationId === message.conversationId;

      qc.setQueryData<MessagesData>(chatKeys.messages(message.conversationId), (data) =>
        upsertMessage(data, message),
      );
      qc.setQueriesData<ConversationListDto>({ queryKey: chatKeys.conversations() }, (list) =>
        applyIncoming(list, message, !isMine && !isActive),
      );

      if (!isMine) {
        socket.emit(ChatClientEvent.DELIVERED, { conversationId: message.conversationId });
      }

      if (!isMine && !isActive) {
        bumpUnread(message.conversationId);

        // Foreground notification: fires only when the tab is hidden (the helper
        // self-suppresses when the tab is focused). Background/closed-tab delivery
        // is handled by web push on the server.
        notify(message.sender?.name ?? 'New message', {
          body: message.deletedAt ? '' : previewText(message.content) || 'New message',
          tag: `chat:${message.conversationId}`,
          onClick: () => router.push(`/chat/${message.conversationId}`),
        });
      }
    };

    const onMessageEdited = (message: ChatMessageDto) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(message.conversationId), (data) =>
        upsertMessage(data, message),
      );
    };

    const onMessageDeleted = ({ conversationId, messageId }: ChatMessageDeletedPayload) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { content: '', deletedAt: new Date().toISOString() }),
      );
    };

    const onReaction = ({ conversationId, messageId, reactions }: ChatReactionUpdatedPayload) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { reactions }),
      );
    };

    const onTyping = ({ conversationId, userId, name }: ChatTypingPayload) => {
      if (userId !== user?.id) {
        setTyping(conversationId, userId, name);
      }
    };

    const onTypingStopped = ({ conversationId, userId }: ChatTypingStoppedPayload) =>
      clearTyping(conversationId, userId);

    const onReadReceipt = ({ conversationId, userId, lastReadAt }: ChatReadReceiptPayload) => {
      if (userId === user?.id) {
        clearUnread(conversationId);
      }

      qc.setQueriesData<ConversationListDto>({ queryKey: chatKeys.conversations() }, (list) =>
        list
          ? {
              items: list.items.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      members: c.members.map((m) =>
                        m.userId === userId ? { ...m, lastReadAt } : m,
                      ),
                    }
                  : c,
              ),
            }
          : list,
      );
    };

    const onDeliveryReceipt = ({
      conversationId,
      userId,
      lastDeliveredAt,
    }: ChatDeliveryReceiptPayload) => {
      qc.setQueriesData<ConversationListDto>({ queryKey: chatKeys.conversations() }, (list) =>
        list
          ? {
              items: list.items.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      members: c.members.map((m) =>
                        m.userId === userId ? { ...m, lastDeliveredAt } : m,
                      ),
                    }
                  : c,
              ),
            }
          : list,
      );
    };

    const onPresence = ({ userId, online, status, customText, lastSeen }: ChatPresencePayload) => {
      setPresence(userId, { online, status, customText, lastSeen });

      if (userId === user?.id) {
        qc.setQueryData(presenceMeKey, {
          userId,
          online,
          status,
          customText,
          lastSeen,
        });
      }
    };

    const onConversationNew = (conversation: ConversationDto) => {
      socket.emit(ChatClientEvent.CONVERSATION_JOIN, { conversationId: conversation.id });
      setConversationUnread(conversation.id, conversation.unreadCount);
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversation.id) });
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    };

    const onConversationUpdate = (conversation: ConversationDto) => {
      setConversationUnread(conversation.id, conversation.unreadCount);
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversation.id) });
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    };

    const onConversationRemoved = ({ conversationId }: { conversationId: string }) => {
      clearUnread(conversationId);
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      qc.setQueriesData<ConversationListDto>({ queryKey: chatKeys.conversations() }, (list) =>
        removeConversation(list, conversationId),
      );
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    };

    const onPollUpdate = ({ conversationId, messageId, poll }: ChatPollUpdatePayload) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { poll }),
      );
    };

    const onPinUpdate = ({ conversationId, messageId, pinned }: ChatPinUpdatePayload) => {
      qc.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
        patchMessage(data, messageId, { pinned }),
      );
      void qc.invalidateQueries({ queryKey: chatKeys.pins(conversationId) });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ChatServerEvent.MESSAGE_NEW, onMessageNew);
    socket.on(ChatServerEvent.MESSAGE_EDITED, onMessageEdited);
    socket.on(ChatServerEvent.MESSAGE_DELETED, onMessageDeleted);
    socket.on(ChatServerEvent.REACTION_UPDATED, onReaction);
    socket.on(ChatServerEvent.TYPING, onTyping);
    socket.on(ChatServerEvent.TYPING_STOPPED, onTypingStopped);
    socket.on(ChatServerEvent.READ_RECEIPT, onReadReceipt);
    socket.on(ChatServerEvent.DELIVERY_RECEIPT, onDeliveryReceipt);
    socket.on(ChatServerEvent.PRESENCE_UPDATE, onPresence);
    socket.on(ChatServerEvent.CONVERSATION_NEW, onConversationNew);
    socket.on(ChatServerEvent.CONVERSATION_UPDATE, onConversationUpdate);
    socket.on(ChatServerEvent.CONVERSATION_REMOVED, onConversationRemoved);
    socket.on(ChatServerEvent.POLL_UPDATE, onPollUpdate);
    socket.on(ChatServerEvent.PIN_UPDATE, onPinUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ChatServerEvent.MESSAGE_NEW, onMessageNew);
      socket.off(ChatServerEvent.MESSAGE_EDITED, onMessageEdited);
      socket.off(ChatServerEvent.MESSAGE_DELETED, onMessageDeleted);
      socket.off(ChatServerEvent.REACTION_UPDATED, onReaction);
      socket.off(ChatServerEvent.TYPING, onTyping);
      socket.off(ChatServerEvent.TYPING_STOPPED, onTypingStopped);
      socket.off(ChatServerEvent.READ_RECEIPT, onReadReceipt);
      socket.off(ChatServerEvent.DELIVERY_RECEIPT, onDeliveryReceipt);
      socket.off(ChatServerEvent.PRESENCE_UPDATE, onPresence);
      socket.off(ChatServerEvent.CONVERSATION_NEW, onConversationNew);
      socket.off(ChatServerEvent.CONVERSATION_UPDATE, onConversationUpdate);
      socket.off(ChatServerEvent.CONVERSATION_REMOVED, onConversationRemoved);
      socket.off(ChatServerEvent.POLL_UPDATE, onPollUpdate);
      socket.off(ChatServerEvent.PIN_UPDATE, onPinUpdate);
    };
  }, [
    socket,
    qc,
    user?.id,
    setPresence,
    setTyping,
    clearTyping,
    setConnection,
    bumpUnread,
    clearUnread,
    setConversationUnread,
    setUnreadSummary,
    notify,
    router,
  ]);

  const value = useMemo<ChatSocketContextValue>(
    () => ({
      socket,
      joinConversation: (id) =>
        socket?.emit(ChatClientEvent.CONVERSATION_JOIN, { conversationId: id }),
      leaveConversation: (id) =>
        socket?.emit(ChatClientEvent.CONVERSATION_LEAVE, { conversationId: id }),
      startTyping: (id) => socket?.emit(ChatClientEvent.TYPING_START, { conversationId: id }),
      stopTyping: (id) => socket?.emit(ChatClientEvent.TYPING_STOP, { conversationId: id }),
      markDelivered: (id) => socket?.emit(ChatClientEvent.DELIVERED, { conversationId: id }),
      setPresence: (status, customText) =>
        socket?.emit(ChatClientEvent.SET_PRESENCE, { status, customText: customText ?? null }),
    }),
    [socket],
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}
