'use client';

import { create } from 'zustand';

import type { MeetingDto } from '@open-meet/types';

export interface ActiveMeetingSession {
  code: string;
  token: string;
  serverUrl: string;
  meeting: MeetingDto;
  audio: boolean;
  video: boolean;
}

export interface MiniPosition {
  x: number;
  y: number;
}

interface EndedInfo {
  code: string;
  title: string | null;
}

interface ActiveMeetingState {
  /** The live connection, lifted out of the route so it survives navigation. */
  session: ActiveMeetingSession | null;
  /** Whether the call is shown as the floating mini-player instead of full screen. */
  minimized: boolean;
  /** Last drag position of the mini-player; null = default (bottom-right). */
  position: MiniPosition | null;
  /** Set when a call disconnects while its route is open, so it can show the ended screen. */
  ended: EndedInfo | null;
  start: (session: ActiveMeetingSession) => void;
  minimize: () => void;
  maximize: () => void;
  setPosition: (position: MiniPosition) => void;
  markEnded: (info: EndedInfo) => void;
  clearEnded: () => void;
  clear: () => void;
}

export const useActiveMeeting = create<ActiveMeetingState>((set) => ({
  session: null,
  minimized: false,
  position: null,
  ended: null,
  start: (session) => {
    set({ session, minimized: false, ended: null });
  },
  minimize: () => {
    set((s) => (s.session ? { minimized: true } : {}));
  },
  maximize: () => {
    set((s) => (s.session ? { minimized: false } : {}));
  },
  setPosition: (position) => {
    set({ position });
  },
  markEnded: (ended) => {
    set({ ended, session: null, minimized: false });
  },
  clearEnded: () => {
    set({ ended: null });
  },
  clear: () => {
    set({ session: null, minimized: false, ended: null });
  },
}));
