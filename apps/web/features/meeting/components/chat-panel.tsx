'use client';

import {
  ArrowDown,
  Camera,
  File as FileIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ClientEvent, type AttachmentDto, type MessageDto } from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import type { MeetingSocket } from '@/features/meeting/hooks/use-socket';
import { useChatStore } from '@/features/meeting/stores';
import { cn } from '@/lib/cn';
import { ApiClientError } from '@/lib/api/client';
import { env } from '@/lib/env';
import { uploadAttachment } from '@/features/account/services/uploads';

interface Props {
  code: string;
  socket: MeetingSocket | null;
  onClose: () => void;
}

const GROUP_WINDOW_MS = 2 * 60_000;
const MAX_ATTACHMENTS = 5;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Row {
  key: string;
  message: MessageDto;
  isMe: boolean;
  isGroupHead: boolean;
  isGroupTail: boolean;
}

function buildRows(messages: MessageDto[], currentUserId: string | undefined): Row[] {
  const rows: Row[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isMe = m.sender.id === currentUserId;
    const sentAtMs = new Date(m.sentAt).getTime();

    const sameSenderAsPrev =
      prev !== undefined &&
      prev.sender.id === m.sender.id &&
      sentAtMs - new Date(prev.sentAt).getTime() < GROUP_WINDOW_MS;

    const sameSenderAsNext =
      next !== undefined &&
      next.sender.id === m.sender.id &&
      new Date(next.sentAt).getTime() - sentAtMs < GROUP_WINDOW_MS;

    rows.push({
      key: m.id,
      message: m,
      isMe,
      isGroupHead: !sameSenderAsPrev,
      isGroupTail: !sameSenderAsNext,
    });
  }

  return rows;
}

interface StagedAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  status: 'uploading' | 'ready' | 'failed';
  progress: number;
  attachment?: AttachmentDto;
  error?: string;
}

function toAbsoluteMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;

  return `${base}${path}`;
}

function AttachmentBlock({ a }: { a: AttachmentDto }) {
  const src = toAbsoluteMediaUrl(a.url);

  if (a.mime.startsWith('image/')) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs overflow-hidden rounded-lg border border-border"
      >
        <img
          src={src}
          alt=""
          crossOrigin="use-credentials"
          className="block max-h-72 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (a.mime.startsWith('video/')) {
    return (
      <video
        src={src}
        controls
        preload="metadata"
        crossOrigin="use-credentials"
        className="block max-h-72 max-w-xs rounded-lg border border-border"
      />
    );
  }

  if (a.mime.startsWith('audio/')) {
    return (
      <audio
        src={src}
        controls
        preload="metadata"
        crossOrigin="use-credentials"
        className="block w-full max-w-xs"
      />
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-xs items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-muted"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileIcon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{a.url.split('/').pop()}</span>
        <span className="block text-xs text-muted-foreground">
          {a.mime} · {formatBytes(a.size)}
        </span>
      </span>
    </a>
  );
}

export function ChatPanel({ code, socket, onClose }: Props) {
  const { data: user } = useCurrentUser();
  const messages = useChatStore((s) => s.messages);

  const [text, setText] = useState('');
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => buildRows(messages, user?.id), [messages, user?.id]);

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

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;

    if (!el) {
      return;
    }

    el.style.height = 'auto';
    const max = 4 * 24 + 16;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  // Revoke preview URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      staged.forEach((s) => {
        if (s.previewUrl) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
    };
    // Intentionally runs only on unmount — staged file URLs are cleaned up there.
  }, []);

  const stageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const available = MAX_ATTACHMENTS - staged.length;

    if (available <= 0) {
      toast.error(`You can attach at most ${MAX_ATTACHMENTS} files per message.`);
      return;
    }

    const batch = Array.from(files).slice(0, available);

    const newItems: StagedAttachment[] = batch.map((file) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      return {
        id,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'uploading',
        progress: 0,
      };
    });

    setStaged((prev) => [...prev, ...newItems]);

    newItems.forEach(async (item) => {
      try {
        const attachment = await uploadAttachment(item.file, {
          onProgress: (loaded, total) => {
            const pct = total > 0 ? (loaded / total) * 100 : 0;
            setStaged((prev) => prev.map((s) => (s.id === item.id ? { ...s, progress: pct } : s)));
          },
        });

        setStaged((prev) =>
          prev.map((s) =>
            s.id === item.id ? { ...s, status: 'ready', progress: 100, attachment } : s,
          ),
        );
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Upload failed';
        setStaged((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, status: 'failed', error: message } : s)),
        );
        toast.error(message);
      }
    });
  };

  const removeStaged = (id: string) => {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === id);

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return prev.filter((s) => s.id !== id);
    });
  };

  const send = async () => {
    if (!socket) {
      return;
    }

    const content = text.trim();
    const readyAttachments = staged.filter((s) => s.status === 'ready' && s.attachment);
    const stillUploading = staged.some((s) => s.status === 'uploading');

    if (stillUploading) {
      toast.message('Wait for uploads to finish');
      return;
    }

    if (content.length === 0 && readyAttachments.length === 0) {
      return;
    }

    setSending(true);
    socket.emit(ClientEvent.CHAT_SEND, {
      meetingCode: code,
      content,
      attachmentIds: readyAttachments.map((s) => s.attachment!.id),
    });

    staged.forEach((s) => {
      if (s.previewUrl) {
        URL.revokeObjectURL(s.previewUrl);
      }
    });
    setStaged([]);
    setText('');
    setSending(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const hasReadyContent = text.trim().length > 0 || staged.some((s) => s.status === 'ready');
  const hasInflight = staged.some((s) => s.status === 'uploading');

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Chat
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
          aria-label="Close chat"
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
              <p className="text-sm text-muted-foreground">
                No messages yet. Be the first to say something.
              </p>
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
                            {isMe ? 'You' : m.sender.name}
                          </span>
                          <time>{formatTime(m.sentAt)}</time>
                        </div>
                      ) : null}

                      {m.attachments && m.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {m.attachments.map((a) => (
                            <AttachmentBlock key={a.id} a={a} />
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
            aria-label="Jump to latest"
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {staged.length > 0 ? (
        <div className="border-t border-border bg-muted/30 px-3 py-2">
          <ul className="flex flex-wrap gap-2">
            {staged.map((s) => (
              <li
                key={s.id}
                className="relative flex items-center gap-2 rounded-md border border-border bg-card p-1.5 pr-2"
              >
                {s.previewUrl ? (
                  <img src={s.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                    <FileIcon className="h-4 w-4" />
                  </span>
                )}

                <div className="flex min-w-0 flex-col">
                  <span className="max-w-[10rem] truncate text-xs font-medium">{s.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.status === 'uploading'
                      ? `Uploading… ${Math.round(s.progress)}%`
                      : s.status === 'failed'
                        ? (s.error ?? 'Failed')
                        : formatBytes(s.file.size)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeStaged(s.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background hover:bg-foreground"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
            stageFiles(e.target.files);
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
            stageFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => cameraInputRef.current?.click()}
          aria-label="Take a photo"
          className="sm:hidden"
        >
          <Camera className="h-4 w-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Send a message to everyone"
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
          aria-label="Send message"
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
