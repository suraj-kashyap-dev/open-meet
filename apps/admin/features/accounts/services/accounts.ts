import type {
  AdminAcceptInviteDto,
  AdminAccountDto,
  AdminCreateAccountDto,
  AdminCreateInviteDto,
  AdminInviteDto,
  AdminInviteListResponseDto,
  AdminInviteLookupDto,
  AdminUpdateAccountDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminAccountsApi = {
  create: (dto: AdminCreateAccountDto) => api.post<AdminAccountDto>('/admin/accounts', dto),

  update: (id: string, dto: AdminUpdateAccountDto) =>
    api.patch<AdminAccountDto>(`/admin/accounts/${id}`, dto),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/accounts/${id}`),

  listInvites: (signal?: AbortSignal) =>
    api.get<AdminInviteListResponseDto>('/admin/accounts/invites', { signal }),

  createInvite: (dto: AdminCreateInviteDto) =>
    api.post<AdminInviteDto>('/admin/accounts/invites', dto),

  resendInvite: (id: string) => api.post<AdminInviteDto>(`/admin/accounts/invites/${id}/resend`),

  revokeInvite: (id: string) => api.delete<{ deleted: true }>(`/admin/accounts/invites/${id}`),

  lookupInvite: (token: string, signal?: AbortSignal) =>
    api.get<AdminInviteLookupDto>(`/admin/invite/${encodeURIComponent(token)}`, { signal }),

  acceptInvite: (dto: AdminAcceptInviteDto) =>
    api.post<AdminAccountDto>('/admin/invite/accept', dto),
};
