import type {
  AdminBulkEndResponseDto,
  AdminMeetingDetailDto,
  AdminMeetingDto,
  AdminMeetingListQuery,
  AdminMeetingListResponseDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    search.set(key, String(value));
  }

  const str = search.toString();
  return str ? `?${str}` : '';
}

export const adminMeetingsApi = {
  list: (query: AdminMeetingListQuery, signal?: AbortSignal) =>
    api.get<AdminMeetingListResponseDto>(`/admin/meetings${toQueryString({ ...query })}`, {
      signal,
    }),

  get: (id: string, signal?: AbortSignal) =>
    api.get<AdminMeetingDetailDto>(`/admin/meetings/${id}`, { signal }),

  forceEnd: (id: string) => api.post<AdminMeetingDto>(`/admin/meetings/${id}/end`),

  bulkEndActive: () => api.post<AdminBulkEndResponseDto>('/admin/meetings/end-all-active'),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/meetings/${id}`),

  kick: (id: string, userId: string) =>
    api.post<{ kicked: true }>(`/admin/meetings/${id}/participants/${userId}/kick`),
};
