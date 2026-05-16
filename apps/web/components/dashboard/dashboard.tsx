'use client';

import { ArrowRight, Plus, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Spotlight } from '@/components/ui/spotlight';
import { useCurrentUser } from '@/hooks/use-auth';
import { useCreateMeeting } from '@/hooks/use-meetings';
import { ApiClientError } from '@/lib/api';

export function Dashboard() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const createMeeting = useCreateMeeting();
  const [code, setCode] = useState('');

  const onCreate = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      router.push(`/meeting/${meeting.code}/lobby`);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Could not create meeting';
      toast.error(message);
    }
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (! trimmed) {
      toast.error('Enter a meeting code');
      return;
    }
    router.push(`/meeting/${trimmed}/lobby`);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <main className="relative isolate overflow-hidden">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <Spotlight />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-20 pt-16 sm:pt-20">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {greeting()}, {firstName} 👋
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to talk?
          </h1>
          <p className="max-w-xl text-balance text-sm text-muted-foreground">
            Start a fresh meeting in one click or join with a 12-character code. Press{' '}
            <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>{' '}
            from anywhere to jump in.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="group relative flex flex-col overflow-hidden border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <CardContent className="flex flex-1 flex-col items-start gap-5 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
                <Plus className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">Start a new meeting</h2>
                <p className="text-sm text-muted-foreground">
                  Generate a fresh link and invite anyone.
                </p>
              </div>
              <ShimmerButton
                type="button"
                onClick={onCreate}
                disabled={createMeeting.isPending}
                className="mt-auto w-full"
              >
                {createMeeting.isPending ? (
                  <>Creating…</>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    New meeting
                  </>
                )}
              </ShimmerButton>
            </CardContent>
          </Card>

          <Card className="group flex flex-col border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-foreground/30 hover:shadow-lg">
            <CardContent className="flex flex-1 flex-col gap-5 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">Join with a code</h2>
                <p className="text-sm text-muted-foreground">
                  Paste the link or 12-character code.
                </p>
              </div>
              <form onSubmit={onJoin} className="mt-auto space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="join-code" className="sr-only">
                    Meeting code
                  </Label>
                  <Input
                    id="join-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="abcd-efgh-ijkl"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full">
                  Join
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) {
    return 'Up late';
  }
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}
