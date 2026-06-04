'use client';

import {
  ArrowLeft,
  BarChart3,
  Eraser,
  Info,
  MoreVertical,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ConversationDto } from '@open-meet/types';

import { formatTime } from '@/components/shared/chat';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { useClearConversation, useCreatePoll, useDeleteConversation } from '../hooks/use-chat';
import { conversationDisplay } from '../lib/conversation-display';
import { formatPresenceLabel } from '../lib/presence';
import { useChatStore } from '../stores';
import { PollComposer } from './poll-composer';
import { PresenceDot } from './presence-dot';
import { StarredMessagesPanel } from './starred-messages-panel';

type ConfirmAction = 'clear' | 'delete';

export function ConversationHeader({
  conversation,
  currentUserId,
}: {
  conversation: ConversationDto;
  currentUserId: string | undefined;
}) {
  const t = useTranslations('chat');
  const router = useRouter();
  const clearConversation = useClearConversation();
  const deleteConversation = useDeleteConversation();
  const createPoll = useCreatePoll(conversation.id);
  const [pollOpen, setPollOpen] = useState(false);
  const [starredOpen, setStarredOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const display = conversationDisplay(conversation, currentUserId);
  const presence = useChatStore((s) =>
    display.peer ? s.presenceByUser[display.peer.userId] : undefined,
  );
  const toggleInfo = useChatStore((s) => s.toggleInfo);

  const handleApiError = (err: unknown, fallback: string) =>
    toast.error(err instanceof ApiClientError ? err.message : fallback);

  const subtitle = display.isGroup
    ? t('header.members', { count: conversation.members.length })
    : formatPresenceLabel(presence, t, {
        formattedLastSeen: presence?.lastSeen ? formatTime(presence.lastSeen) : undefined,
      });

  const clearChat = () => {
    clearConversation.mutate(conversation.id, {
      onSuccess: () => {
        setConfirmAction(null);
        toast.success(t('header.clear-confirmed'));
      },
      onError: (err) => handleApiError(err, t('group.action-failed')),
    });
  };

  const deleteChat = () => {
    deleteConversation.mutate(conversation.id, {
      onSuccess: () => {
        setConfirmAction(null);
        router.push('/chat');
        toast.success(t('header.delete-confirmed'));
      },
      onError: (err) => handleApiError(err, t('group.action-failed')),
    });
  };

  const confirmDialog =
    confirmAction === 'clear'
      ? {
          title: t('header.clear-confirm-title'),
          description: t('header.clear-confirm-description'),
          actionLabel: t('header.clear'),
          pending: clearConversation.isPending,
          onConfirm: clearChat,
        }
      : confirmAction === 'delete'
        ? {
            title: t('header.delete-confirm-title'),
            description: t('header.delete-confirm-description'),
            actionLabel: t('header.delete'),
            pending: deleteConversation.isPending,
            onConfirm: deleteChat,
          }
        : null;

  const closeConfirm = () => {
    if (confirmDialog?.pending) {
      return;
    }

    setConfirmAction(null);
  };

  return (
    <header className="flex min-h-[61px] items-center gap-3 border-b border-border px-4 py-3">
      <Link
        href="/chat"
        aria-label={t('view.back')}
        className="-ms-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <button
        type="button"
        onClick={toggleInfo}
        aria-label={t('header.info')}
        className="-mx-2 -my-1 me-auto flex min-w-0 items-center gap-3 rounded-md px-2 py-1 text-start transition-transform duration-100 hover:bg-muted active:scale-[0.98]"
      >
        <div className="relative">
          {display.isGroup ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-4 w-4" />
            </span>
          ) : (
            <UserAvatar user={{ name: display.title || '?', avatar: display.avatar }} size="sm" />
          )}
          {!display.isGroup && display.peer ? (
            <PresenceDot userId={display.peer.userId} className="absolute -bottom-0.5 -end-0.5" />
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{display.title || t('list.untitled')}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('header.actions')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={toggleInfo}>
            <Info className="me-2 h-4 w-4" />
            {t('header.info')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setStarredOpen(true)}>
            <Star className="me-2 h-4 w-4" />
            {t('saved.view-chat')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPollOpen(true)}>
            <BarChart3 className="me-2 h-4 w-4" />
            {t('poll.create')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setConfirmAction('clear')}
            disabled={clearConversation.isPending}
          >
            <Eraser className="me-2 h-4 w-4" />
            {t('header.clear')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmAction('delete')}
            disabled={deleteConversation.isPending}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="me-2 h-4 w-4" />
            {t('header.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StarredMessagesPanel
        conversationId={conversation.id}
        isGroup={display.isGroup}
        currentUserId={currentUserId}
        open={starredOpen}
        onOpenChange={setStarredOpen}
      />

      <PollComposer
        open={pollOpen}
        onOpenChange={setPollOpen}
        pending={createPoll.isPending}
        onCreate={(poll) => {
          createPoll.mutate(poll, {
            onSuccess: () => setPollOpen(false),
            onError: (err) =>
              toast.error(err instanceof ApiClientError ? err.message : t('composer.poll-failed')),
          });
        }}
      />

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => (!open ? closeConfirm() : null)}
      >
        {confirmDialog ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={closeConfirm} disabled={confirmDialog.pending}>
                {t('group.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDialog.onConfirm}
                disabled={confirmDialog.pending}
              >
                {confirmDialog.actionLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </header>
  );
}
