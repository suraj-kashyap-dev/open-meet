import type {
  MeetingHistoryListResponseDto,
  MessagePageDto,
} from '@open-meet/types';

import { api } from '@/lib/shared/api';

function toQs(params: Record<string, string | number | undefined>): string {
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

export const historyApi = {
  list: (query: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    api.get<MeetingHistoryListResponseDto>(
      `/meetings/history${toQs({ ...query })}`,
      { signal },
    ),

  messages: (
    code: string,
    query: { cursor?: string; limit?: number },
    signal?: AbortSignal,
  ) =>
    api.get<MessagePageDto>(
      `/meetings/${encodeURIComponent(code)}/messages${toQs({ ...query })}`,
      { signal },
    ),
};
