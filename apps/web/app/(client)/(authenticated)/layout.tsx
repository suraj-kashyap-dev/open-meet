import type { ReactNode } from 'react';

import { AuthGuard } from '@/components/client/auth/auth-guard';
import { CommandPalette } from '@/components/shared/command-palette';
import { AppHeader } from '@/components/shared/layout/app-header';

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
