'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { AppLogo } from '@/components/branding/app-logo';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { useBranding } from '@/components/branding/provider';
import { useAdminLogout, useCurrentAdmin } from '@/features/auth/hooks/use-admin-auth';
import { Link } from '@/i18n/navigation';

export function MobileHeader() {
  const t = useTranslations('nav');
  const { appName, logoUrl } = useBranding();
  const { data: admin } = useCurrentAdmin();
  const logout = useAdminLogout();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:hidden">
      <Link
        href="/"
        aria-label={appName}
        className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {logoUrl ? (
          <img src={logoUrl} alt={appName} className="h-7 w-7 shrink-0 rounded-md object-contain" />
        ) : (
          <AppLogo className="h-7 w-7 shrink-0" title={appName} />
        )}
        <span className="truncate text-sm font-semibold tracking-tight">{appName}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher />

        {admin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={admin.name}>
                <UserAvatar user={admin} size="sm" className="h-7 w-7" />
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
