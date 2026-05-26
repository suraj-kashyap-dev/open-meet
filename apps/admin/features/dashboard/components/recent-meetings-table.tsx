'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { RecentMeetingDto } from '@open-meet/types';

import { DataTable } from '@open-meet/ui/data-table';
import { cn } from '@open-meet/ui/cn';

function statusClasses(status: RecentMeetingDto['status']): string {
  if (status === 'ACTIVE') {
    return 'bg-success/10 text-success border-success/30';
  }

  if (status === 'WAITING') {
    return 'bg-warning/10 text-warning border-warning/30';
  }

  return 'bg-muted text-muted-foreground border-border';
}

function formatRelative(iso: string | null): string {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const column = createColumnHelper<RecentMeetingDto>();

export function RecentMeetingsTable({ meetings }: { meetings: RecentMeetingDto[] }) {
  const t = useTranslations('dashboard');
  const columns = useMemo(
    () => [
      column.accessor('code', {
        header: t('recent.columns.code'),
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      column.display({
        id: 'host',
        header: t('recent.columns.host'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.hostName}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostEmail}</span>
          </div>
        ),
      }),
      column.accessor('status', {
        header: t('recent.columns.status'),
        cell: (info) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              statusClasses(info.getValue()),
            )}
          >
            {t(`status.${info.getValue().toLowerCase()}`)}
          </span>
        ),
      }),
      column.accessor('participantCount', {
        header: () => <span className="block text-end">{t('recent.columns.participants')}</span>,
        cell: (info) => <span className="block text-end tabular-nums">{info.getValue()}</span>,
      }),
      column.accessor('durationMinutes', {
        header: () => <span className="block text-end">{t('recent.columns.duration')}</span>,
        cell: (info) => (
          <span className="block text-end tabular-nums">
            {info.getValue() !== null ? `${info.getValue()}m` : '—'}
          </span>
        ),
      }),
      column.accessor('startedAt', {
        header: () => <span className="block text-end">{t('recent.columns.started')}</span>,
        cell: (info) => (
          <span className="block text-end text-muted-foreground">
            {formatRelative(info.getValue())}
          </span>
        ),
      }),
    ],
    [t],
  );

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{t('recent.title')}</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>
      <DataTable data={meetings} columns={columns} emptyMessage={t('recent.empty')} />
    </section>
  );
}
