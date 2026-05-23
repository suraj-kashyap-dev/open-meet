'use client';

import { createColumnHelper } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  PhoneOff,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AdminMeetingDto } from '@open-meet/types';

import { DataTable } from '@/components/shared/data-table/data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { DeleteMeetingDialog } from '@/features/admin/meetings/components/delete-meeting-dialog';
import { EndAllActiveDialog } from '@/features/admin/meetings/components/end-all-dialog';
import { EndMeetingDialog } from '@/features/admin/meetings/components/end-meeting-dialog';
import { MeetingDetailDialog } from '@/features/admin/meetings/components/meeting-detail-dialog';
import { useAdminMeetings } from '@/features/admin/meetings/hooks/use-admin-meetings';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

type StatusFilter = 'ALL' | 'WAITING' | 'ACTIVE' | 'ENDED';

function formatStarted(iso: string | null, fallback: string): string {
  return new Date(iso ?? fallback).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
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

const column = createColumnHelper<AdminMeetingDto>();

const STATUS_TONE: Record<AdminMeetingDto['status'], string> = {
  WAITING: 'border-warning/30 bg-warning/10 text-warning',
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  ENDED: 'border-border bg-muted text-muted-foreground',
};

export default function AdminMeetingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [endTarget, setEndTarget] = useState<AdminMeetingDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMeetingDto | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const query = {
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    status: status === 'ALL' ? undefined : (status as Exclude<StatusFilter, 'ALL'>),
  };

  const { data, isLoading, isFetching } = useAdminMeetings(query);

  const items = data?.items ?? [];
  const activeCount = items.filter((m) => m.status === 'ACTIVE').length;

  const columns = useMemo(
    () => [
      column.display({
        id: 'meeting',
        header: 'Meeting',
        cell: ({ row }) => {
          const m = row.original;
          const title = m.title ?? `Untitled (${formatStarted(m.startedAt, m.createdAt)})`;

          return (
            <button
              type="button"
              className="flex min-w-0 flex-col items-start gap-0.5 text-left hover:underline"
              onClick={() => setDetailId(m.id)}
            >
              <span className="truncate text-sm font-medium">{title}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{m.code}</span>
            </button>
          );
        },
      }),
      column.accessor('hostName', {
        header: 'Host',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.original.hostName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.hostEmail}</p>
          </div>
        ),
      }),
      column.accessor('status', {
        header: 'Status',
        cell: ({ row }) => {
          const m = row.original;

          return (
            <div className="flex flex-col items-start gap-0.5">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  STATUS_TONE[m.status],
                )}
              >
                {m.status.toLowerCase()}
              </span>
              {m.status === 'ACTIVE' ? (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {m.activeParticipantCount} live
                </span>
              ) : null}
            </div>
          );
        },
      }),
      column.accessor((row) => row.startedAt ?? row.createdAt, {
        id: 'startedAt',
        header: 'Started',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatStarted(info.getValue() ?? null, info.row.original.createdAt)}
          </span>
        ),
      }),
      column.accessor('durationMinutes', {
        header: 'Duration',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatDuration(info.getValue())}
          </span>
        ),
      }),
      column.accessor('participantCount', {
        header: () => <span className="block text-right">Total</span>,
        cell: (info) => <span className="block text-right tabular-nums">{info.getValue()}</span>,
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const m = row.original;
          const canEnd = m.status !== 'ENDED';

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Open actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDetailId(m.id)}>
                    <Eye className="h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                  {canEnd ? (
                    <DropdownMenuItem onSelect={() => setEndTarget(m)}>
                      <PhoneOff className="h-4 w-4" />
                      Force end
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDeleteTarget(m)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Moderate
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meetings</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{total.toLocaleString()} total</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End all active
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by code, title, host"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1 text-xs">
          {(['ALL', 'ACTIVE', 'WAITING', 'ENDED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                status === s
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.toLowerCase()}
            </button>
          ))}
        </div>

        {isFetching && !isLoading ? (
          <span className="text-xs text-muted-foreground">Refreshing…</span>
        ) : null}
      </div>

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={
          search || status !== 'ALL'
            ? 'No meetings match the current filters.'
            : 'No meetings recorded yet.'
        }
      />

      <footer className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
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

      <EndMeetingDialog meeting={endTarget} onClose={() => setEndTarget(null)} />
      <DeleteMeetingDialog meeting={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <MeetingDetailDialog meetingId={detailId} onClose={() => setDetailId(null)} />
      <EndAllActiveDialog
        open={bulkOpen}
        activeCount={activeCount}
        onClose={() => setBulkOpen(false)}
      />
    </main>
  );
}
