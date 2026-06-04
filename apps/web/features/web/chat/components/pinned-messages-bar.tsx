'use client';

import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { cn } from '@open-meet/ui/cn';

import type { ChatMessageDto } from '@open-meet/types';

import { messagePreview, PinnedMessagesPanel } from './pinned-messages-panel';

const MAX_SEGMENTS = 5;

export function PinnedMessagesBar({
  items,
  currentUserId,
  isGroup,
  onOpenMessage,
  onUnpin,
}: {
  items: ChatMessageDto[];
  currentUserId: string | undefined;
  isGroup: boolean;
  onOpenMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}) {
  const t = useTranslations('chat');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, items[0]?.id]);

  if (items.length === 0) {
    return null;
  }

  const multiple = items.length > 1;
  const clampedIndex = Math.min(activeIndex, items.length - 1);
  const active = items[clampedIndex]!;
  const senderLabel = active.sender
    ? active.sender.id === currentUserId
      ? t('bubble.you')
      : active.sender.name
    : t('bubble.unknown-user');
  const preview = messagePreview(active, t('list.attachment'), t('bubble.deleted'));

  const cycle = () => {
    onOpenMessage(active.id);
    if (multiple) {
      setActiveIndex((clampedIndex + 1) % items.length);
    }
  };

  const segmentCount = Math.min(items.length, MAX_SEGMENTS);
  const activeSegment = Math.min(clampedIndex, segmentCount - 1);

  return (
    <div className="border-b border-border/60 bg-background/95 px-3 py-1.5 backdrop-blur-sm">
      <div className="flex items-stretch overflow-hidden rounded-xl border border-border/60 bg-card/60">
        <span className="relative flex shrink-0 items-center gap-2 bg-accent/8 px-3 text-accent">
          <span className="flex h-8 w-1 flex-col gap-0.5" aria-hidden="true">
            {Array.from({ length: segmentCount }).map((_, index) => (
              <span
                key={index}
                data-testid="pin-segment"
                data-active={index === activeSegment}
                className={cn(
                  'flex-1 rounded-full transition-colors duration-300',
                  index === activeSegment ? 'bg-accent' : 'bg-accent/25',
                )}
              />
            ))}
          </span>
          <Pin className="h-4 w-4" />
        </span>

        <button
          type="button"
          onClick={cycle}
          aria-label={`${t('bubble.pinned')}: ${preview}`}
          className="min-w-0 flex-1 px-3 py-2 text-start transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            <span>{t('bubble.pinned')}</span>
            {multiple ? (
              <span className="rounded-full border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                {clampedIndex + 1}/{items.length}
              </span>
            ) : null}
          </div>
          <div key={active.id} className="chat-pin-swap">
            {isGroup ? (
              <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
                {senderLabel}
              </p>
            ) : null}
            <p className="mt-0.5 truncate text-sm font-medium leading-5 text-foreground">
              {preview}
            </p>
          </div>
        </button>

        {multiple ? (
          <div className="flex shrink-0 items-center border-s border-border/70 bg-muted/30 px-1.5">
            <PinnedMessagesPanel
              items={items}
              currentUserId={currentUserId}
              isGroup={isGroup}
              onOpenMessage={onOpenMessage}
              onUnpin={onUnpin}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
