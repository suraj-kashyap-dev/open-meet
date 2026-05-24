'use client';

import { useEffect, type ReactNode } from 'react';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { currentClientPath, loginHref } from '@/features/web/auth/lib/redirect';
import { useRouter } from '@/i18n/navigation';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(loginHref(currentClientPath()));
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
