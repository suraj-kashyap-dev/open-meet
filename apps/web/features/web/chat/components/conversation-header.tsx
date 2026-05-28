'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Eraser, Info, MoreVertical, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

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

import { chatKeys, useConversationState, useCreatePoll } from '../hooks/use-chat';
import { conversationDisplay } from '../lib/conversation-display';
import { useChatStore } from '../stores';
import { PollComposer } from './poll-composer';
import { PresenceDot } from './presence-dot';

type MessagesCache = {
  pages: { items: unknown[]; nextCursor: string | null }[];
  pageParams: unknown[];
};

export function ConversationHeader({
  conversation,
  currentUserId,
}: {
  conversation: ConversationDto;
  currentUserId: string | undefined;
}) {
  const t = useTranslations('chat');
  const qc = useQueryClient();
  const router = useRouter();
  const state = useConversationState();
  const createPoll = useCreatePoll(conversation.id);
  const [pollOpen, setPollOpen] = useState(false);

  const display = conversationDisplay(conversation, currentUserId);
  const presence = useChatStore((s) =>
    display.peer ? s.presenceByUser[display.peer.userId] : undefined,
  );
  const infoOpen = useChatStore((s) => s.infoOpen);
  const toggleInfo = useChatStore((s) => s.toggleInfo);

  const subtitle = display.isGroup
    ? t('header.members', { count: conversation.members.length })
    : presence?.online
      ? t('presence.online')
      : presence?.lastSeen
        ? t('presence.last-seen', { time: formatTime(presence.lastSeen) })
        : t('presence.offline');

  const clearChat = () => {
    qc.setQueryData<MessagesCache>(chatKeys.messages(conversation.id), () => ({
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    }));
    toast(t('header.clear-confirmed'));
  };

  const deleteChat = () => {
    state.mutate(
      { conversationId: conversation.id, state: { hidden: true } },
      {
        onSuccess: () => {
          router.push('/chat');
          toast(t('header.delete-confirmed'), {
            action: {
              label: t('list.hide-undo'),
              onClick: () =>
                state.mutate({ conversationId: conversation.id, state: { hidden: false } }),
            },
          });
        },
      },
    );
  };

  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link
        href="/chat"
        aria-label={t('view.back')}
        className="-ms-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

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

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{display.title || t('list.untitled')}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={toggleInfo}
        aria-label={t('header.info')}
        aria-pressed={infoOpen}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
      >
        <Info className="h-4 w-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('header.actions')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setPollOpen(true)}>
            <BarChart3 className="me-2 h-4 w-4" />
            {t('poll.create')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={clearChat}>
            <Eraser className="me-2 h-4 w-4" />
            {t('header.clear')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={deleteChat}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="me-2 h-4 w-4" />
            {t('header.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </header>
  );
}
