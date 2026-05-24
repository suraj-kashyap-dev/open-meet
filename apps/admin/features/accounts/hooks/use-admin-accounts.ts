'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminCreateInviteDto, AdminUpdateAccountDto } from '@open-meet/types';

import { adminAccountsApi } from '@/features/accounts/services/accounts';

const KEY = 'admin-accounts' as const;
const INVITES_KEY = 'admin-invites' as const;

export function useAdminAccounts() {
  return useQuery({
    queryKey: [KEY],
    queryFn: ({ signal }) => adminAccountsApi.list(signal),
    staleTime: 30_000,
  });
}

export function useUpdateAdminAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AdminUpdateAccountDto }) =>
      adminAccountsApi.update(id, dto),
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

export function useAdminInvites() {
  return useQuery({
    queryKey: [INVITES_KEY],
    queryFn: ({ signal }) => adminAccountsApi.listInvites(signal),
    staleTime: 30_000,
  });
}

export function useCreateAdminInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AdminCreateInviteDto) => adminAccountsApi.createInvite(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [INVITES_KEY] });
    },
  });
}

export function useResendAdminInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAccountsApi.resendInvite(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [INVITES_KEY] });
    },
  });
}

export function useRevokeAdminInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAccountsApi.revokeInvite(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [INVITES_KEY] });
    },
  });
}
