'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { AdminDto } from '@open-meet/types';

import { adminAuthApi } from '@/services/admin/auth';
import { ApiClientError } from '@/lib/shared/api';

const ADMIN_ME_KEY = ['admin', 'me'] as const;

export function useCurrentAdmin() {
  return useQuery<AdminDto | null>({
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

export function useAdminLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminAuthApi.login,
    onSuccess: (data) => {
      qc.setQueryData(ADMIN_ME_KEY, data.admin);
      router.replace('/admin');
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
      router.replace('/admin/login');
    },
  });
}
