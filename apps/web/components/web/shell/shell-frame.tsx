'use client';

import type { ReactNode } from 'react';

import { cn } from '@open-meet/ui/cn';

import { usePathname } from '@/i18n/navigation';

import { shouldHideMobileBottomNav } from './mobile-nav-visibility';
import { Sidebar } from './sidebar';
import { ShellSidebarProvider } from './sidebar-state';
import { TopBar } from './top-bar';

export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideMobileBottomNav = shouldHideMobileBottomNav(pathname);

  return (
    <ShellSidebarProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            className={cn(
              'min-h-0 flex-1 overflow-y-auto',
              hideMobileBottomNav
                ? 'pb-0'
                : 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0',
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </ShellSidebarProvider>
  );
}
