'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { AdminDto, AdminMeResponseDto, AdminPermissionKey } from '@open-meet/types';

import { adminAuthApi } from '@/features/auth/services/auth';
import { ApiClientError } from '@/lib/api/client';

const ADMIN_ME_KEY = ['admin', 'me'] as const;

export function useCurrentAdminMe() {
  return useQuery<AdminMeResponseDto | null>({
    queryKey: ADMIN_ME_KEY,
    queryFn: async ({ signal }) => {
      try {
        return await adminAuthApi.me(signal);
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          return null;
        }

        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useCurrentAdmin() {
  const { data, ...rest } = useCurrentAdminMe();

  return { ...rest, data: data?.admin ?? null };
}

export function useCan(key: AdminPermissionKey): boolean {
  const { data } = useCurrentAdminMe();

  if (!data) {
    return false;
  }

  if (data.role?.permissionType === 'ALL') {
    return true;
  }

  return data.grantedSet.includes(key);
}

export function useAdminLogin() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: adminAuthApi.login,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_ME_KEY });

      router.replace('/');
    },
  });
}

export function useAdminLogout() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: adminAuthApi.logout,
    onSettled: () => {
      qc.setQueryData(ADMIN_ME_KEY, null);

      qc.removeQueries({ queryKey: ['admin'] });

      router.replace('/login');
    },
  });
}

function onAdminUpdated(qc: ReturnType<typeof useQueryClient>) {
  return (admin: AdminDto) => {
    qc.setQueryData<AdminMeResponseDto | null>(ADMIN_ME_KEY, (current) =>
      current ? { ...current, admin } : current,
    );

    void qc.invalidateQueries({ queryKey: ['admin-accounts'] });
  };
}

export function useUpdateAdminProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: adminAuthApi.updateMe,
    onSuccess: onAdminUpdated(qc),
  });
}

export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: adminAuthApi.changePassword,
  });
}

export function useUploadAdminAvatar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => adminAuthApi.uploadAvatar(file),
    onSuccess: onAdminUpdated(qc),
  });
}

export function useRemoveAdminAvatar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => adminAuthApi.deleteAvatar(),
    onSuccess: onAdminUpdated(qc),
  });
}
