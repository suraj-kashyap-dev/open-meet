import type {
  AdminChangePasswordDto,
  AdminDto,
  AdminLoginResponseDto,
  AdminMeResponseDto,
  AdminUpdateProfileDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminAuthApi = {
  login: (input: { email: string; password: string }) =>
    api.post<AdminLoginResponseDto>('/admin/auth/login', input),

  logout: () => api.post<{ loggedOut: true }>('/admin/auth/logout'),

  me: (signal?: AbortSignal) => api.get<AdminMeResponseDto>('/admin/auth/me', { signal }),

  updateMe: (dto: AdminUpdateProfileDto) => api.patch<AdminDto>('/admin/auth/me', dto),

  changePassword: (dto: AdminChangePasswordDto) =>
    api.patch<{ changed: true }>('/admin/auth/me/password', dto),

  uploadAvatar: (file: File) => {
    const form = new FormData();

    form.append('file', file, file.name);

    return api.upload<AdminDto>('/admin/auth/me/avatar', form);
  },

  deleteAvatar: () => api.delete<AdminDto>('/admin/auth/me/avatar'),
};
