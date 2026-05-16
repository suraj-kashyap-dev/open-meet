'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCurrentUser } from '@/hooks/use-auth';

export function LandingHeader() {
  const { data: user, isLoading } = useCurrentUser();
  // `data` is populated synchronously from localStorage on first render; only
  // suppress auth CTAs when we genuinely have no cached info AND the query is
  // still in flight (typical first-ever visit).
  const isUnknown = isLoading && user === undefined;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background shadow-sm">
            <Video className="h-4 w-4" aria-hidden />
          </span>
          <span>open-meet</span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#why" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Why open-meet
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isUnknown ? (
            <div className="h-8 w-[8.5rem] rounded-md bg-muted/40" aria-hidden />
          ) : user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
