import type { RecordingActiveStateDto, RecordingDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

function authHeaders(token: string | null | undefined): Record<string, string> | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export const recordingApi = {
  start: (code: string, authToken?: string | null) =>
    api.post<RecordingDto>(`/meetings/${encodeURIComponent(code)}/recording/start`, undefined, {
      headers: authHeaders(authToken),
    }),

  stop: (code: string, authToken?: string | null) =>
    api.post<RecordingDto>(`/meetings/${encodeURIComponent(code)}/recording/stop`, undefined, {
      headers: authHeaders(authToken),
    }),

  active: (code: string, signal?: AbortSignal, authToken?: string | null) =>
    api.get<RecordingActiveStateDto>(`/meetings/${encodeURIComponent(code)}/recording/active`, {
      signal,
      headers: authHeaders(authToken),
    }),

  list: (code: string, signal?: AbortSignal, authToken?: string | null) =>
    api.get<RecordingDto[]>(`/meetings/${encodeURIComponent(code)}/recordings`, {
      signal,
      headers: authHeaders(authToken),
    }),
};
