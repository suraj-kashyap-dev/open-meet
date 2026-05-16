import type { ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { CommandPalette } from '@/components/command-palette';
import { AppHeader } from '@/components/layout/app-header';

export default function AppLayout({ children }: { children: ReactNode }) {
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
