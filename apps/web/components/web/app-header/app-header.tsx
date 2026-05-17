'use client';

import Link from 'next/link';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';

import { Logo } from '@/components/shared/logo';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCurrentUser, useLogout } from '@/features/web/auth/hooks/use-auth';

export function AppHeader() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header
      data-hide-in-fullscreen
      className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="h-7 w-7 shadow-sm" />
          <span>Open Meet</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="group h-10 gap-2 rounded-md border border-transparent px-1.5 pr-2.5 transition-colors hover:border-border hover:bg-muted/60 data-[state=open]:border-border data-[state=open]:bg-muted/60"
                >
                  <UserAvatar user={user} size="sm" className="ring-2 ring-background" />
                  <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
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
                        <span className="text-sm font-medium">Profile</span>
                        <span className="text-xs text-muted-foreground">
                          Edit your account details
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
                        <span className="text-sm font-medium">Settings</span>
                        <span className="text-xs text-muted-foreground">
                          Defaults, privacy, language
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
                    <span className="text-sm font-medium">Sign out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
