import type { ReactNode } from 'react';

import { AdminGuard } from '@/features/auth/components/admin-guard';
import { AdminShell } from '@/components/admin-shell';

// The admin panel is per-user and data-driven, so it renders on demand rather
// than being statically prerendered (also lets next-intl resolve the request
// locale dynamically for the shared shell).
export const dynamic = 'force-dynamic';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
