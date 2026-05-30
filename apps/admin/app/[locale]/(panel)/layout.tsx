import type { ReactNode } from 'react';

import { AdminGuard } from '@/features/auth/components/admin-guard';
import { Shell } from '@/components/layout/shell';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <Shell>{children}</Shell>
    </AdminGuard>
  );
}
