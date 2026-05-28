'use client';

import { AtSign } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@open-meet/ui/user-avatar';

import { MessageContent, formatTime } from '@/components/shared/chat';
import { Link } from '@/i18n/navigation';

import { useActivity } from '../hooks/use-chat';

export function ActivityView() {
  const t = useTranslations('chat');
  const { data, isLoading } = useActivity();
  const items = data?.items ?? [];

  return (
    <div className="min-h-full bg-card">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
          <AtSign className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">{t('activity.title')}</h1>
          <p className="truncate text-xs text-muted-foreground">{t('activity.subtitle')}</p>
        </div>
        {items.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('list.loading')}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AtSign className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">{t('activity.empty-title')}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {t('activity.empty-subtitle')}
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.message.id}>
                <Link
                  href={`/chat/${item.conversationId}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <AtSign className="h-3 w-3" />
                    </span>
                    {item.message.sender ? (
                      <UserAvatar user={item.message.sender} size="xs" />
                    ) : null}
                    <span className="font-medium text-foreground">
                      {item.message.sender?.name ?? t('bubble.unknown-user')}
                    </span>
                    {item.conversationTitle ? <span>· {item.conversationTitle}</span> : null}
                    <time className="ms-auto">{formatTime(item.message.sentAt)}</time>
                  </div>
                  <MessageContent
                    content={item.message.content}
                    className="text-sm text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
