import type { ReactNode } from 'react';

import { AdminGuard } from '@/features/auth/components/admin-guard';
import { AdminShell } from '@/components/admin-shell';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
