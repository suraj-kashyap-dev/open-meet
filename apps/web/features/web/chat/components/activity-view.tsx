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
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
        <AtSign className="h-5 w-5" />
        {t('activity.title')}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">{t('activity.subtitle')}</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('list.loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('activity.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.message.id}>
              <Link
                href={`/chat/${item.conversationId}`}
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {item.message.sender ? (
                    <UserAvatar user={item.message.sender} size="xs" />
                  ) : null}
                  <span className="font-medium text-foreground">
                    {item.message.sender?.name ?? t('bubble.unknown-user')}
                  </span>
                  {item.conversationTitle ? <span>· {item.conversationTitle}</span> : null}
                  <time className="ms-auto">{formatTime(item.message.sentAt)}</time>
                </div>
                <MessageContent content={item.message.content} className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
