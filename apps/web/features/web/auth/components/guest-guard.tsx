'use client';

import { useEffect, type ReactNode } from 'react';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';
import { useRouter } from '@/i18n/navigation';

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
