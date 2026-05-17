import type { ReactNode } from 'react';

import { GuestGuard } from '@/features/auth/components/guest-guard';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGuard>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
        <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />

        <div className="relative w-full max-w-md rounded-2xl border border-border/70 bg-card/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {children}
        </div>
      </div>
    </GuestGuard>
  );
}
