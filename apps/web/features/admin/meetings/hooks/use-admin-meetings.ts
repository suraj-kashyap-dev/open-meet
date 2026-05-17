'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminMeetingListQuery } from '@open-meet/types';

import { adminMeetingsApi } from '@/features/admin/meetings/services/meetings';

const KEY = 'admin-meetings' as const;
const DETAIL_KEY = 'admin-meetings-detail' as const;

export function useAdminMeetings(query: AdminMeetingListQuery) {
  return useQuery({
    queryKey: [KEY, query],
    queryFn: ({ signal }) => adminMeetingsApi.list(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useAdminMeetingDetail(id: string | null) {
  return useQuery({
    queryKey: [DETAIL_KEY, id],
    queryFn: ({ signal }) => adminMeetingsApi.get(id!, signal),
    enabled: Boolean(id),
    staleTime: 5_000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [KEY] });
  void qc.invalidateQueries({ queryKey: [DETAIL_KEY] });
}

export function useForceEndMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminMeetingsApi.forceEnd(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useBulkEndActiveMeetings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminMeetingsApi.bulkEndActive(),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAdminMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminMeetingsApi.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useKickParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { meetingId: string; userId: string }) =>
      adminMeetingsApi.kick(input.meetingId, input.userId),
    onSuccess: () => invalidateAll(qc),
  });
}
