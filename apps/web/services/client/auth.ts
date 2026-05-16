import type { AuthResponseDto, UserDto } from '@open-meet/types';

import { api } from '@/lib/shared/api';

export const authApi = {
  register: (input: { name: string; email: string; password: string }) => api.post<AuthResponseDto>('/auth/register', input),

  login: (input: { email: string; password: string }) => api.post<AuthResponseDto>('/auth/login', input),

  logout: () => api.post<{ loggedOut: true }>('/auth/logout'),

  refresh: () => api.post<{ refreshed: true }>('/auth/refresh'),

  me: (signal?: AbortSignal) => api.get<UserDto>('/auth/me', { signal }),
};
