'use client';

import { ListTree, PinOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@open-meet/ui/popover';
import { ScrollArea } from '@open-meet/ui/scroll-area';

import type { ChatMessageDto } from '@open-meet/types';

import { formatTime, previewText } from '@/components/shared/chat';

/** One-line preview for a pinned message, shared by the bar and this panel. */
export function messagePreview(
  message: ChatMessageDto,
  attachmentLabel: string,
  deletedLabel: string,
) {
  if (message.deletedAt) {
    return deletedLabel;
  }

  if (message.poll?.question) {
    return message.poll.question;
  }

  const preview = previewText(message.content);

  return preview.length > 0 ? preview : attachmentLabel;
}

function senderLabel(
  message: ChatMessageDto,
  currentUserId: string | undefined,
  youLabel: string,
  unknownLabel: string,
) {
  if (!message.sender) {
    return unknownLabel;
  }

  return message.sender.id === currentUserId ? youLabel : message.sender.name;
}

export function PinnedMessagesPanel({
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
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('pins.view-all')}
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <ListTree className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        data-testid="pinned-panel"
        className="w-80 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {t('pins.title')}
          </p>
          <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">{t('pins.empty')}</p>
        ) : (
          <ScrollArea className="max-h-[min(60vh,22rem)]">
            <ul className="p-1.5">
              {items.map((message) => {
                const preview = messagePreview(message, t('list.attachment'), t('bubble.deleted'));
                const sender = senderLabel(
                  message,
                  currentUserId,
                  t('bubble.you'),
                  t('bubble.unknown-user'),
                );

                return (
                  <li key={message.id} className="group/pin flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenMessage(message.id);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isGroup ? (
                          <span className="truncate text-[11px] font-semibold text-foreground">
                            {sender}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t('bubble.pinned')}
                          </span>
                        )}
                        <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {formatTime(message.sentAt)}
                        </time>
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-sm leading-5 text-foreground',
                          message.deletedAt ? 'italic text-muted-foreground' : null,
                        )}
                      >
                        {preview}
                      </p>
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onUnpin(message.id)}
                      aria-label={t('bubble.unpin')}
                      className="mt-1 h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/pin:opacity-100"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
