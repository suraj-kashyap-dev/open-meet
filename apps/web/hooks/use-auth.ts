'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { UserDto } from '@open-meet/types';

import { authApi } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api';

const ME_KEY = ['auth', 'me'] as const;

export function useCurrentUser() {
  return useQuery<UserDto | null>({
    queryKey: ME_KEY,
    queryFn: async ({ signal }) => {
      try {
        return await authApi.me(signal);
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      qc.setQueryData(ME_KEY, data.user);
      router.replace('/');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data) => {
      qc.setQueryData(ME_KEY, data.user);
      router.replace('/');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null);
      qc.clear();
      router.replace('/login');
    },
  });
}
