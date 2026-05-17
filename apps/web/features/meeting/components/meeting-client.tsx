'use client';

import '@livekit/components-styles';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { LiveKitTokenResponseDto, MeetingDto } from '@open-meet/types';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { consumeJoinPreferences } from '@/features/lobby/lib/join-preferences';
import { ApiClientError } from '@/lib/api/client';
import { livekitApi } from '@/features/meeting/services/livekit';
import { meetingsApi } from '@/features/meeting/services/meetings';
import { EndedView } from './ended-view';
import { MeetingShell } from './meeting-shell';
import { WaitingRoom } from './waiting-room';

type GuestStage = 'lookup' | 'knocking' | 'admitted';

export function MeetingClient({ code }: { code: string }) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [token, setToken] = useState<LiveKitTokenResponseDto | null>(null);
  const [meeting, setMeeting] = useState<MeetingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestStage, setGuestStage] = useState<GuestStage>('lookup');
  const [ended, setEnded] = useState(false);
  const [joinPrefs] = useState(() => consumeJoinPreferences(code));

  useEffect(() => {
    if (! user || userLoading) {
      return;
    }

    let cancelled = false;

    async function lookup() {
      try {
        const m = await meetingsApi.get(code);

        if (cancelled) {
          return;
        }

        setMeeting(m);

        if (user!.id !== m.hostId) {
          setGuestStage('knocking');
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof ApiClientError ? err.message : 'Failed to load meeting';
        setError(message);
        toast.error(message);

        if (err instanceof ApiClientError && err.code === 'MEETING_NOT_FOUND') {
          router.replace('/');
        }
      }
    }

    void lookup();

    return () => {
      cancelled = true;
    };
  }, [code, router, user, userLoading]);

  const proceedToRoom = useCallback(async () => {
    try {
      const joined = await meetingsApi.join(code);
      setMeeting(joined.meeting);
      const lkToken = await livekitApi.token({ meetingCode: code });
      setToken(lkToken);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to join meeting';
      setError(message);
      toast.error(message);
    }
  }, [code]);

  useEffect(() => {
    if (! meeting || ! user) {
      return;
    }

    if (user.id === meeting.hostId && ! token && ! error) {
      void proceedToRoom();
    }
  }, [meeting, user, token, error, proceedToRoom]);

  const onGuestAdmitted = useCallback(() => {
    setGuestStage('admitted');
    void proceedToRoom();
  }, [proceedToRoom]);

  if (ended && meeting) {
    return <EndedView code={code} />;
  }

  if (error) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (! meeting || ! user) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </main>
    );
  }

  const isHost = user.id === meeting.hostId;

  if (! isHost && guestStage !== 'admitted') {
    return (
      <WaitingRoom code={code} displayName={user.name} onAdmitted={onGuestAdmitted} />
    );
  }

  if (! token) {
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
      audio={joinPrefs?.micEnabled ?? true}
      video={joinPrefs?.cameraEnabled ?? true}
      data-lk-theme="default"
      style={{ height: 'calc(100vh - 3.5rem)' }}
      options={{
        publishDefaults: { stopMicTrackOnMute: false },
        stopLocalTrackOnUnpublish: false,
      }}
      onDisconnected={() => {
        setEnded(true);
      }}
    >
      <MeetingShell code={code} meeting={meeting} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
