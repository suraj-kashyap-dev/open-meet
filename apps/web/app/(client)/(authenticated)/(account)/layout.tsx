import type { ReactNode } from 'react';

import { AccountSidebar } from '@/components/client/account/account-sidebar';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <AccountSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
