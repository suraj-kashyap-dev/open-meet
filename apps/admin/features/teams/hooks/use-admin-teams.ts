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
    onSuccess: (_res, { id }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
        qc.invalidateQueries({ queryKey: [CHANNELS_KEY, id] }),
      ]),
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userId: string }) =>
      adminTeamsApi.removeMember(input.id, input.userId),
    onSuccess: (_res, { id }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
        qc.invalidateQueries({ queryKey: [CHANNELS_KEY, id] }),
      ]),
  });
}

const CHANNELS_KEY = 'admin-team-channels' as const;

export function useTeamChannels(teamId: string | null) {
  return useQuery({
    queryKey: [CHANNELS_KEY, teamId],
    queryFn: ({ signal }) => adminTeamsApi.listChannels(teamId as string, signal),
    enabled: Boolean(teamId),
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { teamId: string; name: string; description?: string }) =>
      adminTeamsApi.createChannel(input.teamId, {
        name: input.name,
        description: input.description ?? null,
      }),
    onSuccess: (_res, { teamId }) =>
      void qc.invalidateQueries({ queryKey: [CHANNELS_KEY, teamId] }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { teamId: string; channelId: string }) =>
      adminTeamsApi.deleteChannel(input.teamId, input.channelId),
    onSuccess: (_res, { teamId }) =>
      void qc.invalidateQueries({ queryKey: [CHANNELS_KEY, teamId] }),
  });
}
