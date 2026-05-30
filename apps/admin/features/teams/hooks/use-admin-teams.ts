'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminUpdateTeamDto } from '@open-meet/types';

import { adminTeamsApi } from '@/features/teams/services/teams';

const TEAMS_KEY = 'admin-teams' as const;

export function useAdminTeams() {
  return useQuery({
    queryKey: [TEAMS_KEY],
    queryFn: ({ signal }) => adminTeamsApi.list(signal),
    staleTime: 10_000,
  });
}

export function useAdminTeam(id: string | null) {
  return useQuery({
    queryKey: [TEAMS_KEY, id],
    queryFn: ({ signal }) => adminTeamsApi.detail(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminTeamsApi.create({ name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: AdminUpdateTeamDto }) =>
      adminTeamsApi.update(input.id, input.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTeamsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}

export function useAddTeamMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userIds: string[] }) =>
      adminTeamsApi.addMembers(input.id, { userIds: input.userIds }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userId: string }) =>
      adminTeamsApi.removeMember(input.id, input.userId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}

export function useSyncTeamMembers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; currentUserIds: string[]; nextUserIds: string[] }) => {
      const nextUserIds = [...new Set(input.nextUserIds)];
      const nextUserSet = new Set(nextUserIds);
      const currentUserSet = new Set(input.currentUserIds);

      const toAdd = nextUserIds.filter((userId) => !currentUserSet.has(userId));
      const toRemove = input.currentUserIds.filter((userId) => !nextUserSet.has(userId));

      if (toAdd.length > 0) {
        await adminTeamsApi.addMembers(input.id, { userIds: toAdd });
      }

      await Promise.all(toRemove.map((userId) => adminTeamsApi.removeMember(input.id, userId)));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}
