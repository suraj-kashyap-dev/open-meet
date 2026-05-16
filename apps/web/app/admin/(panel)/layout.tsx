import type { ReactNode } from 'react';

import { AdminGuard } from '@/components/admin/auth/admin-guard';
import { AdminShell } from '@/components/admin/layout/admin-shell';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
