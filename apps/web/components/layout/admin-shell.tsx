'use client';

import { useState, type ReactNode } from 'react';

import { Sheet, SheetContent } from '@/components/ui/sheet';

import { AdminSidebar } from './admin-sidebar';
import { AdminSidebarMobile } from './admin-sidebar-mobile';
import { AdminTopbar } from './admin-topbar';

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar open={desktopSidebarOpen} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 lg:hidden">
          <AdminSidebarMobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={
          desktopSidebarOpen
            ? 'transition-[padding] duration-200 ease-out lg:pl-64'
            : 'transition-[padding] duration-200 ease-out lg:pl-0'
        }
      >
        <AdminTopbar
          onOpenSidebar={() => setMobileOpen(true)}
          desktopSidebarOpen={desktopSidebarOpen}
          onToggleDesktopSidebar={() => setDesktopSidebarOpen((open) => !open)}
        />
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  );
}
