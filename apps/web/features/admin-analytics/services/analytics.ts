import type { AdminStatsOverviewDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminAnalyticsApi = {
  overview: (signal?: AbortSignal) =>
    api.get<AdminStatsOverviewDto>('/admin/analytics/overview', { signal }),
};
