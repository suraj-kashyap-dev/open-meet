'use client';

import { Home, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';

const COUNTDOWN_SECONDS = 60;

export function EndedView({ code }: { code: string }) {
  const nav = useNavigateTransition();

  const [secs, setSecs] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecs((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (secs === 0) {
      nav.replace('/');
    }
  }, [secs, nav]);

  const rejoin = () => {
    nav.replace(`/${code}`);

    window.location.reload();
  };

  const goHome = () => {
    nav.replace('/');
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">You left the meeting</h1>
          <p className="text-sm text-muted-foreground">
            Redirecting to home in{' '}
            <span className="font-medium tabular-nums text-foreground">{secs}s</span>. You can
            rejoin if it&apos;s still in progress, or go home now.
          </p>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Meeting code
          </span>

          <code className="rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-sm">
            {code}
          </code>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={rejoin} disabled={nav.isNavigating} size="lg" className="sm:flex-1">
            <RotateCcw className="h-4 w-4" />
            {nav.isNavigating ? 'Rejoining…' : 'Rejoin'}
          </Button>

          <Button
            onClick={goHome}
            disabled={nav.isNavigating}
            variant="outline"
            size="lg"
            className="sm:flex-1"
          >
            <Home className="h-4 w-4" />
            {nav.isNavigating ? 'Leaving…' : 'Go home'}
          </Button>
        </div>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground transition-[width] duration-1000 ease-linear"
            style={{ width: `${(secs / COUNTDOWN_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </main>
  );
}
