'use client';

import { Check, Clock, Copy, Globe, Lock, Mail, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ConversationMemberDto } from '@open-meet/types';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { usePublicUser } from '../hooks/use-chat';
import { formatPresenceLabel } from '../lib/presence';
import { useChatStore } from '../stores';
import { PresenceDot } from './presence-dot';

function formatJoinedDate(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function PeerProfilePanel({
  peer,
  locale,
}: {
  peer: ConversationMemberDto;
  locale: string;
}) {
  const t = useTranslations('chat');
  const { data, isLoading } = usePublicUser(peer.userId);
  const setInfoOpen = useChatStore((s) => s.setInfoOpen);
  const presence = useChatStore((s) => s.presenceByUser[peer.userId]);
  const [emailCopied, setEmailCopied] = useState(false);
  const copyResetRef = useRef<number | null>(null);

  const joined = formatJoinedDate(data?.joinedAt ?? null, locale);

  const presenceLabel = formatPresenceLabel(presence, t, { shortLastSeen: true });

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const copyEmail = async (email: string) => {
    if (!navigator.clipboard?.writeText) {
      toast.error(t('group.action-failed'));

      return;
    }

    try {
      await navigator.clipboard.writeText(email);

      setEmailCopied(true);

      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }

      copyResetRef.current = window.setTimeout(() => {
        setEmailCopied(false);

        copyResetRef.current = null;
      }, 1500);
    } catch {
      toast.error(t('group.action-failed'));
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex min-h-[61px] items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{t('info.title')}</p>
        <button
          type="button"
          onClick={() => setInfoOpen(false)}
          aria-label={t('info.close')}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-2 border-b border-border px-4 py-6 text-center">
          <div className="relative">
            <UserAvatar user={{ name: peer.name, avatar: peer.avatar }} size="xl" />
            <PresenceDot userId={peer.userId} className="absolute bottom-1 end-1" />
          </div>
          <p className="text-base font-semibold">{peer.name}</p>
          <p className="text-xs text-muted-foreground">{presenceLabel}</p>
          {data?.visibility !== 'PRIVATE' && data?.bio ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.bio}</p>
          ) : null}
        </div>

        {isLoading ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('info.loading')}</p>
        ) : !data ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {t('info.unavailable')}
          </p>
        ) : data.visibility === 'PRIVATE' ? (
          <div className="flex items-start gap-2 px-4 py-6">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t('info.private')}</p>
          </div>
        ) : (
          <dl className="space-y-3 px-4 py-4">
            {data.email ? (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">{t('info.email')}</dt>
                  <dd className="mt-0.5">
                    <button
                      type="button"
                      onClick={() => void copyEmail(data.email!)}
                      title={data.email}
                      className="flex w-full min-w-0 items-center gap-2 rounded-md text-left text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span className="min-w-0 flex-1 truncate">{data.email}</span>
                      {emailCopied ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </dd>
                </div>
              </div>
            ) : null}
            {data.timezone ? (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t('info.timezone')}
                  </dt>
                  <dd className="text-sm">{data.timezone}</dd>
                </div>
              </div>
            ) : null}
            {joined ? (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">{t('info.joined')}</dt>
                  <dd className="text-sm">{joined}</dd>
                </div>
              </div>
            ) : null}
          </dl>
        )}
      </div>
    </div>
  );
}
