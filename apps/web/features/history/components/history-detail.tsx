'use client';

import {
  ArrowLeft,
  File as FileIcon,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';

import type { AttachmentDto, MessageDto } from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useHistoryMeeting, useHistoryMessages } from '@/features/history/hooks/use-history';
import { cn } from '@/lib/cn';

const GROUP_WINDOW_MS = 2 * 60_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatDateDivider(iso: string): string {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const day = startOfDay(new Date(iso));

  if (day === today) {
    return 'Today';
  }

  if (day === yesterday) {
    return 'Yesterday';
  }

  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() === new Date(iso).getFullYear() ? undefined : 'numeric',
  });
}

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

type Row =
  | { kind: 'divider'; key: string; label: string }
  | {
      kind: 'message';
      key: string;
      message: MessageDto;
      isMe: boolean;
      isGroupHead: boolean;
      isGroupTail: boolean;
    };

function buildRows(messages: MessageDto[], currentUserId: string | undefined): Row[] {
  const rows: Row[] = [];
  let lastDay: number | null = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    const day = startOfDay(new Date(m.sentAt));

    if (lastDay !== day) {
      rows.push({
        kind: 'divider',
        key: `divider-${day}`,
        label: formatDateDivider(m.sentAt),
      });
      lastDay = day;
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isMe = m.sender.id === currentUserId;

    const sameSenderAsPrev =
      prev !== undefined &&
      prev.sender.id === m.sender.id &&
      startOfDay(new Date(prev.sentAt)) === day &&
      new Date(m.sentAt).getTime() - new Date(prev.sentAt).getTime() < GROUP_WINDOW_MS;

    const sameSenderAsNext =
      next !== undefined &&
      next.sender.id === m.sender.id &&
      startOfDay(new Date(next.sentAt)) === day &&
      new Date(next.sentAt).getTime() - new Date(m.sentAt).getTime() < GROUP_WINDOW_MS;

    rows.push({
      kind: 'message',
      key: m.id,
      message: m,
      isMe,
      isGroupHead: ! sameSenderAsPrev,
      isGroupTail: ! sameSenderAsNext,
    });
  }

  return rows;
}

function AttachmentBlock({ a }: { a: AttachmentDto }) {
  if (a.mime.startsWith('image/')) {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs overflow-hidden rounded-lg border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.url}
          alt=""
          className="block max-h-72 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (a.mime.startsWith('video/')) {
    return (
      <video
        src={a.url}
        controls
        preload="metadata"
        className="block max-h-72 max-w-xs rounded-lg border border-border"
      />
    );
  }

  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-xs items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-muted"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileIcon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {a.url.split('/').pop()}
        </span>
        <span className="block text-xs text-muted-foreground">
          {a.mime} · {formatBytes(a.size)}
        </span>
      </span>
    </a>
  );
}

export function HistoryDetail({ code }: { code: string }) {
  const { data: user } = useCurrentUser();
  const { data: meeting, isLoading: meetingLoading, error: meetingError } = useHistoryMeeting(code);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
    error: messagesError,
  } = useHistoryMessages(code);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine all loaded pages into a flat oldest-first list.
  const messages = useMemo<MessageDto[]>(() => {
    if (! data) {
      return [];
    }

    const all: MessageDto[] = [];

    for (let i = data.pages.length - 1; i >= 0; i--) {
      const page = data.pages[i];

      if (page) {
        all.push(...page.items);
      }
    }

    return all;
  }, [data]);

  const rows = useMemo(() => buildRows(messages, user?.id), [messages, user?.id]);

  // Auto-scroll to bottom on initial load (latest message visible first).
  useEffect(() => {
    if (messages.length === 0 || ! scrollRef.current) {
      return;
    }

    const el = scrollRef.current;

    if (data?.pages.length === 1) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }
  }, [data?.pages.length, messages.length]);

  if (meetingError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-destructive">
        Failed to load this meeting.
      </main>
    );
  }

  if (meetingLoading || ! meeting) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </main>
    );
  }

  const title =
    meeting.title ??
    `Meeting on ${new Date(meeting.startedAt ?? meeting.createdAt).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })}`;

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col px-0 sm:px-6">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-0">
        <Button asChild variant="ghost" size="icon" aria-label="Back to history">
          <Link href="/history">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-mono">{meeting.code}</span> ·{' '}
            {meeting.status.toLowerCase()}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-0">
        {messagesError ? (
          <p className="text-sm text-destructive">Failed to load messages.</p>
        ) : messagesLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </span>
            <p className="text-sm text-muted-foreground">No messages were sent in this meeting.</p>
          </div>
        ) : (
          <>
            {hasNextPage ? (
              <div className="flex justify-center pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
                </Button>
              </div>
            ) : null}

            <ul className="space-y-1">
              {rows.map((row) => {
                if (row.kind === 'divider') {
                  return (
                    <li key={row.key} className="flex items-center gap-3 px-2 py-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </li>
                  );
                }

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
                    {! isMe ? (
                      <div className="w-7 shrink-0">
                        {isGroupTail ? (
                          <UserAvatar user={m.sender} size="sm" />
                        ) : null}
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
          </>
        )}
      </div>
    </main>
  );
}
