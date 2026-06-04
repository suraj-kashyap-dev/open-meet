'use client';

import {
  AtSign,
  Bookmark,
  History,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import { Logo } from '@open-meet/ui/logo';
import { Sheet, SheetContent, SheetTitle } from '@open-meet/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@open-meet/ui/tooltip';

import { BrandLockup } from '@/components/web/branding/brand-lockup';
import { useBranding } from '@/components/web/branding/branding-provider';
import { ChatNavBadge } from '@/features/web/chat/components/chat-nav-badge';
import { Link, usePathname } from '@/i18n/navigation';

import { isRailActive } from './rail-active';
import {
  getSidebarCollapsedNavItemClass,
  getSidebarNavIconClass,
  getSidebarNavItemClass,
  getSidebarNavLabelClass,
} from './sidebar-item-styles';
import { useShellSidebar } from './sidebar-state';
import { UserMenu } from './user-menu';

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  key: 'chat' | 'meet' | 'activity' | 'saved' | 'history';
  badge?: boolean;
}

const ITEMS: SidebarItem[] = [
  { href: '/chat', icon: MessageSquare, key: 'chat', badge: true },
  { href: '/meet', icon: Video, key: 'meet' },
  { href: '/activity', icon: AtSign, key: 'activity' },
  { href: '/saved', icon: Bookmark, key: 'saved' },
  { href: '/history', icon: History, key: 'history' },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const { desktopExpanded, mobileOpen, setMobileOpen } = useShellSidebar();

  return (
    <>
      <aside className="flex h-dvh w-[4.75rem] shrink-0 border-e border-border/70 bg-card/85 backdrop-blur-2xl lg:hidden">
        <SidebarSurface collapsed />
      </aside>

      <aside
        data-testid="app-sidebar"
        className={cn(
          'hidden h-dvh shrink-0 border-e border-border/70 bg-card/85 backdrop-blur-2xl transition-[width] duration-300 ease-out lg:flex',
          desktopExpanded ? 'w-[20rem]' : 'w-[4.75rem]',
        )}
      >
        <SidebarSurface collapsed={!desktopExpanded} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[20rem] max-w-[calc(100vw-1rem)] p-0 sm:max-w-[20rem]"
        >
          <SheetTitle className="sr-only">{t('rail.label')}</SheetTitle>
          <SidebarSurface onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarSurface({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { appName, logoUrl } = useBranding();
  const { closeSidebar, openSidebar } = useShellSidebar();

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div
          className={cn(
            'flex h-14 items-center border-b border-border/70',
            collapsed
              ? 'px-2'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_45%)] px-3',
          )}
        >
          <div className={cn('flex w-full items-center gap-2', collapsed && 'justify-center')}>
            {collapsed ? (
              <SidebarBrandToggle
                appName={appName}
                logoUrl={logoUrl}
                expanded={false}
                onClick={openSidebar}
                label={`${appName} ${tNav('rail.label')}`}
              />
            ) : (
              <>
                <Link
                  href="/chat"
                  onClick={onNavigate}
                  aria-label={appName}
                  className="flex min-w-0 flex-1 items-center rounded-2xl px-2 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <BrandLockup
                    appName={appName}
                    logoUrl={logoUrl}
                    className="flex min-w-0 items-center"
                    showName
                    logoClassName="h-8 w-8 rounded-xl"
                    textClassName="truncate text-base font-semibold leading-none tracking-tight"
                  />
                </Link>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${appName} ${tNav('rail.label')}`}
                  onClick={closeSidebar}
                  className="rounded-2xl border border-transparent hover:border-border/80"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className={cn('flex min-h-0 flex-1 flex-col', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
          {collapsed ? (
            <CollapsedRail pathname={pathname} tNav={tNav} onNavigate={onNavigate} />
          ) : (
            <>
              <nav aria-label={tNav('rail.label')} className="space-y-1">
                {ITEMS.map(({ href, icon: Icon, key, badge }) => {
                  const active = isRailActive(pathname, href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={getSidebarNavItemClass(active)}
                    >
                      <span className={getSidebarNavIconClass(active)}>
                        <Icon className="h-4 w-4" />
                        {badge ? <ChatNavBadge /> : null}
                      </span>
                      <span className={getSidebarNavLabelClass(active)}>{tNav(`rail.${key}`)}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        <div className={cn('border-t border-border/70', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
          {collapsed ? (
            <div className="flex justify-center">
              <UserMenu appearance="sidebar" collapsed />
            </div>
          ) : (
            <UserMenu appearance="sidebar" className="w-full" />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function SidebarBrandToggle({
  appName,
  logoUrl,
  expanded,
  onClick,
  label,
}: {
  appName: string;
  logoUrl: string | null;
  expanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-transparent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="transition-all duration-200 group-hover:scale-90 group-hover:opacity-0 group-focus-visible:scale-90 group-focus-visible:opacity-0">
        {logoUrl ? (
          <img src={logoUrl} alt={appName} className="h-8 w-8 rounded-xl object-contain" />
        ) : (
          <Logo className="h-8 w-8 rounded-xl shadow-sm" title={appName} />
        )}
      </span>

      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </span>
    </button>
  );
}

function CollapsedRail({
  pathname,
  tNav,
  onNavigate,
}: {
  pathname: string;
  tNav: (key: string) => string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center gap-2">
      <div className="flex w-full flex-col items-center gap-2">
        {ITEMS.map(({ href, icon: Icon, key, badge }) => {
          const active = isRailActive(pathname, href);

          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={getSidebarCollapsedNavItemClass(active)}
                >
                  <Icon className="h-4 w-4" />
                  {badge ? <ChatNavBadge /> : null}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{tNav(`rail.${key}`)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
