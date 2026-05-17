import type { AdminDeepAnalyticsDto, AdminStatsOverviewDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminAnalyticsApi = {
  overview: (signal?: AbortSignal) =>
    api.get<AdminStatsOverviewDto>('/admin/analytics/overview', { signal }),

  deep: (signal?: AbortSignal) =>
    api.get<AdminDeepAnalyticsDto>('/admin/analytics/deep', { signal }),
};
