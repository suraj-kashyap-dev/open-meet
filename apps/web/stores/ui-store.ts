'use client';

import { create } from 'zustand';

interface UIState {
  participantsOpen: boolean;
  toggleParticipants: () => void;
  setParticipantsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  participantsOpen: false,
  toggleParticipants: () => {
    set({ participantsOpen: ! get().participantsOpen });
  },
  setParticipantsOpen: (open) => {
    set({ participantsOpen: open });
  },
}));
