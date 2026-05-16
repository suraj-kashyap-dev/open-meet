'use client';

import { ArrowRight, Check, Copy, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUser } from '@/hooks/client/use-auth';
import { useMediaDevices } from '@/hooks/client/use-media-devices';
import { useMeeting } from '@/hooks/client/use-meetings';
import { ApiClientError } from '@/lib/shared/api';

import { DeviceSelector } from './device-selector';
import { LobbyPreview } from './lobby-preview';

export function LobbyClient({ code }: { code: string }) {
  const router = useRouter();
  const media = useMediaDevices();
  const { data: meeting, error, isLoading } = useMeeting(code);
  const { data: user } = useCurrentUser();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (error instanceof ApiClientError && error.code === 'MEETING_NOT_FOUND') {
      toast.error('Meeting not found');
      router.replace('/');
    }
  }, [error, router]);

  const onCopyLink = async () => {
    if (! meeting) {
      return;
    }

    const url = `${window.location.origin}/${meeting.code}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Meeting link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const onJoin = () => {
    media.stop();
    router.push(`/${code}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (! meeting) {
    return null;
  }

  const displayName = user?.name ?? 'You';
  const title = meeting.title ?? 'Untitled meeting';

  return (
    <div className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 spotlight opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop opacity-50" />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 pb-28 lg:py-12 lg:pb-12">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Get ready
          </p>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="space-y-4">
            <LobbyPreview media={media} displayName={displayName} />

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Secure connection
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                <Lock className="h-3.5 w-3.5" />
                Only invited people can join
              </span>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="space-y-2.5 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Meeting code
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                    {meeting.code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onCopyLink}
                    aria-label="Copy meeting link"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4 p-5">
                <header className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Devices
                  </p>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Check your audio & video
                  </h3>
                </header>
                <DeviceSelector media={media} />
              </div>
            </section>

            <div className="hidden space-y-2 pt-1 lg:block">
              <Button onClick={onJoin} className="group w-full" size="lg">
                Join now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/dashboard" className="hover:text-foreground hover:underline">
                  Back to dashboard
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Cancel
          </Link>
          <Button onClick={onJoin} className="group flex-1" size="lg">
            Join now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
