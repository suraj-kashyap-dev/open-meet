'use client';

import { ArrowDown, Camera, Loader2, MessageSquare, Paperclip, Send, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ClientEvent } from '@open-meet/types';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import type { MeetingSocket } from '@/features/web/meeting/hooks/use-socket';
import { useChatStore } from '@/features/web/meeting/stores';
import { ApiClientError } from '@/lib/api/client';
import {
  AttachmentBlock,
  StagedAttachmentPreview,
  buildMessageRows,
  byteSize,
  formatTime,
  useAutoResizeTextarea,
  useStagedAttachments,
} from '@/components/shared/chat';

interface Props {
  code: string;
  socket: MeetingSocket | null;
  onClose: () => void;
}

const MAX_ATTACHMENTS = 5;

export function ChatPanel({ code, socket, onClose }: Props) {
  const t = useTranslations('meeting');
  const { data: user } = useCurrentUser();
  const messages = useChatStore((s) => s.messages);

  const [text, setText] = useState('');
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [sending, setSending] = useState(false);

  const formatSize = useCallback(
    (bytes: number): string => {
      const s = byteSize(bytes);

      if (s.unit === 'B') {
        return t('chat.size-bytes', { bytes: s.bytes });
      }

      if (s.unit === 'KB') {
        return t('chat.size-kb', { kb: s.kb });
      }

      return t('chat.size-mb', { mb: s.mb });
    },
    [t],
  );

  const attachments = useStagedAttachments({
    max: MAX_ATTACHMENTS,
    onCapacityExceeded: (max) => toast.error(t('toast.max-attachments', { max })),
    resolveUploadError: (err) =>
      err instanceof ApiClientError ? err.message : t('toast.upload-failed'),
    onUploadError: (message) => toast.error(message),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useAutoResizeTextarea(text);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => buildMessageRows(messages, user?.id), [messages, user?.id]);

  const isPinnedToBottom = useCallback(() => {
    const el = scrollRef.current;

    if (!el) {
      return true;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom < 48;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;

    if (!el) {
      return;
    }

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    if (isPinnedToBottom()) {
      scrollToBottom();
    } else {
      setShowJumpToBottom(true);
    }
  }, [messages, isPinnedToBottom, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;

    if (!el) {
      return;
    }

    const onScroll = () => {
      if (isPinnedToBottom()) {
        setShowJumpToBottom(false);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isPinnedToBottom]);

  const send = async () => {
    if (!socket) {
      return;
    }

    const content = text.trim();

    if (attachments.hasUploading) {
      toast.message(t('toast.wait-for-uploads'));
      return;
    }

    if (content.length === 0 && attachments.readyAttachments.length === 0) {
      return;
    }

    setSending(true);
    socket.emit(ClientEvent.CHAT_SEND, {
      meetingCode: code,
      content,
      attachmentIds: attachments.readyAttachmentIds,
    });

    attachments.reset();
    setText('');
    setSending(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const hasReadyContent = text.trim().length > 0 || attachments.readyAttachments.length > 0;
  const hasInflight = attachments.hasUploading;

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {t('chat.title')}
          {messages.length > 0 ? (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              · {messages.length}
            </span>
          ) : null}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('chat.close')}
          className="-mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-3 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
              </span>
              <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {rows.map((row) => {
                const { message: m, isMe, isGroupHead, isGroupTail } = row;

                return (
                  <li
                    key={row.key}
                    className={cn(
                      'flex items-end gap-2',
                      isMe ? 'flex-row-reverse' : 'flex-row',
                      isGroupHead ? 'pt-2' : 'pt-0.5',
                    )}
                  >
                    {!isMe ? (
                      <div className="w-7 shrink-0">
                        {isGroupTail ? <UserAvatar user={m.sender} size="sm" /> : null}
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        'flex max-w-[78%] flex-col gap-1',
                        isMe ? 'items-end' : 'items-start',
                      )}
                    >
                      {isGroupHead ? (
                        <div
                          className={cn(
                            'flex items-baseline gap-2 px-1 text-xs text-muted-foreground',
                            isMe ? 'flex-row-reverse' : 'flex-row',
                          )}
                        >
                          <span className="font-medium text-foreground">
                            {isMe ? t('chat.you') : m.sender.name}
                          </span>
                          <time>{formatTime(m.sentAt)}</time>
                        </div>
                      ) : null}

                      {m.attachments && m.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {m.attachments.map((a) => (
                            <AttachmentBlock key={a.id} a={a} formatSize={formatSize} />
                          ))}
                        </div>
                      ) : null}

                      {m.content.length > 0 ? (
                        <p
                          className={cn(
                            'whitespace-pre-wrap break-words px-3 py-2 text-sm leading-relaxed',
                            isMe
                              ? 'bg-foreground text-background'
                              : 'border border-border bg-muted text-foreground',
                            isMe
                              ? cn(
                                  'rounded-2xl',
                                  isGroupHead && 'rounded-tr-md',
                                  isGroupTail && 'rounded-br-md',
                                )
                              : cn(
                                  'rounded-2xl',
                                  isGroupHead && 'rounded-tl-md',
                                  isGroupTail && 'rounded-bl-md',
                                ),
                          )}
                        >
                          {m.content}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {showJumpToBottom ? (
          <Button
            size="icon"
            onClick={() => {
              scrollToBottom();
              setShowJumpToBottom(false);
            }}
            aria-label={t('chat.jump-to-latest')}
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <StagedAttachmentPreview
        items={attachments.staged}
        onRemove={attachments.removeStaged}
        formatSize={formatSize}
        labels={{
          uploading: (percent) => t('chat.uploading', { percent }),
          failed: t('chat.failed'),
          remove: t('chat.remove-attachment'),
        }}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t border-border px-3 py-3"
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
          aria-label={t('chat.attach-file')}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => cameraInputRef.current?.click()}
          aria-label={t('chat.take-photo')}
          className="sm:hidden"
        >
          <Camera className="h-4 w-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('chat.placeholder')}
          rows={1}
          maxLength={2000}
          autoComplete="off"
          className={cn(
            'flex-1 resize-none rounded-md border border-border bg-input px-3 py-2 text-sm leading-6 outline-none',
            'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
            '[scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]',
            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
            'hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40',
          )}
        />

        <Button
          type="submit"
          size="icon"
          disabled={!hasReadyContent || hasInflight || sending}
          aria-label={t('chat.send')}
        >
          {hasInflight ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
