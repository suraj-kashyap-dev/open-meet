import type {
  AdminUpdateUserDto,
  AdminUserDto,
  AdminUserListQuery,
  AdminUserListResponseDto,
} from '@open-meet/types';

import { api } from '@/lib/shared/api';

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

export const adminUsersApi = {
  list: (query: AdminUserListQuery, signal?: AbortSignal) =>
    api.get<AdminUserListResponseDto>(
      `/admin/users${toQueryString({ ...query })}`,
      { signal },
    ),

  get: (id: string, signal?: AbortSignal) =>
    api.get<AdminUserDto>(`/admin/users/${id}`, { signal }),

  update: (id: string, body: AdminUpdateUserDto) =>
    api.patch<AdminUserDto>(`/admin/users/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/users/${id}`),
};
