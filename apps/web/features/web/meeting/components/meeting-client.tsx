'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { MeetingDto } from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { consumeJoinPreferences } from '@/features/web/lobby/lib/join-preferences';
import {
  clearGuestSession,
  getGuestSession,
  viewerFromGuest,
  viewerFromUser,
} from '@/features/web/meeting/lib/guest-session';
import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';
import { livekitApi } from '@/features/web/meeting/services/livekit';
import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useActiveMeeting } from '@/features/web/meeting/stores';
import { EndedView } from './ended-view';
import { WaitingRoom } from './waiting-room';

type GuestStage = 'lookup' | 'knocking' | 'admitted';

const Spinner = () => (
  <main className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
  </main>
);

export function MeetingClient({ code }: { code: string }) {
  const t = useTranslations('meeting');
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const guestSession = useMemo(() => getGuestSession(code), [code]);
  const viewer = useMemo(
    () => (user ? viewerFromUser(user) : guestSession ? viewerFromGuest(guestSession) : null),
    [guestSession, user],
  );

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
    if (!viewer) {
      return;
    }

    try {
      const joined = await meetingsApi.join(code, guestSession?.token);
      const lkToken = await livekitApi.token({ meetingCode: code }, guestSession?.token);

      startSession({
        code,
        token: lkToken.token,
        serverUrl: lkToken.url,
        meeting: joined.meeting,
        audio: joinPrefs?.micEnabled ?? true,
        video: joinPrefs?.cameraEnabled ?? true,
        viewer,
        authToken: guestSession?.token ?? null,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 401 && guestSession) {
        clearGuestSession(code);

        router.replace(`/${code}/lobby`);

        return;
      }

      const message = err instanceof ApiClientError ? err.message : t('toast.join-meeting-error');

      setError(message);

      toast.error(message);
    }
  }, [code, guestSession, joinPrefs, router, startSession, t, viewer]);

  useEffect(() => {
    if (!userLoading && !viewer && !hasActiveSession && !isEnded) {
      router.replace(`/${code}/lobby`);
    }
  }, [code, hasActiveSession, isEnded, router, userLoading, viewer]);

  useEffect(() => {
    if (!viewer || userLoading || hasActiveSession || isEnded) {
      return;
    }

    const currentViewer = viewer;
    let cancelled = false;

    async function lookup() {
      try {
        const m = await meetingsApi.get(code);

        if (cancelled) {
          return;
        }

        setMeeting(m);

        if (currentViewer.id !== m.hostId) {
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
  }, [code, router, t, userLoading, viewer, hasActiveSession, isEnded]);

  useEffect(() => {
    if (hasActiveSession || isEnded || !meeting || !viewer || error) {
      return;
    }

    if (viewer.id === meeting.hostId) {
      void proceedToRoom();
    }
  }, [meeting, viewer, error, proceedToRoom, hasActiveSession, isEnded]);

  const onGuestAdmitted = useCallback(() => {
    setGuestStage('admitted');

    void proceedToRoom();
  }, [proceedToRoom]);

  if (isEnded) {
    return <EndedView code={code} />;
  }

  if (hasActiveSession) {
    return <div className="h-screen" aria-hidden />;
  }

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (!meeting || !viewer) {
    return <Spinner />;
  }

  const isHost = viewer.id === meeting.hostId;

  if (!isHost && guestStage !== 'admitted') {
    return (
      <WaitingRoom
        code={code}
        displayName={viewer.name}
        authToken={guestSession?.token}
        onAdmitted={onGuestAdmitted}
      />
    );
  }

  return <Spinner />;
}
