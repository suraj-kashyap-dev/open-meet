import type { MeetingDto, ParticipantDto, UpdateMeetingDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const meetingsApi = {
  create: (input: { title?: string }) => api.post<MeetingDto>('/meetings', input),

  get: (code: string, signal?: AbortSignal) =>
    api.get<MeetingDto>(`/meetings/${encodeURIComponent(code)}`, { signal }),

  update: (code: string, input: UpdateMeetingDto) =>
    api.patch<MeetingDto>(`/meetings/${encodeURIComponent(code)}`, input),

  join: (code: string) =>
    api.post<{ meeting: MeetingDto; participant: ParticipantDto }>(
      `/meetings/${encodeURIComponent(code)}/join`,
    ),

  leave: (code: string) => api.post<void>(`/meetings/${encodeURIComponent(code)}/leave`),

  end: (code: string) => api.post<MeetingDto>(`/meetings/${encodeURIComponent(code)}/end`),

  participants: (code: string, signal?: AbortSignal) =>
    api.get<ParticipantDto[]>(`/meetings/${encodeURIComponent(code)}/participants`, { signal }),
};
