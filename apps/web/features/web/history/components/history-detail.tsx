'use client';

import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Crown,
  Download,
  File as FileIcon,
  HardDrive,
  Hash,
  Hourglass,
  Loader2,
  MessageSquare,
  Paperclip,
  User,
  Users,
  Video as VideoIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Link } from '@/i18n/navigation';

import type { AttachmentDto, MessageDto, RecordingDto } from '@open-meet/types';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import {
  useHistoryMeeting,
  useHistoryMessages,
  useHistoryRecordings,
} from '@/features/web/history/hooks/use-history';
import { env } from '@/lib/env';
import { cn } from '@open-meet/ui/cn';

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
  const t = useTranslations('history');

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
          {t('detail.attachment.meta', { mime: a.mime, size: formatBytes(a.size) })}
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

function formatRecordingDuration(ms: number): string {
  if (ms <= 0) {
    return '—';
  }

  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type TranslateFn = ReturnType<typeof useTranslations<'history'>>;

function formatRelative(iso: string, t: TranslateFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);

  if (sec < 60) {
    return t('detail.recordings.relative.just-now');
  }

  const min = Math.round(sec / 60);

  if (min < 60) {
    return t('detail.recordings.relative.minutes', { count: min });
  }

  const h = Math.round(min / 60);

  if (h < 24) {
    return t('detail.recordings.relative.hours', { count: h });
  }

  const d = Math.round(h / 24);

  if (d < 30) {
    return t('detail.recordings.relative.days', { count: d });
  }

  return new Date(iso).toLocaleDateString();
}

function statusTone(status: RecordingDto['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'border-success/30 bg-success/10 text-success';
    case 'FAILED':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    default:
      return 'border-warning/30 bg-warning/10 text-warning';
  }
}

function RecordingCard({ rec }: { rec: RecordingDto }) {
  const t = useTranslations('history');
  const playable = rec.status === 'COMPLETED' && rec.url;
  const playerSrc = playable ? `${env.NEXT_PUBLIC_API_URL}${rec.url}` : null;
  const downloadHref = playable ? `${env.NEXT_PUBLIC_API_URL}${rec.url}?download=1` : null;
  const startedDate = new Date(rec.startedAt);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="border-b border-border bg-card/60 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold tracking-tight">
                {t('detail.recordings.recording-from', {
                  date: startedDate.toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </h3>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  statusTone(rec.status),
                )}
              >
                {t(`detail.recordings.status.${rec.status.toLowerCase()}`)}
              </span>
            </div>

            <dl className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {rec.startedByName ? (
                <div className="inline-flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <dt className="sr-only">{t('detail.recordings.started-by')}</dt>
                  <dd>{rec.startedByName}</dd>
                </div>
              ) : null}

              <div className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <dt className="sr-only">{t('detail.recordings.duration')}</dt>
                <dd className="tabular-nums">{formatRecordingDuration(rec.durationMs)}</dd>
              </div>

              {rec.sizeBytes > 0 ? (
                <div className="inline-flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3" />
                  <dt className="sr-only">{t('detail.recordings.size')}</dt>
                  <dd className="tabular-nums">{formatBytes(rec.sizeBytes)}</dd>
                </div>
              ) : null}

              <span className="text-muted-foreground/70">·</span>
              <span>{formatRelative(rec.startedAt, t)}</span>
            </dl>
          </div>

          {playable && downloadHref ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={downloadHref} download>
                <Download className="h-3.5 w-3.5" />
                {t('detail.recordings.download')}
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="bg-black">
        {playable && playerSrc ? (
          <video
            src={playerSrc}
            controls
            preload="metadata"
            playsInline
            controlsList="nodownload"
            className="block aspect-video w-full bg-black"
            crossOrigin="use-credentials"
          />
        ) : rec.status === 'FAILED' ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-destructive/5 px-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <VideoIcon className="h-4 w-4" />
            </span>
            <p className="text-sm font-medium text-destructive">
              {t('detail.recordings.failed-title')}
            </p>
            <p className="max-w-md text-xs text-destructive/80">
              {rec.error ?? t('detail.recordings.failed-detail')}
            </p>
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-xs">{t('detail.recordings.processing')}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function RecordingsEmptyState() {
  const t = useTranslations('history');

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <VideoIcon className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t('detail.recordings.empty-title')}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {t('detail.recordings.empty-description')}
        </p>
      </div>
    </div>
  );
}

function RecordingsSection({
  recordings,
  isLoading,
}: {
  recordings: RecordingDto[];
  isLoading: boolean;
}) {
  const t = useTranslations('history');

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <VideoIcon className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">
            {t('detail.recordings.title')}
          </h2>
          {recordings.length > 0 ? (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {recordings.length}
            </span>
          ) : null}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {t('detail.recordings.visibility')}
        </span>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : recordings.length === 0 ? (
        <RecordingsEmptyState />
      ) : (
        <div className="space-y-4 p-4 sm:p-5">
          {recordings.map((rec) => (
            <RecordingCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HistoryDetail({ code }: { code: string }) {
  const t = useTranslations('history');
  const { data: user } = useCurrentUser();
  const { data: meeting, isLoading: meetingLoading, error: meetingError } = useHistoryMeeting(code);
  const { data: recordings, isLoading: recordingsLoading } = useHistoryRecordings(code);
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
      toast.success(t('toast.copied'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('toast.copy-failed'));
    }
  };

  if (meetingError) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {t('detail.error')}
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
    t('detail.default-title', {
      date: new Date(startedAtIso).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    });

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
            {t('detail.back')}
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
                {t(`detail.status.${meeting.status.toLowerCase()}`)}
              </span>
            </div>

            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <dt className="sr-only">{t('detail.started')}</dt>
                <dd>{formatStartedAt(meeting.startedAt)}</dd>
              </div>

              {meeting.hostId === user?.id ? (
                <div className="inline-flex items-center gap-1.5 text-warning">
                  <Crown className="h-3.5 w-3.5" />
                  <dt className="sr-only">{t('detail.role')}</dt>
                  <dd className="text-xs font-medium uppercase tracking-wider">
                    {t('detail.hosted-by-you')}
                  </dd>
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
            aria-label={t('detail.copy-aria')}
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
            label={t('detail.stats.duration')}
            value={formatDuration(durationMs)}
          />
          <StatTile
            icon={<Users className="h-3.5 w-3.5" />}
            label={t('detail.stats.participants')}
            value={stats.participants.length.toString()}
          />
          <StatTile
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label={t('detail.stats.messages')}
            value={messages.length.toString()}
          />
          <StatTile
            icon={<Paperclip className="h-3.5 w-3.5" />}
            label={t('detail.stats.attachments')}
            value={stats.attachmentCount.toString()}
          />
        </div>

        {stats.participants.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('detail.in-this-chat')}
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
                  {t('detail.overflow', { count: stats.participants.length - 8 })}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </section>

      <RecordingsSection recordings={recordings ?? []} isLoading={recordingsLoading} />

      <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">{t('detail.transcript.title')}</h2>
          {messages.length > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('detail.transcript.count', { count: messages.length })}
            </span>
          ) : null}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {messagesError ? (
            <p className="text-sm text-destructive">{t('detail.transcript.error')}</p>
          ) : messagesLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">{t('detail.transcript.empty')}</p>
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
                    {isFetchingNextPage
                      ? t('detail.transcript.loading')
                      : t('detail.transcript.load-earlier')}
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
                              {isMe ? t('detail.transcript.you') : m.sender.name}
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
