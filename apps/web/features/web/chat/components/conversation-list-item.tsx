'use client';

import { BellOff, EyeOff, MailMinus, MoreHorizontal, Pin, PinOff, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@open-meet/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ConversationDto } from '@open-meet/types';

import { formatTime } from '@/components/shared/chat';
import { Link } from '@/i18n/navigation';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversationState } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { PresenceDot } from './presence-dot';

export function ConversationListItem({
  conversation,
  currentUserId,
  active,
}: {
  conversation: ConversationDto;
  currentUserId: string | undefined;
  active: boolean;
}) {
  const t = useTranslations('chat');
  const display = conversationDisplay(conversation, currentUserId);
  const unread = useChatStore((s) => s.unreadByConversation[conversation.id] ?? 0);
  const state = useConversationState();

  const last = conversation.lastMessage;
  const preview = last
    ? last.deletedAt
      ? t('bubble.deleted')
      : last.content || t('list.attachment')
    : t('list.no-messages');

  const setState = (next: Parameters<typeof state.mutate>[0]['state']) =>
    state.mutate({ conversationId: conversation.id, state: next });

  return (
    <div
      className={cn(
        'group relative flex items-center rounded-lg transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/60',
      )}
    >
      <Link href={`/chat/${conversation.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
        <div className="relative shrink-0">
          {display.isGroup ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </span>
          ) : (
            <UserAvatar user={{ name: display.title || '?', avatar: display.avatar }} size="md" />
          )}
          {!display.isGroup && display.peer ? (
            <PresenceDot userId={display.peer.userId} className="absolute -bottom-0.5 -end-0.5" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
              {conversation.pinned ? <Pin className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
              <span className="truncate">{display.title || t('list.untitled')}</span>
              {conversation.muted ? (
                <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : null}
            </span>
            {conversation.lastMessageAt ? (
              <time className="shrink-0 text-[10px] text-muted-foreground">
                {formatTime(conversation.lastMessageAt)}
              </time>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">{preview}</span>
            {unread > 0 ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('list.actions')}
          className="absolute end-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setState({ pinned: !conversation.pinned })}>
            {conversation.pinned ? (
              <PinOff className="me-2 h-4 w-4" />
            ) : (
              <Pin className="me-2 h-4 w-4" />
            )}
            {conversation.pinned ? t('list.unpin-chat') : t('list.pin-chat')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setState({ muted: !conversation.muted })}>
            <BellOff className="me-2 h-4 w-4" />
            {conversation.muted ? t('list.unmute') : t('list.mute')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setState({ manualUnread: true })}>
            <MailMinus className="me-2 h-4 w-4" />
            {t('list.mark-unread')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setState({ hidden: true })}>
            <EyeOff className="me-2 h-4 w-4" />
            {t('list.hide')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
