'use client';

import {
  CalendarRange,
  LayoutDashboard,
  Menu,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Sheet, SheetContent, SheetTitle } from '@open-meet/ui/sheet';
import { cn } from '@open-meet/ui/cn';

import { Link, usePathname } from '@/i18n/navigation';

import { SidebarContent } from './sidebar-content';
import { isActive } from './nav-config';

interface Tab {
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { labelKey: 'items.dashboard', href: '/', icon: LayoutDashboard },
  { labelKey: 'items.users', href: '/users', icon: Users },
  { labelKey: 'items.meetings', href: '/meetings', icon: CalendarRange },
  { labelKey: 'items.departments', href: '/departments', icon: UsersRound },
];

function itemClass(active: boolean): string {
  return cn(
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
    active ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
  );
}

export function MobileNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const onPrimary = TABS.some((tab) => isActive(pathname, tab.href));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch px-1.5 py-1.5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={itemClass(active)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">{t(tab.labelKey)}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={itemClass(moreOpen || !onPrimary)}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate">{t('items.more')}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">{t('topbar.open-sidebar')}</SheetTitle>
          <SidebarContent onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
