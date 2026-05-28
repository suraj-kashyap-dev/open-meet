'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { ChatMessageDto } from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversations } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { useChatSocketContext } from './chat-socket-provider';
import { ConversationHeader } from './conversation-header';
import { MessageComposer } from './message-composer';
import { MessageList } from './message-list';
import { TypingIndicator } from './typing-indicator';

export function ConversationView({ conversationId }: { conversationId: string }) {
  const t = useTranslations('chat');
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useConversations();
  const setActive = useChatStore((s) => s.setActiveConversation);
  const { joinConversation } = useChatSocketContext();
  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null);

  const conversation = data?.items.find((c) => c.id === conversationId);

  useEffect(() => {
    setActive(conversationId);
    joinConversation(conversationId);
    setReplyingTo(null);
    return () => setActive(null);
  }, [conversationId, setActive, joinConversation]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {isLoading ? t('view.loading') : t('view.not-found')}
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
    <div className="flex h-full flex-col bg-card">
      <ConversationHeader conversation={conversation} currentUserId={user?.id} />
      <MessageList
        conversationId={conversationId}
        members={conversation.members}
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
  );
}
