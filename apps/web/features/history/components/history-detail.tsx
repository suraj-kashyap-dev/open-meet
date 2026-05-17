'use client';

import {
  ArrowLeft,
  Calendar,
  Copy,
  Crown,
  File as FileIcon,
  Hash,
  Hourglass,
  Loader2,
  MessageSquare,
  Paperclip,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { AttachmentDto, MessageDto } from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useHistoryMeeting, useHistoryMessages } from '@/features/history/hooks/use-history';
import { cn } from '@/lib/cn';

const GROUP_WINDOW_MS = 2 * 60_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStartedAt(iso: string | null): string {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms <= 0) {
    return '—';
  }

  const minutes = Math.round(ms / 60_000);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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

function AttachmentBlock({ a }: { a: AttachmentDto }) {
  if (a.mime.startsWith('image/')) {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs overflow-hidden rounded-lg border border-border"
      >
        <img src={a.url} alt="" className="block max-h-72 w-full object-cover" loading="lazy" />
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
        <span className="block truncate text-sm font-medium">{a.url.split('/').pop()}</span>
        <span className="block text-xs text-muted-foreground">
          {a.mime} · {formatBytes(a.size)}
        </span>
      </span>
    </a>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
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
  const [copied, setCopied] = useState(false);

  const messages = useMemo<MessageDto[]>(() => {
    if (!data) {
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

  const stats = useMemo(() => {
    const senders = new Map<string, MessageDto['sender']>();
    let attachments = 0;

    for (const m of messages) {
      senders.set(m.sender.id, m.sender);
      attachments += m.attachments?.length ?? 0;
    }

    return {
      participants: Array.from(senders.values()),
      attachmentCount: attachments,
    };
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 || !scrollRef.current) {
      return;
    }

    const el = scrollRef.current;

    if (data?.pages.length === 1) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }
  }, [data?.pages.length, messages.length]);

  const copyCode = async () => {
    if (!meeting) {
      return;
    }

    try {
      await navigator.clipboard.writeText(meeting.code);
      setCopied(true);
      toast.success('Meeting code copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy meeting code');
    }
  };

  if (meetingError) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load this meeting.
        </div>
      </main>
    );
  }

  if (meetingLoading || !meeting) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const startedAtIso = meeting.startedAt ?? meeting.createdAt;
  const title =
    meeting.title ??
    `Meeting on ${new Date(startedAtIso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })}`;

  const durationMs =
    meeting.startedAt && meeting.endedAt
      ? new Date(meeting.endedAt).getTime() - new Date(meeting.startedAt).getTime()
      : null;

  const statusTone =
    meeting.status === 'ENDED'
      ? 'border-border bg-muted text-muted-foreground'
      : meeting.status === 'ACTIVE'
        ? 'border-success/30 bg-success/10 text-success'
        : 'border-warning/30 bg-warning/10 text-warning';

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground"
        >
          <Link href="/history">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to history
          </Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  statusTone,
                )}
              >
                {meeting.status.toLowerCase()}
              </span>
            </div>

            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <dt className="sr-only">Started</dt>
                <dd>{formatStartedAt(meeting.startedAt)}</dd>
              </div>

              {meeting.hostId === user?.id ? (
                <div className="inline-flex items-center gap-1.5 text-warning">
                  <Crown className="h-3.5 w-3.5" />
                  <dt className="sr-only">Role</dt>
                  <dd className="text-xs font-medium uppercase tracking-wider">Hosted by you</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium transition-colors',
              'hover:bg-muted',
            )}
            aria-label="Copy meeting code"
          >
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm tracking-tight">{meeting.code}</span>
            <Copy
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                copied ? 'text-success' : 'text-muted-foreground',
              )}
            />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            icon={<Hourglass className="h-3.5 w-3.5" />}
            label="Duration"
            value={formatDuration(durationMs)}
          />
          <StatTile
            icon={<Users className="h-3.5 w-3.5" />}
            label="Participants"
            value={stats.participants.length.toString()}
          />
          <StatTile
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Messages"
            value={messages.length.toString()}
          />
          <StatTile
            icon={<Paperclip className="h-3.5 w-3.5" />}
            label="Attachments"
            value={stats.attachmentCount.toString()}
          />
        </div>

        {stats.participants.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              In this chat
            </span>
            <ul className="flex flex-wrap items-center gap-1.5">
              {stats.participants.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 py-0.5 pl-0.5 pr-2.5"
                >
                  <UserAvatar user={p} size="xs" />
                  <span className="text-xs font-medium">{p.name}</span>
                </li>
              ))}
              {stats.participants.length > 8 ? (
                <li className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  +{stats.participants.length - 8}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Chat transcript</h2>
          {messages.length > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          ) : null}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {messagesError ? (
            <p className="text-sm text-destructive">Failed to load messages.</p>
          ) : messagesLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No messages were sent in this meeting.
              </p>
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
            </>
          )}
        </div>
      </section>
    </main>
  );
}
