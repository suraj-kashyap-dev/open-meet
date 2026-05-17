'use client';

import { create } from 'zustand';

import type { RecordingDto } from '@open-meet/types';

interface RecordingState {
  active: RecordingDto | null;
  setActive: (recording: RecordingDto | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  active: null,
  setActive: (recording) => {
    set({ active: recording });
  },
  reset: () => {
    set({ active: null });
  },
}));
