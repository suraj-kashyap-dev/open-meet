import type {
  AdminBulkEndResponseDto,
  AdminMeetingDetailDto,
  AdminMeetingDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminMeetingsApi = {
  get: (id: string, signal?: AbortSignal) =>
    api.get<AdminMeetingDetailDto>(`/admin/meetings/${id}`, { signal }),

  forceEnd: (id: string) => api.post<AdminMeetingDto>(`/admin/meetings/${id}/end`),

  bulkEndActive: () => api.post<AdminBulkEndResponseDto>('/admin/meetings/end-all-active'),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/meetings/${id}`),

  kick: (id: string, userId: string) =>
    api.post<{ kicked: true }>(`/admin/meetings/${id}/participants/${userId}/kick`),
};
