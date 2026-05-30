'use client';

import { useEffect, type ReactNode } from 'react';

import { useCurrentAdmin } from '@/features/auth/hooks/use-admin-auth';
import { useRouter } from '@/i18n/navigation';

export function AdminGuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: admin, isLoading } = useCurrentAdmin();

  useEffect(() => {
    if (!isLoading && admin) {
      router.replace('/');
    }
  }, [admin, isLoading, router]);

  // While the session resolves, or once we know the admin is signed in (and the
  // redirect is in flight), show a spinner instead of flashing the form.
  if (isLoading || admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}