'use client';

import { ArrowDown, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@open-meet/ui/button';

import type { ChatMessageDto, ConversationMemberDto } from '@open-meet/types';

import { buildMessageRows } from '@/components/shared/chat';
import { usePathname, useRouter } from '@/i18n/navigation';

import { ForwardDialog } from './forward-dialog';
import { MessageBubble } from './message-bubble';
import { MessageListSkeleton } from './message-list-skeleton';
import { PinnedMessagesBar } from './pinned-messages-bar';
import {
  useConversationMessages,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  usePollVote,
  usePins,
  useToggleReaction,
  useTogglePin,
  useToggleSave,
} from '../hooks/use-chat';
import { flattenMessages } from '../lib/message-cache';
import { useFormatSize } from '../lib/use-format-size';

export function MessageList({
  conversationId,
  members,
  currentUserId,
  canPost,
  isGroup,
  onReply,
}: {
  conversationId: string;
  members: ConversationMemberDto[];
  currentUserId: string | undefined;
  canPost: boolean;
  isGroup: boolean;
  onReply: (message: ChatMessageDto) => void;
}) {
  const t = useTranslations('chat');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const targetMessageId = searchParams.get('m');
  const query = useConversationMessages(conversationId);
  const pins = usePins(conversationId);
  const formatSize = useFormatSize();
  const fetchNextPage = query.fetchNextPage;
  const hasNextPage = query.hasNextPage;
  const isFetchingNextPage = query.isFetchingNextPage;

  const react = useToggleReaction(conversationId);
  const edit = useEditMessage(conversationId);
  const del = useDeleteMessage(conversationId);
  const vote = usePollVote(conversationId);
  const markRead = useMarkRead(conversationId);
  const pin = useTogglePin(conversationId);
  const save = useToggleSave(conversationId);
  const [forwarding, setForwarding] = useState<ChatMessageDto | null>(null);

  const messages = useMemo(() => flattenMessages(query.data), [query.data]);
  const rows = useMemo(() => buildMessageRows(messages, currentUserId), [messages, currentUserId]);

  const lastOwnId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.sender?.id === currentUserId) {
        return messages[i]!.id;
      }
    }
    return null;
  }, [messages, currentUserId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const restoringRef = useRef<number | null>(null);
  const lastMarkedRef = useRef<string | null>(null);
  const highlightNonceRef = useRef(0);
  const handledJumpRef = useRef<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<{ id: string; nonce: number } | null>(null);

  const isPinned = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 64;
  }, []);

  // Anchor the viewport: restore position after loading older messages, or
  // stick to the bottom when a new message arrives while pinned.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (restoringRef.current !== null) {
      el.scrollTop = el.scrollHeight - restoringRef.current;
      restoringRef.current = null;
      return;
    }

    if (pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [messages.length]);

  const markReadMutate = markRead.mutate;

  // Mark read when the newest message is visible (pinned) and it isn't ours.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || !pinnedRef.current) return;
    if (last.id === lastMarkedRef.current) return;
    lastMarkedRef.current = last.id;
    markReadMutate(undefined);
  }, [messages, markReadMutate]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    pinnedRef.current = isPinned();
    if (pinnedRef.current) {
      setShowJump(false);
    }

    if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      restoringRef.current = el.scrollHeight - el.scrollTop;
      void fetchNextPage();
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    pinnedRef.current = true;
    setShowJump(false);
  };

  const revealMessage = useCallback((id: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-mid="${id}"]`);

    if (!el) {
      return false;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightNonceRef.current += 1;
    setHighlighted({ id, nonce: highlightNonceRef.current });
    return true;
  }, []);

  useEffect(() => {
    if (!highlighted) {
      return;
    }

    const timeout = window.setTimeout(() => setHighlighted(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [highlighted]);

  useEffect(() => {
    if (!pendingJumpId) {
      return;
    }

    if (revealMessage(pendingJumpId)) {
      setPendingJumpId(null);
      return;
    }

    if (!hasNextPage && !isFetchingNextPage) {
      setPendingJumpId(null);
      return;
    }

    if (isFetchingNextPage) {
      return;
    }

    const el = scrollRef.current;

    if (el) {
      restoringRef.current = el.scrollHeight - el.scrollTop;
    }

    pinnedRef.current = false;
    setShowJump(true);
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, pendingJumpId, revealMessage]);

  const jumpToMessage = (id: string) => {
    if (revealMessage(id)) {
      return;
    }

    setPendingJumpId(id);
  };

  // Deep-link jump: `/chat/{id}?m={messageId}` scrolls to and highlights the
  // target once the first page has loaded, then strips the param so it won't
  // re-fire. Reused by the global Starred page and the per-chat starred panel.
  useEffect(() => {
    if (!targetMessageId || query.isLoading) {
      return;
    }

    const key = `${conversationId}:${targetMessageId}`;
    if (handledJumpRef.current === key) {
      return;
    }

    handledJumpRef.current = key;
    setPendingJumpId(targetMessageId);
    router.replace(pathname);
  }, [conversationId, targetMessageId, query.isLoading, router, pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PinnedMessagesBar
        items={pins.data?.items ?? []}
        currentUserId={currentUserId}
        isGroup={isGroup}
        onOpenMessage={jumpToMessage}
        onUnpin={(messageId) => pin.mutate({ messageId, pinned: false })}
      />

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto px-3 py-4"
        >
          {query.isFetchingNextPage ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {messages.length === 0 && query.isLoading ? (
            <MessageListSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              {t('view.no-messages')}
            </div>
          ) : (
            <ul className="space-y-1">
              {rows.map((row) => (
                <MessageBubble
                  key={
                    highlighted?.id === row.message.id ? `${row.key}:${highlighted.nonce}` : row.key
                  }
                  message={row.message}
                  isMe={row.isMe}
                  highlighted={highlighted?.id === row.message.id}
                  isGroupHead={row.isGroupHead}
                  isGroupTail={row.isGroupTail}
                  showSenderName={isGroup && !row.isMe}
                  isLastOwn={row.message.id === lastOwnId}
                  canPost={canPost}
                  members={members}
                  currentUserId={currentUserId}
                  formatSize={formatSize}
                  onReply={onReply}
                  onReact={(messageId, emoji, reactedByMe) =>
                    react.mutate({ messageId, emoji, reactedByMe })
                  }
                  onEdit={(messageId, content) => edit.mutate({ messageId, content })}
                  onDelete={(messageId) => del.mutate(messageId)}
                  onVotePoll={(messageId, pollId, optionIds) =>
                    vote.mutate({ messageId, pollId, optionIds })
                  }
                  onJumpToParent={jumpToMessage}
                  onPin={(messageId, pinned) => pin.mutate({ messageId, pinned })}
                  onSave={(messageId, saved) => save.mutate({ messageId, saved })}
                  onForward={setForwarding}
                />
              ))}
            </ul>
          )}
        </div>

        <ForwardDialog message={forwarding} onClose={() => setForwarding(null)} />

        {showJump ? (
          <Button
            size="icon"
            onClick={scrollToBottom}
            aria-label={t('view.jump-to-latest')}
            className="absolute bottom-3 end-3 h-8 w-8 rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
