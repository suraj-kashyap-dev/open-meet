'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Sheet, SheetContent, SheetTitle } from '@open-meet/ui/sheet';

import { isRtl } from '@/i18n/routing';

import { AdminSidebar } from './admin-sidebar';
import { AdminSidebarContent } from './admin-sidebar-content';
import { AdminTopbar } from './admin-topbar';

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const rtl = isRtl(useLocale());
  const t = useTranslations('nav');

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar open={desktopSidebarOpen} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side={rtl ? 'right' : 'left'}
          className="w-72 p-0 lg:hidden"
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">{t('topbar.open-sidebar')}</SheetTitle>
          <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={
          desktopSidebarOpen
            ? 'transition-[padding] duration-200 ease-out lg:ps-64'
            : 'transition-[padding] duration-200 ease-out lg:ps-16'
        }
      >
        <AdminTopbar
          onOpenSidebar={() => setMobileOpen(true)}
          desktopSidebarOpen={desktopSidebarOpen}
          onToggleDesktopSidebar={() => setDesktopSidebarOpen((open) => !open)}
        />
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </div>
    </div>
  );
}
