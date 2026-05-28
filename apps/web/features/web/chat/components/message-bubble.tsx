'use client';

import {
  AlertTriangle,
  Bookmark,
  BookmarkX,
  CornerUpLeft,
  Forward,
  Link2,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@open-meet/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ChatMessageDto, ConversationMemberDto } from '@open-meet/types';

import { AttachmentBlock, MessageContent, formatTime } from '@/components/shared/chat';

import { PollCard } from './poll-card';
import { ReactionBar } from './reaction-bar';
import { ReactionPicker } from './reaction-picker';
import { ReadReceipts } from './read-receipts';
import { ReplyPreview } from './reply-preview';

interface MessageBubbleProps {
  message: ChatMessageDto;
  isMe: boolean;
  isGroupHead: boolean;
  isGroupTail: boolean;
  showSenderName: boolean;
  isLastOwn: boolean;
  canPost: boolean;
  members: ConversationMemberDto[];
  currentUserId: string | undefined;
  formatSize: (bytes: number) => string;
  onReply: (message: ChatMessageDto) => void;
  onReact: (messageId: string, emoji: string, reactedByMe: boolean) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onVotePoll: (messageId: string, pollId: string, optionIds: string[]) => void;
  onJumpToParent: (parentId: string) => void;
  onPin: (messageId: string, pinned: boolean) => void;
  onSave: (messageId: string, saved: boolean) => void;
  onForward: (message: ChatMessageDto) => void;
}

export function MessageBubble({
  message,
  isMe,
  isGroupHead,
  isGroupTail,
  showSenderName,
  isLastOwn,
  canPost,
  members,
  currentUserId,
  formatSize,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onVotePoll,
  onJumpToParent,
  onPin,
  onSave,
  onForward,
}: MessageBubbleProps) {
  const t = useTranslations('chat');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const deleted = message.deletedAt !== null;
  const hasText = message.content.length > 0;
  const isPoll = message.poll !== null;

  const saveEdit = () => {
    const next = draft.trim();
    if (next.length > 0 && next !== message.content) {
      onEdit(message.id, next);
    }
    setEditing(false);
  };

  const copyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`${window.location.origin}/chat/${message.conversationId}`);
      toast.success(t('bubble.link-copied'));
    }
  };

  return (
    <li
      className={cn(
        'group flex items-end gap-2',
        isMe ? 'flex-row-reverse' : 'flex-row',
        isGroupHead ? 'pt-2' : 'pt-0.5',
      )}
    >
      {!isMe ? (
        <div className="w-7 shrink-0">
          {isGroupTail && message.sender ? <UserAvatar user={message.sender} size="sm" /> : null}
        </div>
      ) : null}

      <div className={cn('flex max-w-[78%] flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
        {isGroupHead ? (
          <div
            className={cn(
              'flex items-baseline gap-2 px-1 text-xs text-muted-foreground',
              isMe ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <span className="font-medium text-foreground">
              {isMe
                ? t('bubble.you')
                : showSenderName
                  ? (message.sender?.name ?? t('bubble.unknown-user'))
                  : message.sender?.name}
            </span>
            <time>{formatTime(message.sentAt)}</time>
          </div>
        ) : null}

        {!deleted && (message.pinned || message.priority !== 'NORMAL') ? (
          <div className={cn('flex items-center gap-2 px-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
            {message.pinned ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Pin className="h-3 w-3" />
                {t('bubble.pinned')}
              </span>
            ) : null}
            {message.priority !== 'NORMAL' ? (
              <span
                className={cn(
                  'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  message.priority === 'URGENT'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-warning/15 text-warning',
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {message.priority === 'URGENT' ? t('priority.urgent') : t('priority.important')}
              </span>
            ) : null}
          </div>
        ) : null}

        {message.parent ? (
          <ReplyPreview
            senderName={message.parent.sender?.name ?? null}
            content={message.parent.content}
            deleted={message.parent.deletedAt !== null}
            onClick={() => message.parentId && onJumpToParent(message.parentId)}
            className="max-w-full"
          />
        ) : null}

        {!deleted && message.attachments.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {message.attachments.map((a) => (
              <AttachmentBlock key={a.id} a={a} formatSize={formatSize} />
            ))}
          </div>
        ) : null}

        {isPoll && !deleted ? (
          <PollCard
            poll={message.poll!}
            disabled={!canPost}
            onVote={(optionIds) => onVotePoll(message.id, message.poll!.id, optionIds)}
          />
        ) : null}

        {editing ? (
          <div className="flex w-72 max-w-full flex-col gap-1.5">
            <textarea
              value={draft}
              autoFocus
              rows={2}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') {
                  setEditing(false);
                  setDraft(message.content);
                }
              }}
              className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2 text-xs text-muted-foreground">
              <button type="button" className="hover:text-foreground" onClick={saveEdit}>
                {t('bubble.save')}
              </button>
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => {
                  setEditing(false);
                  setDraft(message.content);
                }}
              >
                {t('bubble.cancel')}
              </button>
            </div>
          </div>
        ) : deleted ? (
          <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-sm italic text-muted-foreground">
            {t('bubble.deleted')}
          </p>
        ) : hasText ? (
          <div className="flex items-center gap-1">
            {isMe ? renderActions() : null}
            <div
              className={cn(
                'rounded-2xl px-3 py-2',
                isMe
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-border bg-muted text-foreground',
              )}
            >
              <MessageContent content={message.content} currentUserId={currentUserId} />
              {message.editedAt ? (
                <span className="ms-1.5 align-baseline text-[10px] opacity-60">
                  {t('bubble.edited')}
                </span>
              ) : null}
            </div>
            {!isMe ? renderActions() : null}
          </div>
        ) : (
          renderActions()
        )}

        <ReactionBar
          reactions={message.reactions}
          align={isMe ? 'end' : 'start'}
          onToggle={(emoji, reactedByMe) => onReact(message.id, emoji, reactedByMe)}
        />

        {isMe && isLastOwn && !deleted ? (
          <ReadReceipts
            members={members}
            currentUserId={currentUserId}
            messageSentAt={message.sentAt}
          />
        ) : null}
      </div>
    </li>
  );

  function renderActions() {
    if (deleted) {
      return null;
    }

    return (
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {canPost ? (
          <ReactionPicker
            align={isMe ? 'end' : 'start'}
            onPick={(emoji) => onReact(message.id, emoji, false)}
          />
        ) : null}

        {canPost ? (
          <button
            type="button"
            onClick={() => onReply(message)}
            aria-label={t('bubble.reply')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CornerUpLeft className="h-4 w-4" />
          </button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('bubble.more')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isMe && !isPoll ? (
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="me-2 h-4 w-4" />
                {t('bubble.edit')}
              </DropdownMenuItem>
            ) : null}

            {canPost ? (
              <DropdownMenuItem onSelect={() => onPin(message.id, message.pinned)}>
                {message.pinned ? (
                  <PinOff className="me-2 h-4 w-4" />
                ) : (
                  <Pin className="me-2 h-4 w-4" />
                )}
                {message.pinned ? t('bubble.unpin') : t('bubble.pin')}
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuItem onSelect={() => onSave(message.id, message.saved)}>
              {message.saved ? (
                <BookmarkX className="me-2 h-4 w-4" />
              ) : (
                <Bookmark className="me-2 h-4 w-4" />
              )}
              {message.saved ? t('bubble.unsave-message') : t('bubble.save-message')}
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => onForward(message)}>
              <Forward className="me-2 h-4 w-4" />
              {t('bubble.forward')}
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={copyLink}>
              <Link2 className="me-2 h-4 w-4" />
              {t('bubble.copy-link')}
            </DropdownMenuItem>

            {isMe ? (
              <DropdownMenuItem
                onSelect={() => onDelete(message.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t('bubble.delete')}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
}
