import type { ReactNode } from 'react';

import { Sidebar } from './sidebar';
import { ShellSidebarProvider } from './sidebar-state';
import { TopBar } from './top-bar';

export function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <ShellSidebarProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ShellSidebarProvider>
  );
}
