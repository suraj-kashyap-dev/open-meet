'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
 * Mounted once at the app root (Providers). After hydration completes it
 * primes the user-query cache from localStorage so subsequent renders show
 * the cached user immediately, without causing a server/client hydration
 * mismatch (the very first render still matches whatever the server sent).
 */
export function useAuthBootstrap(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const cached = readCachedUser();
    if (! cached) {
      return;
    }
    // Only prime if the cache is empty — don't clobber a fresh fetch result.
    const current = qc.getQueryData<UserDto | null>(ME_KEY);
    if (current === undefined) {
      qc.setQueryData(ME_KEY, cached);
    }
  }, [qc]);
}

/**
 * Returns the authenticated user, or null if signed out, or undefined while
 * the very first /auth/me round-trip is in flight on a cold start.
 *
 * The query is intentionally NOT pre-populated from localStorage here —
 * doing so synchronously on the client breaks hydration because the server
 * has no access to localStorage. See `useAuthBootstrap` above which primes
 * the cache *after* hydration completes.
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
    // Local cleanup must happen even if the server-side logout call fails
    // (e.g. session already invalidated, network blip).
    onSettled: () => {
      writeCachedUser(null);
      qc.setQueryData(ME_KEY, null);
      qc.clear();
      router.replace('/login');
    },
  });
}
