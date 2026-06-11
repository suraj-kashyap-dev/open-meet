import type {
  AdminCreateUserDto,
  AdminCreateUserInviteDto,
  AdminUpdateUserDto,
  AdminUserDto,
  AdminUserListQuery,
  AdminUserListResponseDto,
  UserInviteDto,
  UserInviteListResponseDto,
} from '@open-meet/types';

import { api, ApiClientError } from '@/lib/api/client';
import { env } from '@/lib/env';

function uploadAvatar(id: string, file: File): Promise<AdminUserDto> {
  return new Promise((resolve, reject) => {
    const url = `${env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}/avatar`;
    const form = new FormData();

    form.append('file', file, file.name);

    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);

    xhr.withCredentials = true;

    xhr.onload = () => {
      const isJson = (xhr.getResponseHeader('content-type') ?? '').includes('application/json');

      if (!isJson) {
        reject(
          new ApiClientError('INVALID_RESPONSE', xhr.status, `Unexpected response: ${xhr.status}`),
        );

        return;
      }

      let body: unknown;

      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new ApiClientError('INVALID_RESPONSE', xhr.status, 'Invalid JSON'));

        return;
      }

      const envelope = body as {
        success: boolean;
        data?: AdminUserDto;
        error?: { code: string; message: string; statusCode: number };
      };

      if (!envelope.success || !envelope.data) {
        const err = envelope.error;

        reject(
          new ApiClientError(
            err?.code ?? 'UPLOAD_FAILED',
            err?.statusCode ?? xhr.status,
            err?.message ?? 'Upload failed',
          ),
        );

        return;
      }

      resolve(envelope.data);
    };

    xhr.onerror = () => {
      reject(new ApiClientError('NETWORK_ERROR', 0, 'Network error during upload'));
    };

    xhr.send(form);
  });
}

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
    api.get<AdminUserListResponseDto>(`/admin/users${toQueryString({ ...query })}`, { signal }),

  get: (id: string, signal?: AbortSignal) =>
    api.get<AdminUserDto>(`/admin/users/${id}`, { signal }),

  create: (body: AdminCreateUserDto) => api.post<AdminUserDto>('/admin/users', body),

  update: (id: string, body: AdminUpdateUserDto) =>
    api.patch<AdminUserDto>(`/admin/users/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/users/${id}`),

  uploadAvatar,

  removeAvatar: (id: string) => api.delete<AdminUserDto>(`/admin/users/${id}/avatar`),

  invite: (body: AdminCreateUserInviteDto) => api.post<UserInviteDto>('/admin/users/invite', body),

  listInvites: (signal?: AbortSignal) =>
    api.get<UserInviteListResponseDto>('/admin/users/invites', { signal }),

  resendInvite: (id: string) => api.post<UserInviteDto>(`/admin/users/invites/${id}/resend`),

  revokeInvite: (id: string) => api.delete<{ deleted: true }>(`/admin/users/invites/${id}`),
};
