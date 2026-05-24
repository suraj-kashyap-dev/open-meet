import type { ReactNode } from 'react';

import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { GuestGuard } from '@/features/web/auth/components/guest-guard';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGuard>
      <main className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        <div className="absolute end-4 top-4">
          <LanguageSwitcher />
        </div>

        {children}
      </main>
    </GuestGuard>
  );
}
