'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminCreateDepartmentDto, AdminUpdateDepartmentDto } from '@open-meet/types';

import { adminDepartmentsApi } from '@/features/departments/services/departments';

const DEPARTMENTS_KEY = 'admin-departments' as const;

export function useAdminDepartments() {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY],
    queryFn: ({ signal }) => adminDepartmentsApi.list(signal),
    staleTime: 10_000,
  });
}

export function useAdminDepartment(id: string | null) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, id],
    queryFn: ({ signal }) => adminDepartmentsApi.detail(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateDepartmentDto) => adminDepartmentsApi.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: AdminUpdateDepartmentDto }) =>
      adminDepartmentsApi.update(input.id, input.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDepartmentsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useAddDepartmentMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userIds: string[] }) =>
      adminDepartmentsApi.addMembers(input.id, { userIds: input.userIds }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useRemoveDepartmentMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; userId: string }) =>
      adminDepartmentsApi.removeMember(input.id, input.userId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useSyncDepartmentMembers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; currentUserIds: string[]; nextUserIds: string[] }) => {
      const nextUserIds = [...new Set(input.nextUserIds)];
      const nextUserSet = new Set(nextUserIds);
      const currentUserSet = new Set(input.currentUserIds);

      const toAdd = nextUserIds.filter((userId) => !currentUserSet.has(userId));
      const toRemove = input.currentUserIds.filter((userId) => !nextUserSet.has(userId));

      if (toAdd.length > 0) {
        await adminDepartmentsApi.addMembers(input.id, { userIds: toAdd });
      }

      await Promise.all(toRemove.map((userId) => adminDepartmentsApi.removeMember(input.id, userId)));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}
