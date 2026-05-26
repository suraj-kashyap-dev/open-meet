'use client';

import { ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Logo } from '@open-meet/ui/logo';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { ThemeToggle } from '@open-meet/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { useBranding } from '@/components/branding/provider';
import { useAdminLogout, useCurrentAdmin } from '@/features/auth/hooks/use-admin-auth';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@open-meet/ui/cn';

import { nav } from './nav-config';

interface Crumb {
  labelKey?: string;
  label?: string;
  href?: string;
}

function deriveCrumbs(pathname: string): Crumb[] {
  if (pathname === '/') {
    return [{ labelKey: 'topbar.dashboard' }];
  }

  for (const section of nav) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        const crumbs: Crumb[] = [
          { labelKey: 'topbar.root', href: '/' },
          { labelKey: item.labelKey, href: item.href },
        ];
        const tail = pathname.slice(item.href.length).split('/').filter(Boolean);

        for (const segment of tail) {
          crumbs.push({ label: decodeURIComponent(segment) });
        }

        return crumbs;
      }
    }
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment) => ({ label: segment }));
}

interface Props {
  onOpenSidebar?: () => void;
  desktopSidebarOpen?: boolean;
  onToggleDesktopSidebar?: () => void;
}

export function Topbar({
  onOpenSidebar,
  desktopSidebarOpen = true,
  onToggleDesktopSidebar,
}: Props) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const crumbs = useMemo(() => deriveCrumbs(pathname), [pathname]);
  const { data: admin } = useCurrentAdmin();
  const logout = useAdminLogout();
  const { appName, logoUrl } = useBranding();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      {onOpenSidebar ? (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label={t('topbar.open-sidebar')}
        >
          <Menu className="h-4 w-4" />
        </Button>
      ) : null}

      <Link
        href="/"
        aria-label={appName}
        className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent sm:hidden"
      >
        {logoUrl ? (
          <img src={logoUrl} alt={appName} className="h-7 w-7 shrink-0 rounded-md object-contain" />
        ) : (
          <Logo className="h-7 w-7 shrink-0" />
        )}
        <span className="truncate text-sm font-semibold tracking-tight">{appName}</span>
      </Link>

      {onToggleDesktopSidebar ? (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleDesktopSidebar}
          aria-label={desktopSidebarOpen ? t('topbar.hide-sidebar') : t('topbar.show-sidebar')}
        >
          {desktopSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      ) : null}

      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const text = crumb.labelKey ? t(crumb.labelKey) : (crumb.label ?? '');
          return (
            <span
              key={`${crumb.labelKey ?? crumb.label}-${index}`}
              className="flex items-center gap-1"
            >
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
              ) : null}
              <span
                className={cn(
                  'truncate',
                  isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {text}
              </span>
            </span>
          );
        })}
      </nav>

      <div className="ms-auto flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />

        {admin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 px-2 sm:px-3">
                <UserAvatar user={admin} size="md" className="h-8 w-8" />
                <div className="hidden min-w-0 text-start sm:block">
                  <p className="truncate text-sm font-medium leading-none">{admin.name}</p>
                  <p className="truncate pt-1 text-xs text-muted-foreground">{admin.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="font-medium">{admin.name}</span>
                  <span className="text-xs text-muted-foreground">{admin.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  logout.mutate();
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t('topbar.sign-out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
