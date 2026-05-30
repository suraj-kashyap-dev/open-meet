'use client';

import { useTranslations } from 'next-intl';

import { useChatStore } from '../stores';

const STALE_MS = 6000;

export function TypingIndicator({ conversationId }: { conversationId: string }) {
  const t = useTranslations('chat');
  const typing = useChatStore((s) => s.typingByConversation[conversationId]);

  const names = typing
    ? Object.values(typing)
        .filter((entry) => Date.now() - entry.at < STALE_MS)
        .map((entry) => entry.name)
    : [];

  if (names.length === 0) {
    return null;
  }

  const label =
    names.length === 1
      ? t('typing.one', { name: names[0]! })
      : t('typing.many', { count: names.length });

  return (
    <div className="flex items-center gap-1.5 px-4 pb-1 text-xs text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" />
      </span>
      {label}
    </div>
  );
}
