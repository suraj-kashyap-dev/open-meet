import type {
  MeetingDto,
  ParticipantDto,
  ScheduleMeetingDto,
  UpcomingMeetingDto,
  UpdateMeetingDto,
} from '@open-meet/types';

import { env } from '@/lib/env';
import { api } from '@/lib/api/client';

export const meetingsApi = {
  create: (input: { title?: string }) => api.post<MeetingDto>('/meetings', input),

  get: (code: string, signal?: AbortSignal) =>
    api.get<MeetingDto>(`/meetings/${encodeURIComponent(code)}`, { signal }),

  update: (code: string, input: UpdateMeetingDto) =>
    api.patch<MeetingDto>(`/meetings/${encodeURIComponent(code)}`, input),

  schedule: (input: ScheduleMeetingDto) => api.post<MeetingDto>('/meetings/schedule', input),

  upcoming: (signal?: AbortSignal) =>
    api.get<UpcomingMeetingDto[]>('/meetings/upcoming', { signal }),

  icsUrl: (code: string) =>
    `${env.NEXT_PUBLIC_API_URL}/api/meetings/${encodeURIComponent(code)}/ics`,

  join: (code: string) =>
    api.post<{ meeting: MeetingDto; participant: ParticipantDto }>(
      `/meetings/${encodeURIComponent(code)}/join`,
    ),

  leave: (code: string) => api.post<void>(`/meetings/${encodeURIComponent(code)}/leave`),

  end: (code: string) => api.post<MeetingDto>(`/meetings/${encodeURIComponent(code)}/end`),

  participants: (code: string, signal?: AbortSignal) =>
    api.get<ParticipantDto[]>(`/meetings/${encodeURIComponent(code)}/participants`, { signal }),
};
