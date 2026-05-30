'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AdminCreateUserDto,
  AdminCreateUserInviteDto,
  AdminUpdateUserDto,
  AdminUserListQuery,
} from '@open-meet/types';

import { adminUsersApi } from '@/features/users/services/users';

const ADMIN_USERS_KEY = 'admin-users' as const;
const USER_INVITES_KEY = 'admin-user-invites' as const;

export function useAdminUsers(query: AdminUserListQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [ADMIN_USERS_KEY, query],
    queryFn: ({ signal }) => adminUsersApi.list(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: [ADMIN_USERS_KEY, 'detail', id],
    queryFn: ({ signal }) => adminUsersApi.get(id, signal),
    staleTime: 10_000,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateUserDto) => adminUsersApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ADMIN_USERS_KEY] });
    },
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

export function useUploadAdminUserAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; file: File }) =>
      adminUsersApi.uploadAvatar(input.id, input.file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ADMIN_USERS_KEY] });
    },
  });
}

export function useRemoveAdminUserAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.removeAvatar(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ADMIN_USERS_KEY] });
    },
  });
}

export function useUserInvites() {
  return useQuery({
    queryKey: [USER_INVITES_KEY],
    queryFn: ({ signal }) => adminUsersApi.listInvites(signal),
    staleTime: 10_000,
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateUserInviteDto) => adminUsersApi.invite(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [USER_INVITES_KEY] }),
  });
}

export function useResendUserInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.resendInvite(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [USER_INVITES_KEY] }),
  });
}

export function useRevokeUserInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.revokeInvite(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [USER_INVITES_KEY] }),
  });
}
