'use client';

import { create } from 'zustand';

import type { MessageDto } from '@open-meet/types';

const REACTION_LIFETIME_MS = 4200;
const REACTION_MAX_CONCURRENT = 12;

interface ChatState {
  messages: MessageDto[];
  unread: number;
  isOpen: boolean;
  reactions: Array<{ id: string; emoji: string; name: string }>;
  setOpen: (open: boolean) => void;
  add: (message: MessageDto) => void;
  pushReaction: (emoji: string, name: string) => void;
  clearReaction: (id: string) => void;
  reset: () => void;
}

let reactionCounter = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  unread: 0,
  isOpen: false,
  reactions: [],
  setOpen: (open) => {
    set({ isOpen: open, unread: open ? 0 : get().unread });
  },
  add: (message) => {
    set((s) => ({
      messages: [...s.messages, message],
      unread: s.isOpen ? s.unread : s.unread + 1,
    }));
  },
  pushReaction: (emoji, name) => {
    reactionCounter += 1;
    const id = `r-${reactionCounter}`;

    set((s) => {
      const next = [...s.reactions, { id, emoji, name }];
      const overflow = next.length - REACTION_MAX_CONCURRENT;

      return { reactions: overflow > 0 ? next.slice(overflow) : next };
    });

    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      get().clearReaction(id);
    }, REACTION_LIFETIME_MS);
  },
  clearReaction: (id) => {
    set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) }));
  },
  reset: () => {
    set({ messages: [], unread: 0, isOpen: false, reactions: [] });
  },
}));
