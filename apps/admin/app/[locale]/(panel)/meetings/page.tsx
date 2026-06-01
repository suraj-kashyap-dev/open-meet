'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Eye, PhoneOff, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { AdminMeetingDto } from '@open-meet/types';

import { DataTable } from '@open-meet/ui/data-table';
import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { DeleteMeetingDialog } from '@/features/meetings/components/delete-meeting-dialog';
import { EndAllActiveDialog } from '@/features/meetings/components/end-all-dialog';
import { EndMeetingDialog } from '@/features/meetings/components/end-meeting-dialog';
import { MeetingDetailDialog } from '@/features/meetings/components/meeting-detail-dialog';
import { useAdminMeetings } from '@/features/meetings/hooks/use-admin-meetings';
import { cn } from '@open-meet/ui/cn';

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
    return '-';
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
  const t = useTranslations('meetings');
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
        header: t('columns.meeting'),
        cell: ({ row }) => {
          const m = row.original;
          const title = m.title ?? t('untitled', { date: formatStarted(m.startedAt, m.createdAt) });

          return (
            <button
              type="button"
              className="flex min-w-0 flex-col items-start gap-0.5 text-start hover:underline"
              onClick={() => setDetailId(m.id)}
            >
              <span className="block max-w-[180px] truncate text-sm font-medium sm:max-w-[260px] lg:max-w-[360px] xl:max-w-[460px]">
                {title}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{m.code}</span>
            </button>
          );
        },
      }),
      column.accessor('hostName', {
        header: t('columns.host'),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.original.hostName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.hostEmail}</p>
          </div>
        ),
        meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
      }),
      column.accessor('status', {
        header: t('columns.status'),
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
                {t(`status.${m.status.toLowerCase()}`)}
              </span>
              {m.status === 'ACTIVE' ? (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {t('live-count', { count: m.activeParticipantCount })}
                </span>
              ) : null}
            </div>
          );
        },
      }),
      column.accessor((row) => row.startedAt ?? row.createdAt, {
        id: 'startedAt',
        header: t('columns.started'),
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatStarted(info.getValue() ?? null, info.row.original.createdAt)}
          </span>
        ),
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
      }),
      column.accessor('durationMinutes', {
        header: t('columns.duration'),
        cell: (info) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatDuration(info.getValue())}
          </span>
        ),
        meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
      }),
      column.accessor('participantCount', {
        header: () => <span className="block text-end">{t('columns.total')}</span>,
        cell: (info) => <span className="block text-end tabular-nums">{info.getValue()}</span>,
        meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' },
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('actions.label')}</span>,
        cell: ({ row }) => {
          const m = row.original;
          const canEnd = m.status !== 'ENDED';

          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDetailId(m.id)}
                aria-label={t('actions.view')}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">{t('actions.view')}</span>
              </Button>
              {canEnd ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEndTarget(m)}
                  aria-label={t('actions.end')}
                >
                  <PhoneOff className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('actions.end')}</span>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteTarget(m)}
                aria-label={t('actions.delete')}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('actions.delete')}</span>
              </Button>
            </div>
          );
        },
      }),
    ],
    [t],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('total-count', { count: total })}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              {t('end-all')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('search-placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
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
              {t(`filters.${s.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {isFetching && !isLoading ? (
          <span className="text-xs text-muted-foreground">{t('refreshing')}</span>
        ) : null}
      </div>

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={search || status !== 'ALL' ? t('empty-filtered') : t('empty')}
      />

      <footer className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-muted-foreground sm:text-start">
          {total === 0 ? t('pagination.no-results') : t('pagination.showing', { from, to, total })}
        </p>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('pagination.previous')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('pagination.page-of', { page, pageCount })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || isFetching}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {t('pagination.next')}
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
