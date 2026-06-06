import type { DatagridQuery, DatagridResponseDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

function toSearchParams(query: DatagridQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const datagridApi = {
  fetch: <TRow>(resource: string, query: DatagridQuery, signal?: AbortSignal) =>
    api.get<DatagridResponseDto<TRow>>(`/admin/${resource}/datagrid${toSearchParams(query)}`, {
      signal,
    }),
};
