'use client';

import { AlertTriangle, Camera, Loader2, Paperclip, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ChatMessageDto, ChatMessagePriority, ConversationMemberDto } from '@open-meet/types';

import {
  StagedAttachmentPreview,
  byteSize,
  useAutoResizeTextarea,
  useStagedAttachments,
} from '@/components/shared/chat';
import { ApiClientError } from '@/lib/api/client';

import { useBranding } from '@/components/web/branding/branding-provider';

import { useChatSocketContext } from './chat-socket-provider';
import { GifPicker } from './gif-picker';
import { MarkdownToolbar } from './markdown-toolbar';
import { RichInput, type RichInputHandle } from './rich-input';
import { ReactionPicker } from './reaction-picker';
import { ReplyPreview } from './reply-preview';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';
import { useSendMessage } from '../hooks/use-chat';

const MAX_ATTACHMENTS = 5;
const TYPING_TIMEOUT = 2500;
const MENTION_BEFORE_CARET = /(?:^|\s)@([^\s@]*)$/;

interface MentionState {
  query: string;
  start: number;
}

export function MessageComposer({
  conversationId,
  canPost,
  disabledReason,
  members,
  currentUserId,
  replyingTo,
  onCancelReply,
  onSent,
}: {
  conversationId: string;
  canPost: boolean;
  disabledReason?: string;
  members: ConversationMemberDto[];
  currentUserId: string | undefined;
  replyingTo: ChatMessageDto | null;
  onCancelReply: () => void;
  onSent: () => void;
}) {
  const t = useTranslations('chat');
  const send = useSendMessage(conversationId);
  const { startTyping, stopTyping } = useChatSocketContext();
  const { gifsEnabled } = useBranding();
  const { data: settings } = useUserSettings();
  const composerMode = settings?.composerPreferences.composerMode ?? 'NORMAL';
  const isWysiwyg = composerMode === 'WYSIWYG';
  const showMarkdownToolbar = composerMode === 'MARKDOWN';
  const richRef = useRef<RichInputHandle>(null);

  const sendGif = (url: string) =>
    send.send({
      content: `![gif](${url})`,
      attachmentIds: [],
      parentId: replyingTo?.id ?? null,
    });

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<ChatMessagePriority>('NORMAL');
  const [mention, setMention] = useState<MentionState | null>(null);
  const textareaRef = useAutoResizeTextarea(text);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingActive = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatSize = (bytes: number): string => {
    const s = byteSize(bytes);

    if (s.unit === 'B') {
      return t('size-bytes', { bytes: s.bytes });
    }

    if (s.unit === 'KB') {
      return t('size-kb', { kb: s.kb });
    }

    return t('size-mb', { mb: s.mb });
  };

  const attachments = useStagedAttachments({
    max: MAX_ATTACHMENTS,
    onCapacityExceeded: (max) => toast.error(t('composer.max-attachments', { max })),
    resolveUploadError: (err) =>
      err instanceof ApiClientError ? err.message : t('composer.upload-failed'),
    onUploadError: (message) => toast.error(message),
  });

  const mentionCandidates = mention
    ? members
        .filter((m) => m.userId !== currentUserId)
        .filter((m) => m.name.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : [];

  const stopTypingNow = () => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);

      typingTimer.current = null;
    }

    if (typingActive.current) {
      typingActive.current = false;

      stopTyping(conversationId);
    }
  };

  const detectMention = (value: string, caret: number) => {
    const match = MENTION_BEFORE_CARET.exec(value.slice(0, caret));

    if (match) {
      setMention({ query: match[1] ?? '', start: caret - (match[1]?.length ?? 0) - 1 });
    } else {
      setMention(null);
    }
  };

  const onType = (value: string, caret: number) => {
    setText(value);

    detectMention(value, caret);

    if (value.length === 0) {
      stopTypingNow();

      return;
    }

    if (!typingActive.current) {
      typingActive.current = true;

      startTyping(conversationId);
    }

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(stopTypingNow, TYPING_TIMEOUT);
  };

  const insertMention = (member: ConversationMemberDto) => {
    if (!mention) {
      return;
    }

    const caret = textareaRef.current?.selectionStart ?? text.length;
    const token = `[@${member.name}](${member.userId}) `;
    const next = text.slice(0, mention.start) + token + text.slice(caret);

    setText(next);

    setMention(null);

    requestAnimationFrame(() => {
      const el = textareaRef.current;

      if (el) {
        const pos = mention.start + token.length;

        el.focus();

        el.setSelectionRange(pos, pos);
      }
    });
  };

  const submit = () => {
    const content = text.trim();

    if (attachments.hasUploading) {
      toast.message(t('composer.wait-for-uploads'));

      return;
    }

    if (content.length === 0 && attachments.readyAttachments.length === 0) {
      return;
    }

    send.send({
      content,
      attachmentIds: attachments.readyAttachmentIds,
      parentId: replyingTo?.id ?? null,
      priority,
    });

    setText('');

    setPriority('NORMAL');

    setMention(null);

    richRef.current?.clear();

    attachments.reset();

    onCancelReply();

    stopTypingNow();

    onSent();
  };

  if (!canPost) {
    return (
      <div className="border-t border-border bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
        {disabledReason ?? t('composer.disabled')}
      </div>
    );
  }

  const hasReadyContent = text.trim().length > 0 || attachments.readyAttachments.length > 0;

  return (
    <div className="border-t border-border bg-card">
      <StagedAttachmentPreview
        items={attachments.staged}
        onRemove={attachments.removeStaged}
        formatSize={formatSize}
        labels={{
          uploading: (percent) => t('composer.uploading', { percent }),
          failed: t('composer.failed'),
          remove: t('composer.remove-attachment'),
        }}
      />

      {replyingTo ? (
        <div className="px-3 pt-2">
          <ReplyPreview
            senderName={replyingTo.sender?.name ?? null}
            content={replyingTo.content}
            deleted={replyingTo.deletedAt !== null}
            onCancel={onCancelReply}
          />
        </div>
      ) : null}

      {showMarkdownToolbar ? (
        <MarkdownToolbar
          textareaRef={textareaRef}
          value={text}
          onChange={(next, caret) => onType(next, caret)}
        />
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();

          submit();
        }}
        className="flex items-end gap-2 px-3 py-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf,.zip,.txt,.csv,.json,.doc,.docx,.xls,.xlsx"
          multiple
          className="sr-only"
          onChange={(e) => {
            attachments.stageFiles(e.target.files);

            e.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            attachments.stageFiles(e.target.files);

            e.target.value = '';
          }}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('composer.attach-file')}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {gifsEnabled ? <GifPicker onPick={sendGif} /> : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('priority.label')}
            className={cn(
              'hidden h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted sm:inline-flex',
              priority === 'URGENT'
                ? 'text-destructive'
                : priority === 'IMPORTANT'
                  ? 'text-warning'
                  : 'text-muted-foreground',
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => setPriority('NORMAL')}>
              {t('priority.normal')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPriority('IMPORTANT')} className="text-warning">
              {t('priority.important')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPriority('URGENT')} className="text-destructive">
              {t('priority.urgent')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => cameraInputRef.current?.click()}
          aria-label={t('composer.take-photo')}
          className="sm:hidden"
        >
          <Camera className="h-4 w-4" />
        </Button>

        <div className="relative flex flex-1 items-end">
          {isWysiwyg ? (
            <RichInput
              ref={richRef}
              placeholder={t('composer.placeholder')}
              getMentionItems={() =>
                members
                  .filter((m) => m.userId !== currentUserId)
                  .map((m) => ({ id: m.userId, label: m.name, avatar: m.avatar }))
              }
              onChange={(markdown) => onType(markdown, markdown.length)}
              onSubmit={submit}
            />
          ) : (
            <>
              {mention && mentionCandidates.length > 0 ? (
                <ul className="absolute bottom-full mb-1 max-h-56 w-full max-w-xs overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                  {mentionCandidates.map((m) => (
                    <li key={m.userId}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();

                          insertMention(m);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-muted"
                      >
                        <UserAvatar user={{ name: m.name, avatar: m.avatar }} size="xs" />
                        <span className="truncate">{m.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) =>
                  onType(e.target.value, e.target.selectionStart ?? e.target.value.length)
                }
                onKeyDown={(e) => {
                  if (
                    mention &&
                    mentionCandidates.length > 0 &&
                    (e.key === 'Enter' || e.key === 'Tab')
                  ) {
                    e.preventDefault();

                    insertMention(mentionCandidates[0]!);

                    return;
                  }

                  if (e.key === 'Escape' && mention) {
                    setMention(null);

                    return;
                  }

                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();

                    submit();
                  }
                }}
                placeholder={t('composer.placeholder')}
                rows={1}
                maxLength={8000}
                autoComplete="off"
                className={cn(
                  'w-full resize-none rounded-md border border-border bg-input py-2 pe-9 ps-3 text-sm leading-6 outline-none',
                  'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  'overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                )}
              />
              <div className="absolute bottom-1.5 end-1.5">
                <ReactionPicker
                  align="end"
                  onPick={(emoji) => onType(text + emoji, text.length + emoji.length)}
                />
              </div>
            </>
          )}
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={!hasReadyContent || attachments.hasUploading || send.isPending}
          aria-label={t('composer.send')}
        >
          {attachments.hasUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
