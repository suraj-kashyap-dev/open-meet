'use client';

import { AtSign, History, MessageSquare, Star, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@open-meet/ui/cn';
import { ThemeToggle } from '@open-meet/ui/theme-toggle';

import { BrandLockup } from '@/components/web/branding/brand-lockup';
import { useBranding } from '@/components/web/branding/branding-provider';
import { ChatNavBadge } from '@/features/web/chat/components/chat-nav-badge';
import { Link, usePathname } from '@/i18n/navigation';

import { isRailActive } from './rail-active';

interface RailItem {
  href: string;
  icon: LucideIcon;
  key: 'chat' | 'meet' | 'activity' | 'saved' | 'history';
  badge?: boolean;
}

const ITEMS: RailItem[] = [
  { href: '/chat', icon: MessageSquare, key: 'chat', badge: true },
  { href: '/meet', icon: Video, key: 'meet' },
  { href: '/activity', icon: AtSign, key: 'activity' },
  { href: '/saved', icon: Star, key: 'saved' },
  { href: '/history', icon: History, key: 'history' },
];

export function IconRail() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { appName, logoUrl } = useBranding();

  return (
    <nav
      aria-label={t('rail.label')}
      data-testid="app-rail"
      className="flex h-full w-20 shrink-0 flex-col items-center border-e border-border bg-card py-3"
    >
      <Link
        href="/chat"
        aria-label={appName}
        className="mb-3 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandLockup appName={appName} logoUrl={logoUrl} showName={false} logoClassName="h-8 w-8" />
      </Link>

      <ul className="flex w-full flex-1 flex-col gap-1 px-1.5">
        {ITEMS.map(({ href, icon: Icon, key, badge }) => {
          const active = isRailActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-accent/10 text-accent before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-accent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge ? <ChatNavBadge /> : null}
                </span>
                <span className="leading-none">{t(`rail.${key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-2">
        <ThemeToggle />
      </div>
    </nav>
  );
}
