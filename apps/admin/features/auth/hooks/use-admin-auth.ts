'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { AdminDto, AdminMeResponseDto, AdminPermissionKey } from '@open-meet/types';

import { adminAuthApi } from '@/features/auth/services/auth';
import { ApiClientError } from '@/lib/api/client';

const ADMIN_ME_KEY = ['admin', 'me'] as const;

/** Identity + RBAC context for the signed-in admin (null when signed out). */
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

/**
 * The signed-in admin's identity DTO (sans role + grantedSet). Existing UI
 * (topbar, profile page, guards) consumes only the AdminDto fields; RBAC
 * checks should use {@link useCan} or {@link useCurrentAdminMe} directly.
 */
export function useCurrentAdmin() {
  const { data, ...rest } = useCurrentAdminMe();
  return { ...rest, data: data?.admin ?? null };
}

/**
 * Boolean check for the admin RBAC catalog. Returns `false` while loading or
 * when signed out, `true` for Administrator (ALL) bypass, otherwise
 * `grantedSet.includes(key)` (flat-leaves storage — no ancestor walking).
 */
export function useCan(key: AdminPermissionKey): boolean {
  const { data } = useCurrentAdminMe();
  if (!data) return false;
  if (data.role?.permissionType === 'ALL') return true;
  return data.grantedSet.includes(key);
}

export function useAdminLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminAuthApi.login,
    onSuccess: () => {
      // /me carries role + grantedSet; let useCurrentAdmin re-fetch instead of
      // setting partial data (login response only includes `admin`).
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
    // Profile mutations return AdminDto; splice it into the cached AdminMeResponse
    // so consumers see fresh name/avatar without losing role / grantedSet.
    qc.setQueryData<AdminMeResponseDto | null>(ADMIN_ME_KEY, (current) =>
      current ? { ...current, admin } : current,
    );
    // The administrators list shows name/avatar, so refresh it too.
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
