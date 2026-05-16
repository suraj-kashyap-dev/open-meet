'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, History, LogOut, User } from 'lucide-react';

import { Logo } from '@/components/shared/logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCurrentUser, useLogout } from '@/hooks/client/use-auth';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AppHeader() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const initials = user ? initialsOf(user.name) : '?';

  return (
    <header
      data-hide-in-fullscreen
      className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
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
                  className="group h-10 gap-2 rounded-full border border-transparent px-1.5 pr-2.5 transition-colors hover:border-border hover:bg-muted/60 data-[state=open]:border-border data-[state=open]:bg-muted/60"
                >
                  <Avatar className="h-7 w-7 ring-2 ring-background">
                    <AvatarFallback className="bg-accent/15 text-xs font-semibold text-accent">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-72 overflow-hidden p-0"
              >
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 p-4">
                  <Avatar className="h-11 w-11 ring-2 ring-background">
                    <AvatarFallback className="bg-accent/15 text-sm font-semibold text-accent">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="p-1.5">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      router.push('/profile');
                    }}
                    className="gap-3 rounded-md px-2.5 py-2"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">Profile</span>
                      <span className="text-xs text-muted-foreground">Edit your account details</span>
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      router.push('/history');
                    }}
                    className="gap-3 rounded-md px-2.5 py-2"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <History className="h-4 w-4" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">Meeting history</span>
                      <span className="text-xs text-muted-foreground">Past meetings, chats and files</span>
                    </span>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="m-0" />

                <div className="p-1.5">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      logout.mutate();
                    }}
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
