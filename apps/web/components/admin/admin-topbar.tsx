'use client';

import { ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAdminLogout, useCurrentAdmin } from '@/features/admin/auth/hooks/use-admin-auth';
import { cn } from '@/lib/cn';

import { adminNav } from './admin-nav-config';

interface Crumb {
  label: string;
  href?: string;
}

function deriveCrumbs(pathname: string): Crumb[] {
  if (pathname === '/admin') {
    return [{ label: 'Dashboard' }];
  }

  for (const section of adminNav) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        const crumbs: Crumb[] = [
          { label: 'Admin', href: '/admin' },
          { label: item.label, href: item.href },
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

export function AdminTopbar({
  onOpenSidebar,
  desktopSidebarOpen = true,
  onToggleDesktopSidebar,
}: Props) {
  const pathname = usePathname();
  const crumbs = useMemo(() => deriveCrumbs(pathname), [pathname]);
  const { data: admin } = useCurrentAdmin();
  const logout = useAdminLogout();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      {onOpenSidebar ? (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>
      ) : null}

      {onToggleDesktopSidebar ? (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleDesktopSidebar}
          aria-label={desktopSidebarOpen ? 'Hide navigation' : 'Show navigation'}
        >
          {desktopSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      ) : null}

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              ) : null}
              <span
                className={cn(
                  'truncate',
                  isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {crumb.label}
              </span>
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {admin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 px-2 sm:px-3">
                <UserAvatar user={admin} size="md" className="h-8 w-8" />
                <div className="hidden min-w-0 text-left sm:block">
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
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
