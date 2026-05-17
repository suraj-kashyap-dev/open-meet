'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminInviteAccountDto } from '@open-meet/types';

import { adminAccountsApi } from '@/features/admin/accounts/services/accounts';

const KEY = 'admin-accounts' as const;

export function useAdminAccounts() {
  return useQuery({
    queryKey: [KEY],
    queryFn: ({ signal }) => adminAccountsApi.list(signal),
    staleTime: 30_000,
  });
}

export function useInviteAdminAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AdminInviteAccountDto) => adminAccountsApi.invite(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useDeleteAdminAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAccountsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}
