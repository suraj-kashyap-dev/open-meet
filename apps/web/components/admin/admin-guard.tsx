'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useCurrentAdmin } from '@/hooks/use-admin-auth';

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: admin, isLoading } = useCurrentAdmin();

  useEffect(() => {
    if (! isLoading && ! admin) {
      router.replace('/admin/login');
    }
  }, [admin, isLoading, router]);

  if (isLoading || ! admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
