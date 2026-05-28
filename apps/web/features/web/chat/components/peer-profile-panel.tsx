'use client';

import { Clock, Globe, Lock, Mail, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ConversationMemberDto } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { usePublicUser } from '../hooks/use-chat';
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

  const joined = formatJoinedDate(data?.joinedAt ?? null, locale);

  const presenceLabel = presence?.online
    ? t('presence.online')
    : presence?.lastSeen
      ? t('presence.last-seen-short')
      : t('presence.offline');

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
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
        </div>

        {isLoading ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {t('info.loading')}
          </p>
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
            {data.bio ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('info.bio')}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">{data.bio}</dd>
              </div>
            ) : null}
            {data.email ? (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">{t('info.email')}</dt>
                  <dd className="truncate text-sm">{data.email}</dd>
                </div>
              </div>
            ) : null}
            {data.timezone ? (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">{t('info.timezone')}</dt>
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

      <footer className="border-t border-border p-3">
        <Button variant="ghost" className="w-full" disabled>
          {t('info.view-profile')}
        </Button>
      </footer>
    </div>
  );
}
