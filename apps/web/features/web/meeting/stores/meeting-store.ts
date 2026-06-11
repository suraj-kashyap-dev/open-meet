'use client';

import { create } from 'zustand';

import type { MeetingDefaultView, MeetingDto, PresenceDto } from '@open-meet/types';
import { MeetingDefaultView as MeetingView } from '@open-meet/types';

interface MeetingState {
  meeting: MeetingDto | null;
  layoutMode: MeetingDefaultView;
  raisedHands: Record<string, { name: string; at: number }>;
  presence: Record<string, PresenceDto>;
  setMeeting: (meeting: MeetingDto | null) => void;
  setLayoutMode: (layoutMode: MeetingDefaultView) => void;
  raiseHand: (userId: string, name: string) => void;
  lowerHand: (userId: string) => void;
  upsertPresence: (entry: PresenceDto) => void;
  removePresence: (userId: string) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meeting: null,
  layoutMode: MeetingView.GALLERY,
  raisedHands: {},
  presence: {},
  setMeeting: (meeting) => {
    set({ meeting });
  },
  setLayoutMode: (layoutMode) => {
    set({ layoutMode });
  },
  raiseHand: (userId, name) => {
    set((s) => ({
      raisedHands: { ...s.raisedHands, [userId]: { name, at: Date.now() } },
    }));
  },
  lowerHand: (userId) => {
    set((s) => {
      const next = { ...s.raisedHands };

      delete next[userId];

      return { raisedHands: next };
    });
  },
  upsertPresence: (entry) => {
    set((s) => ({ presence: { ...s.presence, [entry.userId]: entry } }));
  },
  removePresence: (userId) => {
    set((s) => {
      const next = { ...s.presence };

      delete next[userId];

      return { presence: next };
    });
  },
  reset: () => {
    set({ meeting: null, layoutMode: MeetingView.GALLERY, raisedHands: {}, presence: {} });
  },
}));
