'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminMeetingsApi } from '@/features/meetings/services/meetings';

const KEY = 'admin-meetings' as const;
const DETAIL_KEY = 'admin-meetings-detail' as const;

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

  void qc.invalidateQueries({ queryKey: ['admin-datagrid', 'meetings'] });
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
