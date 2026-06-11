'use client';

import { Star, StarOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { ScrollArea } from '@open-meet/ui/scroll-area';

import { formatTime } from '@/components/shared/chat';
import { useRouter } from '@/i18n/navigation';

import { useSaved, useToggleSave } from '../hooks/use-chat';
import { messagePreview } from './pinned-messages-panel';

export function StarredMessagesPanel({
  conversationId,
  isGroup,
  currentUserId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  isGroup: boolean;
  currentUserId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('chat');
  const router = useRouter();
  const { data } = useSaved();
  const save = useToggleSave(conversationId);

  const items = (data?.items ?? []).filter((item) => item.conversationId === conversationId);

  const openMessage = (messageId: string) => {
    onOpenChange(false);

    router.push(`/chat/${conversationId}?m=${messageId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="flex-row items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 text-muted-foreground" />
            {t('saved.view-chat')}
          </DialogTitle>
          <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {items.length}
          </span>
          <DialogDescription className="sr-only">{t('saved.subtitle')}</DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t('saved.chat-empty')}
          </p>
        ) : (
          <ScrollArea className="max-h-[min(70vh,28rem)]">
            <ul className="p-1.5">
              {items.map(({ message }) => {
                const preview = messagePreview(message, t('list.attachment'), t('bubble.deleted'));
                const sender = message.sender
                  ? message.sender.id === currentUserId
                    ? t('bubble.you')
                    : message.sender.name
                  : t('bubble.unknown-user');

                return (
                  <li key={message.id} className="group/star flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => openMessage(message.id)}
                      className="min-w-0 flex-1 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isGroup ? (
                          <span className="truncate text-[11px] font-semibold text-foreground">
                            {sender}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t('bubble.starred')}
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
                      onClick={() => save.mutate({ messageId: message.id, saved: true })}
                      aria-label={t('bubble.unsave-message')}
                      className="mt-1 h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/star:opacity-100"
                    >
                      <StarOff className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
