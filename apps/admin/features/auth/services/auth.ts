import type { AdminDto, AdminLoginResponseDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminAuthApi = {
  login: (input: { email: string; password: string }) =>
    api.post<AdminLoginResponseDto>('/admin/auth/login', input),

  logout: () => api.post<{ loggedOut: true }>('/admin/auth/logout'),

  me: (signal?: AbortSignal) => api.get<AdminDto>('/admin/auth/me', { signal }),
};
