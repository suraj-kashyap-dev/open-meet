'use client';

import { ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@open-meet/ui/button';

import type { ChatMessageDto } from '@open-meet/types';

import { previewText } from '@/components/shared/chat';

function messagePreview(message: ChatMessageDto, attachmentLabel: string, deletedLabel: string) {
  if (message.deletedAt) {
    return deletedLabel;
  }

  if (message.poll?.question) {
    return message.poll.question;
  }

  const preview = previewText(message.content);

  if (preview.length > 0) {
    return preview;
  }

  if (message.attachments.length > 0) {
    return attachmentLabel;
  }

  return attachmentLabel;
}

export function PinnedMessagesBar({
  items,
  currentUserId,
  isGroup,
  onOpenMessage,
}: {
  items: ChatMessageDto[];
  currentUserId: string | undefined;
  isGroup: boolean;
  onOpenMessage: (messageId: string) => void;
}) {
  const t = useTranslations('chat');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, items[0]?.id]);

  if (items.length === 0) {
    return null;
  }

  const clampedIndex = Math.min(activeIndex, items.length - 1);
  const active = items[clampedIndex]!;
  const senderLabel = active.sender
    ? active.sender.id === currentUserId
      ? t('bubble.you')
      : active.sender.name
    : t('bubble.unknown-user');
  const preview = messagePreview(active, t('list.attachment'), t('bubble.deleted'));

  return (
    <div className="border-b border-border/80 bg-background/90 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_14px_30px_-26px_rgba(0,0,0,0.45)]">
        <span className="relative flex shrink-0 items-center justify-center bg-accent/8 px-3 text-accent">
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-accent/80" />
          <Pin className="h-4 w-4" />
        </span>

        <button
          type="button"
          onClick={() => onOpenMessage(active.id)}
          aria-label={`${t('bubble.pinned')}: ${preview}`}
          className="min-w-0 flex-1 px-3 py-2.5 text-start transition-colors hover:bg-muted/35"
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            <span>{t('bubble.pinned')}</span>
            {items.length > 1 ? (
              <span className="rounded-full border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                {clampedIndex + 1}/{items.length}
              </span>
            ) : null}
          </div>
          {isGroup ? (
            <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
              {senderLabel}
            </p>
          ) : null}
          <p className="mt-0.5 truncate text-sm font-medium leading-5 text-foreground">
            {preview}
          </p>
        </button>

        {items.length > 1 ? (
          <div className="flex shrink-0 items-center gap-1 border-s border-border/70 bg-muted/30 px-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActiveIndex((clampedIndex - 1 + items.length) % items.length)}
              aria-label={t('pins.previous')}
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActiveIndex((clampedIndex + 1) % items.length)}
              aria-label={t('pins.next')}
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
