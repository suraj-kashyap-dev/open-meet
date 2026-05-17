import type {
  AdminAccountDto,
  AdminAccountListResponseDto,
  AdminInviteAccountDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminAccountsApi = {
  list: (signal?: AbortSignal) =>
    api.get<AdminAccountListResponseDto>('/admin/accounts', { signal }),

  invite: (dto: AdminInviteAccountDto) => api.post<AdminAccountDto>('/admin/accounts', dto),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/accounts/${id}`),
};
