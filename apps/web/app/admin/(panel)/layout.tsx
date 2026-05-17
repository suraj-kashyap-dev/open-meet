import type { ReactNode } from 'react';

import { AdminGuard } from '@/features/admin-auth/components/admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
