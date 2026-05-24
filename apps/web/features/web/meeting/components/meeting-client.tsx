'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { MeetingDto } from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { consumeJoinPreferences } from '@/features/web/lobby/lib/join-preferences';
import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';
import { livekitApi } from '@/features/web/meeting/services/livekit';
import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useActiveMeeting } from '@/features/web/meeting/stores';
import { EndedView } from './ended-view';
import { WaitingRoom } from './waiting-room';

type GuestStage = 'lookup' | 'knocking' | 'admitted';

const Spinner = () => (
  <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
  </main>
);

export function MeetingClient({ code }: { code: string }) {
  const t = useTranslations('meeting');
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const session = useActiveMeeting((s) => s.session);
  const ended = useActiveMeeting((s) => s.ended);
  const startSession = useActiveMeeting((s) => s.start);

  const hasActiveSession = session?.code === code;
  const isEnded = ended?.code === code;

  const [meeting, setMeeting] = useState<MeetingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestStage, setGuestStage] = useState<GuestStage>('lookup');
  const [joinPrefs] = useState(() => consumeJoinPreferences(code));

  useEffect(() => {
    const onMount = useActiveMeeting.getState();
    if (onMount.session?.code === code && !onMount.ended) {
      onMount.maximize();
    }

    return () => {
      const onUnmount = useActiveMeeting.getState();
      if (onUnmount.session?.code === code && !onUnmount.ended) {
        onUnmount.minimize();
      }
      if (onUnmount.ended?.code === code) {
        onUnmount.clearEnded();
      }
    };
  }, [code]);

  const proceedToRoom = useCallback(async () => {
    try {
      const joined = await meetingsApi.join(code);
      const lkToken = await livekitApi.token({ meetingCode: code });

      startSession({
        code,
        token: lkToken.token,
        serverUrl: lkToken.url,
        meeting: joined.meeting,
        audio: joinPrefs?.micEnabled ?? true,
        video: joinPrefs?.cameraEnabled ?? true,
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('toast.join-meeting-error');
      setError(message);
      toast.error(message);
    }
  }, [code, t, startSession, joinPrefs]);

  // Pre-join lookup. Skipped when a session for this code already exists (we
  // returned from the mini-player) or it just ended.
  useEffect(() => {
    if (!user || userLoading || hasActiveSession || isEnded) {
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

        const message = err instanceof ApiClientError ? err.message : t('toast.load-meeting-error');
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
  }, [code, router, user, userLoading, t, hasActiveSession, isEnded]);

  useEffect(() => {
    if (hasActiveSession || isEnded || !meeting || !user || error) {
      return;
    }

    if (user.id === meeting.hostId) {
      void proceedToRoom();
    }
  }, [meeting, user, error, proceedToRoom, hasActiveSession, isEnded]);

  const onGuestAdmitted = useCallback(() => {
    setGuestStage('admitted');
    void proceedToRoom();
  }, [proceedToRoom]);

  if (isEnded) {
    return <EndedView code={code} />;
  }

  if (hasActiveSession) {
    return <div className="h-[calc(100vh-3.5rem)]" aria-hidden />;
  }

  if (error) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (!meeting || !user) {
    return <Spinner />;
  }

  const isHost = user.id === meeting.hostId;

  if (!isHost && guestStage !== 'admitted') {
    return <WaitingRoom code={code} displayName={user.name} onAdmitted={onGuestAdmitted} />;
  }

  return <Spinner />;
}
