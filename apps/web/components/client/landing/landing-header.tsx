'use client';

import Link from 'next/link';

import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCurrentUser } from '@/hooks/client/use-auth';

export function LandingHeader() {
  const { data: user } = useCurrentUser();
  
  const isLoggedIn = !! user;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="h-7 w-7 shadow-sm" />
          <span>Open Meet</span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#why"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Why open-meet
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open app</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
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
