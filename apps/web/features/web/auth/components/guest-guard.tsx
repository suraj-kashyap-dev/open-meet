'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';

/**
 * Inverse of AuthGuard — used on /login and /register. If the user is
 * already authenticated we bounce them to the page they were headed for
 * (the `?redirect=` they arrived with), defaulting home, so they can't
 * accidentally land on the auth screens.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const isAuthed = !!user;

  useEffect(() => {
    if (isAuthed) {
      const param = new URLSearchParams(window.location.search).get(REDIRECT_PARAM);
      router.replace(resolveRedirect(param));
    }
  }, [isAuthed, router]);

  if (isAuthed) {
    return null;
  }

  return <>{children}</>;
}
