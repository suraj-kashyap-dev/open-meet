'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  ClientEvent,
  KnockDenyReason,
  ServerEvent,
  type KnockResolvedPayload,
} from '@open-meet/types';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { useMeetingSocket } from '@/features/web/meeting/hooks/use-socket';
import { Link, useRouter } from '@/i18n/navigation';

type Status = 'connecting' | 'waiting' | 'awaiting-host' | 'denied';

const RETRY_INTERVAL_MS = 5000;

interface Props {
  code: string;
  displayName: string;
  authToken?: string | null;
  onAdmitted: () => void;
}

export function WaitingRoom({ code, displayName, authToken, onAdmitted }: Props) {
  const t = useTranslations('meeting');
  const router = useRouter();
  const { socket } = useMeetingSocket(true, authToken);
  const [status, setStatus] = useState<Status>('connecting');
  const knockSentRef = useRef(false);
  const admittedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const sendKnock = () => {
      knockSentRef.current = true;
      socket.emit(ClientEvent.MEETING_KNOCK, { meetingCode: code });
      setStatus((prev) => (prev === 'awaiting-host' ? 'awaiting-host' : 'waiting'));
    };

    const scheduleRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      retryTimerRef.current = setTimeout(() => {
        if (admittedRef.current || !socket.connected) {
          return;
        }

        sendKnock();
      }, RETRY_INTERVAL_MS);
    };

    const onResolved = (payload: KnockResolvedPayload) => {
      if (payload.admit) {
        admittedRef.current = true;

        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }

        toast.success(t('waiting.toast-admitted'));
        onAdmitted();
        return;
      }

      if (
        payload.reason === KnockDenyReason.NO_HOST_PRESENT ||
        payload.reason === KnockDenyReason.HOST_LEFT
      ) {
        setStatus('awaiting-host');
        scheduleRetry();
        return;
      }

      setStatus('denied');
      toast.error(t('waiting.toast-declined'));
      setTimeout(() => router.replace('/'), 1800);
    };

    if (socket.connected) {
      sendKnock();
    } else {
      socket.once('connect', sendKnock);
    }

    socket.on(ServerEvent.KNOCK_RESOLVED, onResolved);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      socket.off('connect', sendKnock);
      socket.off(ServerEvent.KNOCK_RESOLVED, onResolved);

      if (!admittedRef.current && knockSentRef.current && socket.connected) {
        socket.emit(ClientEvent.MEETING_KNOCK_CANCEL, { meetingCode: code });
      }
    };
  }, [socket, code, onAdmitted, router, t]);

  const cancel = () => {
    router.replace('/');
  };

  const heading =
    status === 'denied'
      ? t('waiting.heading-denied')
      : status === 'awaiting-host'
        ? t('waiting.heading-awaiting-host')
        : t('waiting.heading-asking');

  const subline =
    status === 'denied'
      ? t('waiting.subline-denied')
      : status === 'awaiting-host'
        ? t('waiting.subline-awaiting-host')
        : t('waiting.subline-asking');

  const statusText =
    status === 'connecting'
      ? t('waiting.status-connecting')
      : status === 'awaiting-host'
        ? t('waiting.status-awaiting-host')
        : t('waiting.status-waiting');

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 spotlight opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop opacity-50" />

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex flex-col items-center gap-4">
          <UserAvatar user={{ name: displayName }} size="4xl" />

          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
            <p className="text-sm text-muted-foreground">{subline}</p>
          </div>

          {status !== 'denied' ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {statusText}
            </div>
          ) : null}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={cancel} disabled={status === 'denied'}>
              <ArrowLeft className="h-4 w-4" />
              {t('waiting.cancel')}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">{t('waiting.back-to-home')}</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {t('waiting.meeting-code')} <span className="font-mono text-foreground">{code}</span>
        </p>
      </div>
    </main>
  );
}
