'use client';

import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';

import { UserAvatar } from '@open-meet/ui/user-avatar';

import { MessageContent, formatTime } from '@/components/shared/chat';
import { useRouter } from '@/i18n/navigation';

import type { SavedMessageDto } from '@open-meet/types';

import { useSaved } from '../hooks/use-chat';

/** Calendar-day bucket key (local time), e.g. "2026-06-02". */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** WhatsApp-style separator: Today / Yesterday / localized date. */
function formatDateSeparator(
  iso: string,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  const target = dayKey(iso);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (target === dayKey(now.toISOString())) {
    return todayLabel;
  }
  if (target === dayKey(yesterday.toISOString())) {
    return yesterdayLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function groupByDay(
  items: SavedMessageDto[],
): { key: string; iso: string; items: SavedMessageDto[] }[] {
  const groups: { key: string; iso: string; items: SavedMessageDto[] }[] = [];

  for (const item of items) {
    const key = dayKey(item.message.sentAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, iso: item.message.sentAt, items: [item] });
    }
  }

  return groups;
}

export function SavedView() {
  const t = useTranslations('chat');
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading } = useSaved();
  const items = data?.items ?? [];

  const groups = useMemo(() => groupByDay(items), [items]);

  return (
    <div className="min-h-full bg-card">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('list.loading')}</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title={t('saved.empty-title')}
            subtitle={t('saved.empty-subtitle')}
          />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="mb-2 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    {formatDateSeparator(group.iso, locale, t('saved.today'), t('saved.yesterday'))}
                  </span>
                </div>

                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.message.id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/chat/${item.conversationId}?m=${item.message.id}`)
                        }
                        className="block w-full rounded-xl border border-border bg-card p-4 text-start transition-colors hover:bg-muted/40"
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                          {item.message.sender ? (
                            <UserAvatar user={item.message.sender} size="xs" />
                          ) : null}
                          <span className="font-medium text-foreground">
                            {item.message.sender?.name ?? t('bubble.unknown-user')}
                          </span>
                          {item.conversationTitle ? <span>· {item.conversationTitle}</span> : null}
                          <Star className="h-3 w-3 shrink-0" />
                          <time className="ms-auto">{formatTime(item.message.sentAt)}</time>
                        </div>
                        <MessageContent
                          content={item.message.content}
                          className="text-sm text-muted-foreground"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
