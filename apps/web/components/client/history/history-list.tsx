'use client';

import { createColumnHelper } from '@tanstack/react-table';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import type { MeetingHistoryItemDto } from '@open-meet/types';

import { DataTable } from '@/components/shared/data-table/data-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useHistoryList } from '@/hooks/client/use-history';
import { cn } from '@/lib/shared/cn';

const PAGE_SIZE = 20;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

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

const column = createColumnHelper<MeetingHistoryItemDto>();

export function HistoryList() {
  const router = useRouter();
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
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{item.code}</span> · hosted by{' '}
                {item.isHost ? 'you' : item.hostName}
              </p>
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
                  <Avatar
                    key={p.id}
                    className="h-6 w-6 border-2 border-card"
                    title={p.name}
                  >
                    <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                      {initialsOf(p.name)}
                    </AvatarFallback>
                  </Avatar>
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
              <Link
                href={`/history/${row.original.code}`}
                onClick={(e) => e.stopPropagation()}
              >
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

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Activity
        </p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meeting history</h1>
          {total > 0 ? (
            <span className="text-sm text-muted-foreground">
              {total.toLocaleString()} total
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Every meeting you hosted or joined, with chat and shared files preserved.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load your meeting history.
        </p>
      ) : (
        <DataTable
          data={items}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarRange className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium">No meetings yet</p>
              <p className="text-xs text-muted-foreground">
                Once you host or join a meeting, it&apos;ll show up here.
              </p>
            </div>
          }
          onRowClick={(row) => router.push(`/history/${row.original.code}`)}
        />
      )}

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
    </main>
  );
}
