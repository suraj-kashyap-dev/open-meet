'use client';

import { ArrowRight, History, Home, PhoneOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useMeetingStore } from '@/features/web/meeting/stores';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { cn } from '@/lib/cn';

const COUNTDOWN_SECONDS = 60;
const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function EndedView({ code }: { code: string }) {
  const nav = useNavigateTransition();
  const meeting = useMeetingStore((s) => s.meeting);
  const title = meeting && meeting.code === code ? meeting.title : null;

  const [secs, setSecs] = useState(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    const id = window.setInterval(() => {
      setSecs((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (secs === 0 && !paused) {
      nav.replace('/');
    }
  }, [secs, paused, nav]);

  const rejoin = () => {
    nav.replace(`/${code}`);
    window.location.reload();
  };

  const goHome = () => {
    nav.replace('/');
  };

  const progress = secs / COUNTDOWN_SECONDS;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <main className="relative isolate flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 spotlight opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop opacity-40" />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-2xl shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col items-center px-8 pt-10 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-accent/15" />
              <span className="absolute inset-1 rounded-full bg-accent/10 ring-1 ring-accent/30" />
              <PhoneOff className="relative h-7 w-7 text-accent" />
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight">You left the meeting</h1>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              The call may still be in progress — you can rejoin while it&apos;s active, or head
              back home.
            </p>
          </div>

          <div className="mx-8 mt-7 rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/20">
                <History className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-semibold tracking-tight',
                    title ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  title={title ?? 'Untitled meeting'}
                >
                  {title ?? 'Untitled meeting'}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {code}
                </p>
              </div>

              <Link
                href={`/history/${code}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                History
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-8 pt-6 sm:flex-row">
            <Button onClick={rejoin} disabled={nav.isNavigating} size="lg" className="sm:flex-1">
              <RotateCcw className="h-4 w-4" />
              {nav.isNavigating ? 'Rejoining…' : 'Rejoin meeting'}
            </Button>

            <Button
              onClick={goHome}
              disabled={nav.isNavigating}
              variant="outline"
              size="lg"
              className="sm:flex-1"
            >
              <Home className="h-4 w-4" />
              Go home
            </Button>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="relative inline-flex h-12 w-12 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 50 50" aria-hidden>
                  <circle
                    cx="25"
                    cy="25"
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth="3"
                    className="stroke-border"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                </svg>
                <span className="relative font-mono text-[11px] font-semibold tabular-nums">
                  {secs}
                </span>
              </span>

              <div className="flex flex-col leading-tight">
                <span className="font-medium text-foreground">
                  {paused ? 'Auto-redirect paused' : 'Heading home soon'}
                </span>
                <span className="text-muted-foreground">
                  {paused
                    ? 'You can stay here as long as you want.'
                    : `Returns you to the dashboard in ${secs}s.`}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              className="shrink-0 text-xs"
            >
              {paused ? 'Resume' : 'Stay here'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
