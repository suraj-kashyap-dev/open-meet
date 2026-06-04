'use client';

import { BellOff, Eye, EyeOff, MailMinus, MoreHorizontal, Pin, PinOff, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@open-meet/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ConversationDto } from '@open-meet/types';

import { formatTime, previewText } from '@/components/shared/chat';
import { Link } from '@/i18n/navigation';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversationState } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { PresenceDot } from './presence-dot';

export function ConversationListItem({
  conversation,
  currentUserId,
  active,
  onNavigate,
}: {
  conversation: ConversationDto;
  currentUserId: string | undefined;
  active: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations('chat');
  const display = conversationDisplay(conversation, currentUserId);
  const unread = useChatStore((s) => s.unreadByConversation[conversation.id] ?? 0);
  const state = useConversationState();

  const last = conversation.lastMessage;
  const preview = last
    ? last.deletedAt
      ? t('bubble.deleted')
      : previewText(last.content) || t('list.attachment')
    : t('list.no-messages');

  const setState = (next: Parameters<typeof state.mutate>[0]['state']) =>
    state.mutate({ conversationId: conversation.id, state: next });

  const hide = () => {
    setState({ hidden: true });
    toast(t('list.hide-confirmed'), {
      action: {
        label: t('list.hide-undo'),
        onClick: () => setState({ hidden: false }),
      },
    });
  };

  // Cast keeps us decoupled from the @open-meet/types build cadence; the field
  // is present in source (ConversationDto.hidden: boolean) once rebuilt.
  const isHidden = (conversation as ConversationDto & { hidden?: boolean }).hidden ?? false;

  return (
    <div
      className={cn(
        'group relative flex items-center rounded-2xl border border-transparent transition-all',
        active
          ? 'border-border/70 bg-muted/80 shadow-sm'
          : 'hover:border-border/60 hover:bg-muted/50',
        isHidden && 'opacity-60',
      )}
    >
      <Link
        href={`/chat/${conversation.id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5"
      >
        <div className="relative shrink-0">
          {display.isGroup ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
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
              {conversation.pinned ? (
                <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : null}
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
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-semibold leading-none text-background">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('list.actions')}
          className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
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
          {isHidden ? (
            <DropdownMenuItem onSelect={() => setState({ hidden: false })}>
              <Eye className="me-2 h-4 w-4" />
              {t('list.unhide')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={hide}>
              <EyeOff className="me-2 h-4 w-4" />
              {t('list.hide')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
