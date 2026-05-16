'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMediaDevices } from '@/hooks/use-media-devices';
import { useMeeting } from '@/hooks/use-meetings';
import { ApiClientError } from '@/lib/api';
import { DeviceSelector } from './device-selector';
import { LobbyPreview } from './lobby-preview';

export function LobbyClient({ code }: { code: string }) {
  const router = useRouter();
  const media = useMediaDevices();
  const { data: meeting, error, isLoading } = useMeeting(code);

  useEffect(() => {
    if (error instanceof ApiClientError && error.code === 'MEETING_NOT_FOUND') {
      toast.error('Meeting not found');
      router.replace('/');
    }
  }, [error, router]);

  const onJoin = () => {
    media.stop();
    router.push(`/meeting/${code}`);
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

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-3">
        <LobbyPreview media={media} />
        <p className="text-sm text-muted-foreground">
          Meeting code: <span className="font-mono text-foreground">{meeting.code}</span>
        </p>
      </section>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Ready to join?</h2>
            <p className="text-sm text-muted-foreground">
              Pick your devices and click join when you&apos;re ready.
            </p>
          </div>

          <DeviceSelector media={media} />

          <Button onClick={onJoin} className="w-full" variant="accent" size="lg">
            Join now
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
