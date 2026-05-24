import type { ReactNode } from 'react';

import { AuthGuard } from '@/features/web/auth/components/auth-guard';
import { CommandPalette } from '@/components/shared/command-palette';
import { AppHeader } from '@/components/web/header/header';

// Authenticated routes are per-user and data-driven, so they render on demand
// rather than being statically prerendered. This also lets next-intl resolve
// the request locale dynamically for the shared header/command palette.
export const dynamic = 'force-dynamic';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <AppHeader />
        {children}
        <CommandPalette />
      </div>
    </AuthGuard>
  );
}
