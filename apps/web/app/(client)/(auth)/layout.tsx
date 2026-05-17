import type { ReactNode } from 'react';

import { GuestGuard } from '@/features/web/auth/components/guest-guard';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGuard>
      <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        {children}
      </main>
    </GuestGuard>
  );
}
