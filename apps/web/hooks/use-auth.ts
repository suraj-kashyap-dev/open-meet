'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { UserDto } from '@open-meet/types';

import { authApi } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api';

const ME_KEY = ['auth', 'me'] as const;
const CACHE_KEY = 'open-meet:user';

function readCachedUser(): UserDto | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (! raw) {
      return null;
    }
    return JSON.parse(raw) as UserDto;
  } catch {
    return null;
  }
}

function writeCachedUser(user: UserDto | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (user) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Returns the authenticated user, or null if signed out.
 *
 * On first paint after a hard reload, we seed from localStorage so the
 * header doesn't briefly flash "Sign in / Get started" for logged-in
 * users while /auth/me is in flight. The query then revalidates in the
 * background and corrects the value if the session has actually expired.
 */
export function useCurrentUser() {
  return useQuery<UserDto | null>({
    queryKey: ME_KEY,
    queryFn: async ({ signal }) => {
      try {
        const user = await authApi.me(signal);
        writeCachedUser(user);
        return user;
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          writeCachedUser(null);
          return null;
        }
        throw err;
      }
    },
    initialData: () => readCachedUser() ?? undefined,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      writeCachedUser(data.user);
      qc.setQueryData(ME_KEY, data.user);
      router.replace('/dashboard');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      writeCachedUser(data.user);
      qc.setQueryData(ME_KEY, data.user);
      router.replace('/dashboard');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      writeCachedUser(null);
      qc.setQueryData(ME_KEY, null);
      qc.clear();
      router.replace('/');
    },
  });
}
