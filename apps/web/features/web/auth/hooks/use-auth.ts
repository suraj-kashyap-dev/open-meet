'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { UserDto, UserMeResponseDto, UserPermissionKey } from '@open-meet/types';

import { authApi } from '@/features/web/auth/services/auth';
import { useChatStore } from '@/features/web/chat/stores';
import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

const ME_KEY = ['auth', 'me'] as const;
const GOOGLE_STATUS_KEY = ['auth', 'google-status'] as const;
const CACHE_KEY = 'open-meet:user';

function readCachedMe(): UserMeResponseDto | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as UserMeResponseDto | UserDto;
    // Backward compat with the previous cached shape (raw UserDto).
    if ('user' in parsed && 'grantedSet' in parsed) {
      return parsed as UserMeResponseDto;
    }
    return { user: parsed as UserDto, role: null, grantedSet: [] };
  } catch {
    return null;
  }
}

function writeCachedMe(me: UserMeResponseDto | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (me) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(me));
    } else {
      window.localStorage.removeItem(CACHE_KEY);
    }
  } catch {
    // Ignore storage failures (private mode, quota) — the cache is best-effort.
  }
}

function meFromUser(user: UserDto | null): UserMeResponseDto | null {
  return user ? { user, role: null, grantedSet: [] } : null;
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
    const cached = readCachedMe();

    if (!cached) {
      return;
    }

    const current = qc.getQueryData<UserMeResponseDto | null>(ME_KEY);

    if (current === undefined) {
      qc.setQueryData(ME_KEY, cached);
    }
  }, [qc]);
}

/** Identity + RBAC context (null when signed out, undefined on first cold load). */
export function useCurrentUserMe() {
  return useQuery<UserMeResponseDto | null>({
    queryKey: ME_KEY,
    queryFn: async ({ signal }) => {
      try {
        const me = await authApi.me(signal);

        writeCachedMe(me);

        return me;
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          writeCachedMe(null);

          return null;
        }

        throw err;
      }
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Backward-compatible identity hook — returns just the `UserDto`. Existing
 * consumers (avatars, profile UI, guards) keep working unchanged. For RBAC
 * checks, use {@link useCan} or {@link useCurrentUserMe} directly.
 */
export function useCurrentUser() {
  const { data, ...rest } = useCurrentUserMe();
  return { ...rest, data: data?.user ?? null };
}

/**
 * Boolean check for the user RBAC catalog. `false` while loading or signed out,
 * `true` for `permissionType: 'ALL'`, otherwise `grantedSet.includes(key)`.
 * Per-resource checks (host-of-meeting, member-of-team) still run on the server.
 */
export function useCan(key: UserPermissionKey): boolean {
  const { data } = useCurrentUserMe();
  if (!data) return false;
  if (data.role?.permissionType === 'ALL') return true;
  return data.grantedSet.includes(key);
}

export function useGoogleAuthEnabled() {
  return useQuery({
    queryKey: GOOGLE_STATUS_KEY,
    queryFn: ({ signal }) => authApi.googleStatus(signal),
    select: (data) => data.enabled,
    staleTime: Infinity,
  });
}

export function useLogin(redirectTo: string = '/') {
  const router = useRouter();

  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const me = meFromUser(data.user);
      writeCachedMe(me);
      qc.setQueryData(ME_KEY, me);
      // Re-fetch /me so the role + grantedSet land before the next page render.
      void qc.invalidateQueries({ queryKey: ME_KEY });
      router.replace(redirectTo);
    },
  });
}

export function useInviteLookup(token: string) {
  return useQuery({
    queryKey: ['auth', 'invite', token],
    queryFn: ({ signal }) => authApi.lookupInvite(token, signal),
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
  });
}

export function useAcceptInvite(redirectTo: string = '/') {
  const router = useRouter();

  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.acceptInvite,
    onSuccess: (data) => {
      const me = meFromUser(data.user);
      writeCachedMe(me);
      qc.setQueryData(ME_KEY, me);
      // Re-fetch /me so the role + grantedSet land before the next page render.
      void qc.invalidateQueries({ queryKey: ME_KEY });
      router.replace(redirectTo);
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (user) => {
      // Profile mutations return a fresh UserDto; splice into cached MeResponse so
      // role + grantedSet are preserved.
      qc.setQueryData<UserMeResponseDto | null>(ME_KEY, (current) => {
        const next = current ? { ...current, user } : meFromUser(user);
        writeCachedMe(next);
        return next;
      });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: (user) => {
      // Profile mutations return a fresh UserDto; splice into cached MeResponse so
      // role + grantedSet are preserved.
      qc.setQueryData<UserMeResponseDto | null>(ME_KEY, (current) => {
        const next = current ? { ...current, user } : meFromUser(user);
        writeCachedMe(next);
        return next;
      });
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.deleteAvatar(),
    onSuccess: (user) => {
      // Profile mutations return a fresh UserDto; splice into cached MeResponse so
      // role + grantedSet are preserved.
      qc.setQueryData<UserMeResponseDto | null>(ME_KEY, (current) => {
        const next = current ? { ...current, user } : meFromUser(user);
        writeCachedMe(next);
        return next;
      });
    },
  });
}

export function useChangePassword() {
  const router = useRouter();

  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      writeCachedMe(null);
      qc.setQueryData(ME_KEY, null);
      useChatStore.getState().reset();
      qc.clear();
      router.replace({ pathname: '/login', query: { password: 'changed' } });
    },
  });
}

export function useLogout() {
  const router = useRouter();

  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      writeCachedMe(null);
      qc.setQueryData(ME_KEY, null);
      useChatStore.getState().reset();
      qc.clear();
      router.replace('/login');
    },
  });
}
