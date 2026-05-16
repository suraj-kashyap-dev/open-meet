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
import { useCreateMeeting } from '@/hooks/client/use-meetings';
import { ApiClientError } from '@/lib/shared/api';

export function HomeActions() {
  const router = useRouter();
  const createMeeting = useCreateMeeting();
  const [code, setCode] = useState('');

  const onCreate = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      router.push(`/${meeting.code}/lobby`);
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
    router.push(`/${trimmed}/lobby`);
  };

  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="group relative flex flex-col overflow-hidden border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
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
  );
}
