'use client';

import '@livekit/components-styles';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { LiveKitTokenResponseDto, MeetingDto } from '@open-meet/types';

import { ApiClientError } from '@/lib/api';
import { livekitApi } from '@/lib/api/livekit';
import { meetingsApi } from '@/lib/api/meetings';
import { MeetingShell } from './meeting-shell';

export function MeetingClient({ code }: { code: string }) {
  const router = useRouter();
  const [token, setToken] = useState<LiveKitTokenResponseDto | null>(null);
  const [meeting, setMeeting] = useState<MeetingDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const joined = await meetingsApi.join(code);
        if (cancelled) {
          return;
        }
        setMeeting(joined.meeting);

        const lkToken = await livekitApi.token({ meetingCode: code });
        if (cancelled) {
          return;
        }
        setToken(lkToken);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof ApiClientError ? err.message : 'Failed to join meeting';
        setError(message);
        toast.error(message);
        if (err instanceof ApiClientError && err.code === 'MEETING_NOT_FOUND') {
          router.replace('/');
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (error) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (! token || ! meeting) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </main>
    );
  }

  return (
    <LiveKitRoom
      token={token.token}
      serverUrl={token.url}
      connect={true}
      audio={true}
      video={true}
      data-lk-theme="default"
      style={{ height: 'calc(100vh - 3.5rem)' }}
      onDisconnected={() => {
        router.replace(`/meeting/${code}/ended`);
      }}
    >
      <MeetingShell code={code} meeting={meeting} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
