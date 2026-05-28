'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminCreateGroupDto, AdminUpdateGroupDto } from '@open-meet/types';

import { adminGroupsApi } from '@/features/groups/services/groups';

const GROUPS_KEY = 'admin-groups' as const;

export function useAdminGroups() {
  return useQuery({
    queryKey: [GROUPS_KEY],
    queryFn: ({ signal }) => adminGroupsApi.list(signal),
    staleTime: 10_000,
  });
}

export function useAdminGroup(id: string | null) {
  return useQuery({
    queryKey: [GROUPS_KEY, id],
    queryFn: ({ signal }) => adminGroupsApi.detail(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateGroupDto) => adminGroupsApi.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: AdminUpdateGroupDto }) =>
      adminGroupsApi.update(input.id, input.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminGroupsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}

export function useAddGroupMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userIds: string[] }) =>
      adminGroupsApi.addMembers(input.id, { userIds: input.userIds }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userId: string }) =>
      adminGroupsApi.removeMember(input.id, input.userId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}
