'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type {
  MeetingDto,
  MeetingHistoryListResponseDto,
  MessagePageDto,
  RecordingDto,
} from '@open-meet/types';

import { historyApi } from '@/features/web/history/services/history';
import { meetingsApi } from '@/features/web/meeting/services/meetings';

const HISTORY_LIST_KEY = 'history-list' as const;
const HISTORY_MEETING_KEY = 'history-meeting' as const;
const HISTORY_MESSAGES_KEY = 'history-messages' as const;
const HISTORY_RECORDINGS_KEY = 'history-recordings' as const;

export function useHistoryList(page: number, pageSize = 20, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [HISTORY_LIST_KEY, page, pageSize],
    enabled: options?.enabled ?? true,
    queryFn: ({ signal }) => historyApi.list({ page, pageSize }, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useHistoryMeeting(code: string | undefined) {
  return useQuery<MeetingDto>({
    queryKey: [HISTORY_MEETING_KEY, code],
    queryFn: ({ signal }) => meetingsApi.get(code as string, { signal }),
    enabled: Boolean(code),
    staleTime: 60_000,
  });
}

export function useHistoryMessages(code: string | undefined) {
  return useInfiniteQuery<
    MessagePageDto,
    Error,
    { pages: MessagePageDto[]; pageParams: (string | undefined)[] },
    [typeof HISTORY_MESSAGES_KEY, string | undefined],
    string | undefined
  >({
    queryKey: [HISTORY_MESSAGES_KEY, code],
    enabled: Boolean(code),
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      historyApi.messages(code as string, { cursor: pageParam, limit: 50 }, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useHistoryRecordings(code: string | undefined) {
  return useQuery<RecordingDto[]>({
    queryKey: [HISTORY_RECORDINGS_KEY, code],
    queryFn: ({ signal }) => historyApi.recordings(code as string, signal),
    enabled: Boolean(code),
    staleTime: 10_000,
    // Auto-refresh while any recording is still RECORDING/STOPPING - egress
    // finalization can take 10–30s after the host clicks stop.
    refetchInterval: (query) => {
      const list = query.state.data as RecordingDto[] | undefined;
      if (!list || list.length === 0) {
        return false;
      }
      const stillRunning = list.some((r) => r.status === 'RECORDING' || r.status === 'STOPPING');
      return stillRunning ? 5_000 : false;
    },
  });
}

export { HISTORY_LIST_KEY, HISTORY_MEETING_KEY, HISTORY_MESSAGES_KEY, HISTORY_RECORDINGS_KEY };

export type { MeetingHistoryListResponseDto };
