'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@open-meet/ui/cn';

import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { href: '/settings/configuration', labelKey: 'items.configuration' },
  { href: '/settings/branding', labelKey: 'items.branding' },
] as const;

function tabIsActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsTabs() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-hidden border-b border-border" aria-label="Settings">
      {TABS.map((tab) => {
        const active = tabIsActive(pathname, tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
