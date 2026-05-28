'use client';

import { ArrowLeft, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ConversationDto } from '@open-meet/types';

import { formatTime } from '@/components/shared/chat';
import { Link } from '@/i18n/navigation';

import { conversationDisplay } from '../lib/conversation-display';
import { useChatStore } from '../stores';
import { PresenceDot } from './presence-dot';

export function ConversationHeader({
  conversation,
  currentUserId,
}: {
  conversation: ConversationDto;
  currentUserId: string | undefined;
}) {
  const t = useTranslations('chat');
  const display = conversationDisplay(conversation, currentUserId);
  const presence = useChatStore((s) =>
    display.peer ? s.presenceByUser[display.peer.userId] : undefined,
  );

  const subtitle = display.isGroup
    ? t('header.members', { count: conversation.members.length })
    : presence?.online
      ? t('presence.online')
      : presence?.lastSeen
        ? t('presence.last-seen', { time: formatTime(presence.lastSeen) })
        : t('presence.offline');

  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link
        href="/chat"
        aria-label={t('view.back')}
        className="-ms-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
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

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{display.title || t('list.untitled')}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}
