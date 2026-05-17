'use client';

import { createColumnHelper } from '@tanstack/react-table';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Hourglass,
  MessageSquare,
  Paperclip,
  Users,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import type { MeetingHistoryItemDto } from '@open-meet/types';

import { DataTable } from '@/components/shared/data-table/data-table';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { useHistoryList } from '@/hooks/client/use-history';
import { cn } from '@/lib/shared/cn';

const PAGE_SIZE = 20;

function formatStartedAt(iso: string | null): string {
  if (! iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(min: number | null): string {
  if (min === null) {
    return '—';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTotalDuration(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const column = createColumnHelper<MeetingHistoryItemDto>();

export function HistoryList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error } = useHistoryList(page, PAGE_SIZE);

  const columns = useMemo(
    () => [
      column.display({
        id: 'meeting',
        header: 'Meeting',
        cell: ({ row }) => {
          const item = row.original;
          const title = item.title ?? `Meeting on ${formatStartedAt(item.startedAt ?? item.createdAt)}`;

          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Video className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{title}</p>
                  {item.isHost ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                      <Crown className="h-3 w-3" />
                      Host
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  <span className="font-mono">{item.code}</span>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  {item.isHost ? 'hosted by you' : `hosted by ${item.hostName}`}
                </p>
              </div>
            </div>
          );
        },
      }),
      column.accessor((row) => row.startedAt ?? row.createdAt, {
        id: 'startedAt',
        header: 'Started',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatStartedAt(info.getValue() ?? null)}
          </span>
        ),
      }),
      column.accessor('durationMinutes', {
        header: 'Duration',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDuration(info.getValue())}
          </span>
        ),
      }),
      column.display({
        id: 'participants',
        header: 'Participants',
        cell: ({ row }) => {
          const item = row.original;
          const displayedAvatars = item.participantsPreview.slice(0, 4);
          const extra = Math.max(0, item.participantCount - displayedAvatars.length);

          return (
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                {displayedAvatars.map((p) => (
                  <UserAvatar
                    key={p.id}
                    user={p}
                    size="xs"
                    title={p.name}
                    className="border-2 border-card"
                    fallbackClassName="bg-muted text-muted-foreground"
                  />
                ))}
                {extra > 0 ? (
                  <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border-2 border-card bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    +{extra}
                  </span>
                ) : null}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {item.participantCount}
              </span>
            </div>
          );
        },
      }),
      column.accessor('messageCount', {
        header: () => <span className="block text-right">Activity</span>,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MessageSquare className="h-3.5 w-3.5" />
                {item.messageCount}
              </span>
              {item.attachmentCount > 0 ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Paperclip className="h-3.5 w-3.5" />
                  {item.attachmentCount}
                </span>
              ) : null}
            </div>
          );
        },
      }),
      column.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();

          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                status === 'ENDED'
                  ? 'border-border bg-muted text-muted-foreground'
                  : status === 'ACTIVE'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-warning/30 bg-warning/10 text-warning',
              )}
            >
              {status.toLowerCase()}
            </span>
          );
        },
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/history/${row.original.code}`}>
                Open
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const items = data?.items ?? [];

  const totals = useMemo(() => {
    const acc = {
      hosted: 0,
      participants: 0,
      durationMin: 0,
      messages: 0,
    };

    for (const item of items) {
      if (item.isHost) {
        acc.hosted += 1;
      }
      acc.participants += item.participantCount;
      acc.durationMin += item.durationMinutes ?? 0;
      acc.messages += item.messageCount;
    }

    return acc;
  }, [items]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Activity
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meeting history</h1>
          {total > 0 ? (
            <span className="text-sm text-muted-foreground">
              {total.toLocaleString()} {total === 1 ? 'meeting' : 'meetings'} total
            </span>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every meeting you hosted or joined — with chat, attachments, and the
          participant list preserved.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load your meeting history.
        </div>
      ) : (
        <>
          {items.length > 0 ? (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Video className="h-4 w-4" />}
                label="On this page"
                value={items.length.toString()}
              />
              <StatCard
                icon={<Crown className="h-4 w-4" />}
                label="Hosted by you"
                value={totals.hosted.toString()}
              />
              <StatCard
                icon={<Hourglass className="h-4 w-4" />}
                label="Total time"
                value={totals.durationMin > 0 ? formatTotalDuration(totals.durationMin) : '—'}
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Participants"
                value={totals.participants.toString()}
              />
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {items.length > 0 || isLoading ? (
              <DataTable
                data={items}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No meetings on this page."
                className="rounded-none border-0 shadow-none"
              />
            ) : (
              <EmptyState />
            )}
          </section>

          {pageCount > 1 ? (
            <footer className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {from}–{to} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount || isFetching}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarRange className="h-6 w-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">No meetings yet</p>
        <p className="text-sm text-muted-foreground">
          Once you host or join a meeting, it&apos;ll show up here.
        </p>
      </div>
      <Button asChild className="mt-2">
        <Link href="/">Start a meeting</Link>
      </Button>
    </div>
  );
}
