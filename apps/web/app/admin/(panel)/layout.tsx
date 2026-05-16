import type { ReactNode } from 'react';

import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen">
        <AdminHeader />
        {children}
      </div>
    </AdminGuard>
  );
}
