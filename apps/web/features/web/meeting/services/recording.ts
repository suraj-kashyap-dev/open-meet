import type { RecordingActiveStateDto, RecordingDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const recordingApi = {
  start: (code: string) =>
    api.post<RecordingDto>(`/meetings/${encodeURIComponent(code)}/recording/start`),

  stop: (code: string) =>
    api.post<RecordingDto>(`/meetings/${encodeURIComponent(code)}/recording/stop`),

  active: (code: string, signal?: AbortSignal) =>
    api.get<RecordingActiveStateDto>(`/meetings/${encodeURIComponent(code)}/recording/active`, {
      signal,
    }),

  list: (code: string, signal?: AbortSignal) =>
    api.get<RecordingDto[]>(`/meetings/${encodeURIComponent(code)}/recordings`, { signal }),
};
