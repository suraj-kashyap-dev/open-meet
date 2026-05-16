'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMeeting } from '@/hooks/use-meetings';
import { ApiClientError } from '@/lib/api';

export function HomeActions() {
  const router = useRouter();
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

  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="flex flex-col">
        <CardContent className="flex flex-1 flex-col items-start gap-4 p-6">
          <div className="rounded-md bg-accent/15 p-2 text-accent">
            <Plus className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-medium">Start a new meeting</h2>
            <p className="text-sm text-muted-foreground">
              Generate a fresh link and invite anyone.
            </p>
          </div>
          <Button
            onClick={onCreate}
            disabled={createMeeting.isPending}
            variant="accent"
            className="mt-auto w-full"
          >
            {createMeeting.isPending ? 'Creating…' : 'New meeting'}
          </Button>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-4 p-6">
          <div className="rounded-md bg-muted p-2">
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
