'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { ChatMessageDto } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useDelayedFlag } from '@/lib/use-delayed-flag';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversations } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { useChatSocketContext } from './chat-socket-provider';
import { ConversationHeader } from './conversation-header';
import { ConversationInfoPanel } from './conversation-info-panel';
import { ConversationViewSkeleton } from './conversation-view-skeleton';
import { MessageComposer } from './message-composer';
import { MessageList } from './message-list';
import { TypingIndicator } from './typing-indicator';

export function ConversationView({ conversationId }: { conversationId: string }) {
  const t = useTranslations('chat');
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useConversations({ includeHidden: true });
  const setActive = useChatStore((s) => s.setActiveConversation);
  const infoOpen = useChatStore((s) => s.infoOpen);
  const { joinConversation } = useChatSocketContext();
  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null);

  const conversation = data?.items.find((c) => c.id === conversationId);
  const showSkeleton = useDelayedFlag(!conversation && isLoading);

  useEffect(() => {
    setActive(conversationId);

    joinConversation(conversationId);

    setReplyingTo(null);

    return () => setActive(null);
  }, [conversationId, setActive, joinConversation]);

  if (!conversation) {
    if (isLoading) {
      return showSkeleton ? <ConversationViewSkeleton /> : null;
    }

    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('view.not-found')}
      </div>
    );
  }

  const display = conversationDisplay(conversation, user?.id);
  const me = conversation.members.find((m) => m.userId === user?.id);
  const peerDisabled = !display.isGroup && (display.peer?.chatDisabled ?? false);
  const meDisabled = me?.chatDisabled ?? false;
  const canPost = !peerDisabled && !meDisabled;
  const disabledReason = meDisabled
    ? t('view.you-disabled')
    : peerDisabled
      ? t('view.peer-disabled')
      : undefined;

  return (
    <div className="flex h-full">
      <div
        className={cn(
          'flex h-full min-w-0 flex-1 flex-col bg-background',
          infoOpen ? 'hidden lg:flex' : 'flex',
        )}
      >
        <ConversationHeader conversation={conversation} currentUserId={user?.id} />
        <MessageList
          conversationId={conversationId}
          members={conversation.members}
          unreadCount={conversation.unreadCount}
          currentUserId={user?.id}
          canPost={canPost}
          isGroup={display.isGroup}
          onReply={setReplyingTo}
        />
        <TypingIndicator conversationId={conversationId} />
        <MessageComposer
          conversationId={conversationId}
          canPost={canPost}
          disabledReason={disabledReason}
          members={conversation.members}
          currentUserId={user?.id}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSent={() => undefined}
        />
      </div>

      {infoOpen ? (
        <aside className="w-full shrink-0 border-s border-border lg:w-80">
          <ConversationInfoPanel conversation={conversation} currentUserId={user?.id} />
        </aside>
      ) : null}
    </div>
  );
}
