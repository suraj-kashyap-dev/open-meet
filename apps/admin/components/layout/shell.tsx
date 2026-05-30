'use client';

import { useState, type ReactNode } from 'react';

import { MobileHeader } from './mobile-header';
import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export const SIDEBAR_COOKIE = 'admin_sidebar_open';

function readSidebarOpen(fallback: boolean): boolean {
  if (typeof document === 'undefined') {
    return fallback;
  }

  const match = document.cookie.match(/(?:^|;\s*)admin_sidebar_open=([01])/);

  return match ? match[1] === '1' : fallback;
}

export function Shell({
  children,
  defaultOpen = true,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => readSidebarOpen(defaultOpen));

  const toggleDesktopSidebar = () => {
    const next = !desktopSidebarOpen;

    setDesktopSidebarOpen(next);

    document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={desktopSidebarOpen} />

      <div
        className={
          desktopSidebarOpen
            ? 'transition-[padding] duration-200 ease-out lg:ps-64'
            : 'transition-[padding] duration-200 ease-out lg:ps-16'
        }
      >
        <Topbar
          desktopSidebarOpen={desktopSidebarOpen}
          onToggleDesktopSidebar={toggleDesktopSidebar}
        />

        <MobileHeader />

        <div className="min-h-[calc(100vh-3.5rem)] overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
