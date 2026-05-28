'use client';

import { LogOut, Settings, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@open-meet/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { Link } from '@/i18n/navigation';
import { useCurrentUser, useLogout } from '@/features/web/auth/hooks/use-auth';

/** Account avatar + dropdown (profile / settings / sign out). Lives in the top
 * bar; previously inline in the retired AppHeader. */
export function UserMenu() {
  const t = useTranslations('nav');
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('user-menu-label')}
          className="rounded-full border border-transparent hover:border-border data-[state=open]:border-border"
        >
          <UserAvatar user={user} size="sm" className="ring-2 ring-background" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 p-4">
          <UserAvatar user={user} size="xl" className="ring-2 ring-background" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-col p-1.5">
          <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-md px-2.5 py-2 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{t('menu.profile')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('menu.profile-description')}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-md px-2.5 py-2 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Settings className="h-4 w-4" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{t('menu.settings')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('menu.settings-description')}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="m-0" />

        <div className="p-1.5">
          <DropdownMenuItem
            onSelect={() => logout.mutate()}
            className="gap-3 rounded-md px-2.5 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">{t('menu.sign-out')}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
