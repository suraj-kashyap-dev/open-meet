'use client';

import { Github } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCurrentUser } from '@/hooks/client/use-auth';
import { GITHUB_URL } from '@/lib/shared/constants';

interface Props {
  initialSession?: boolean;
}

export function LandingHeader({ initialSession = false }: Props) {
  const { data: user } = useCurrentUser();

  const isLoggedIn = user !== undefined ? user !== null : initialSession;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
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
            Why Open Meet
          </a>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <Button asChild size="sm">
              <Link href="/app">Open app</Link>
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
