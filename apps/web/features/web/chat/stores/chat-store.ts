import type { PresenceStatus } from '@open-meet/types';
import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

interface PresenceEntry {
  online: boolean;
  status: PresenceStatus | null;
  customText: string | null;
  lastSeen: string | null;
}

interface TypingEntry {
  name: string;
  at: number;
}

interface ChatStoreState {
  /** Conversation currently open on screen (suppresses its unread + toasts). */
  activeConversationId: string | null;
  /** Whether the right-side info panel is open for the active conversation. */
  infoOpen: boolean;
  totalUnread: number;
  unreadByConversation: Record<string, number>;
  presenceByUser: Record<string, PresenceEntry>;
  typingByConversation: Record<string, Record<string, TypingEntry>>;
  connection: ConnectionStatus;

  setActiveConversation: (id: string | null) => void;
  toggleInfo: () => void;
  setInfoOpen: (open: boolean) => void;
  setUnreadSummary: (byConversation: Record<string, number>) => void;
  setConversationUnread: (conversationId: string, count: number) => void;
  bumpUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setPresence: (userId: string, entry: PresenceEntry) => void;
  setTyping: (conversationId: string, userId: string, name: string) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  setConnection: (status: ConnectionStatus) => void;
  reset: () => void;
}

function sum(map: Record<string, number>): number {
  return Object.values(map).reduce((total, n) => total + n, 0);
}

export const useChatStore = create<ChatStoreState>((set) => ({
  activeConversationId: null,
  infoOpen: false,
  totalUnread: 0,
  unreadByConversation: {},
  presenceByUser: {},
  typingByConversation: {},
  connection: 'connected',

  setActiveConversation: (id) => set({ activeConversationId: id, infoOpen: false }),

  toggleInfo: () => set((s) => ({ infoOpen: !s.infoOpen })),
  setInfoOpen: (open) => set({ infoOpen: open }),

  setUnreadSummary: (byConversation) =>
    set({ unreadByConversation: byConversation, totalUnread: sum(byConversation) }),

  setConversationUnread: (conversationId, count) =>
    set((state) => {
      const next = { ...state.unreadByConversation };

      if (count > 0) {
        next[conversationId] = count;
      } else {
        delete next[conversationId];
      }

      return { unreadByConversation: next, totalUnread: sum(next) };
    }),

  bumpUnread: (conversationId) =>
    set((state) => {
      const next = {
        ...state.unreadByConversation,
        [conversationId]: (state.unreadByConversation[conversationId] ?? 0) + 1,
      };

      return { unreadByConversation: next, totalUnread: sum(next) };
    }),

  clearUnread: (conversationId) =>
    set((state) => {
      if (!(conversationId in state.unreadByConversation)) {
        return state;
      }

      const next = { ...state.unreadByConversation };
      delete next[conversationId];

      return { unreadByConversation: next, totalUnread: sum(next) };
    }),

  setPresence: (userId, entry) =>
    set((state) => ({
      presenceByUser: { ...state.presenceByUser, [userId]: entry },
    })),

  setTyping: (conversationId, userId, name) =>
    set((state) => ({
      typingByConversation: {
        ...state.typingByConversation,
        [conversationId]: {
          ...state.typingByConversation[conversationId],
          [userId]: { name, at: Date.now() },
        },
      },
    })),

  clearTyping: (conversationId, userId) =>
    set((state) => {
      const conv = state.typingByConversation[conversationId];

      if (!conv || !(userId in conv)) {
        return state;
      }

      const nextConv = { ...conv };
      delete nextConv[userId];

      return {
        typingByConversation: { ...state.typingByConversation, [conversationId]: nextConv },
      };
    }),

  setConnection: (status) => set({ connection: status }),

  reset: () =>
    set({
      activeConversationId: null,
      infoOpen: false,
      totalUnread: 0,
      unreadByConversation: {},
      presenceByUser: {},
      typingByConversation: {},
      connection: 'connected',
    }),
}));
