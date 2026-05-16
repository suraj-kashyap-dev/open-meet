import type {
  AdminDto,
  AdminLoginResponseDto,
  AdminStatsOverviewDto,
} from '@open-meet/types';

import { api } from '../api';

export const adminApi = {
  login: (input: { email: string; password: string }) =>
    api.post<AdminLoginResponseDto>('/admin/auth/login', input),

  logout: () => api.post<{ loggedOut: true }>('/admin/auth/logout'),

  me: (signal?: AbortSignal) => api.get<AdminDto>('/admin/auth/me', { signal }),

  overview: (signal?: AbortSignal) =>
    api.get<AdminStatsOverviewDto>('/admin/stats/overview', { signal }),
};
