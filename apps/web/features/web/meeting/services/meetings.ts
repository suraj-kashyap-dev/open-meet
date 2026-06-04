import type {
  CreateGuestMeetingSessionDto,
  GuestMeetingSessionDto,
  MeetingDto,
  ParticipantDto,
  ScheduleMeetingDto,
  UpcomingMeetingDto,
  UpdateMeetingDto,
} from '@open-meet/types';

import { env } from '@/lib/env';
import { api } from '@/lib/api/client';

interface MeetingAuthOptions {
  signal?: AbortSignal;
  authToken?: string | null;
}

function authHeaders(token: string | null | undefined): Record<string, string> | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export const meetingsApi = {
  create: (input: { title?: string }) => api.post<MeetingDto>('/meetings', input),

  get: (code: string, options: MeetingAuthOptions = {}) =>
    api.get<MeetingDto>(`/meetings/${encodeURIComponent(code)}`, {
      signal: options.signal,
      headers: authHeaders(options.authToken),
    }),

  createGuestSession: (code: string, input: CreateGuestMeetingSessionDto) =>
    api.post<GuestMeetingSessionDto>(`/meetings/${encodeURIComponent(code)}/guest-session`, input),

  update: (code: string, input: UpdateMeetingDto) =>
    api.patch<MeetingDto>(`/meetings/${encodeURIComponent(code)}`, input),

  schedule: (input: ScheduleMeetingDto) => api.post<MeetingDto>('/meetings/schedule', input),

  upcoming: (signal?: AbortSignal) =>
    api.get<UpcomingMeetingDto[]>('/meetings/upcoming', { signal }),

  icsUrl: (code: string) =>
    `${env.NEXT_PUBLIC_API_URL}/api/meetings/${encodeURIComponent(code)}/ics`,

  join: (code: string, authToken?: string | null) =>
    api.post<{ meeting: MeetingDto; participant: ParticipantDto }>(
      `/meetings/${encodeURIComponent(code)}/join`,
      undefined,
      { headers: authHeaders(authToken) },
    ),

  leave: (code: string, authToken?: string | null) =>
    api.post<void>(`/meetings/${encodeURIComponent(code)}/leave`, undefined, {
      headers: authHeaders(authToken),
    }),

  end: (code: string) => api.post<MeetingDto>(`/meetings/${encodeURIComponent(code)}/end`),

  participants: (code: string, options: MeetingAuthOptions = {}) =>
    api.get<ParticipantDto[]>(`/meetings/${encodeURIComponent(code)}/participants`, {
      signal: options.signal,
      headers: authHeaders(options.authToken),
    }),
};
