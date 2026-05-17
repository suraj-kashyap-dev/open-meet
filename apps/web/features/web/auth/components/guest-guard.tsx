'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';

/**
 * Inverse of AuthGuard — used on /login and /register. If the user is
 * already authenticated we bounce them home so they can't
 * accidentally land on the auth screens.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const isAuthed = !!user;

  useEffect(() => {
    if (isAuthed) {
      router.replace('/');
    }
  }, [isAuthed, router]);

  if (isAuthed) {
    return null;
  }

  return <>{children}</>;
}
