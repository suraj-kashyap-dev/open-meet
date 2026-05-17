'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminUpdateUserDto, AdminUserListQuery } from '@open-meet/types';

import { adminUsersApi } from '@/features/admin/users/services/users';

const ADMIN_USERS_KEY = 'admin-users' as const;

export function useAdminUsers(query: AdminUserListQuery) {
  return useQuery({
    queryKey: [ADMIN_USERS_KEY, query],
    queryFn: ({ signal }) => adminUsersApi.list(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: AdminUpdateUserDto }) =>
      adminUsersApi.update(input.id, input.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ADMIN_USERS_KEY] });
    },
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ADMIN_USERS_KEY] });
    },
  });
}
