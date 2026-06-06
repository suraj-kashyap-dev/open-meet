'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { DatagridResponseDto, RecentMeetingDto } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';

import { StaticDataGrid } from '@/components/datagrid/static-data-grid';

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
    return '-';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecentMeetingsTable({ meetings }: { meetings: RecentMeetingDto[] }) {
  const t = useTranslations('dashboard');

  const data = useMemo<DatagridResponseDto<RecentMeetingDto>>(
    () => ({
      resource: 'dashboard-recent-meetings',
      columns: [
        { key: 'code', label: t('recent.columns.code'), type: 'text', sortable: false },
        { key: 'host', label: t('recent.columns.host'), type: 'custom', sortable: false },
        { key: 'status', label: t('recent.columns.status'), type: 'badge', sortable: false },
        {
          key: 'participantCount',
          label: t('recent.columns.participants'),
          type: 'number',
          sortable: false,
          align: 'right',
        },
        {
          key: 'durationMinutes',
          label: t('recent.columns.duration'),
          type: 'number',
          sortable: false,
          align: 'right',
        },
        {
          key: 'startedAt',
          label: t('recent.columns.started'),
          type: 'datetime',
          sortable: false,
          align: 'right',
        },
      ],
      filters: [],
      actions: [],
      rows: meetings,
      pagination: {
        page: 1,
        pageSize: Math.max(meetings.length, 1),
        total: meetings.length,
        totalPages: 1,
      },
      sort: null,
      searchable: false,
    }),
    [t, meetings],
  );

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{t('recent.title')}</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>
      <StaticDataGrid
        data={data as unknown as DatagridResponseDto}
        emptyMessage={t('recent.empty')}
        renderCell={(column, row) => {
          const meeting = row as unknown as RecentMeetingDto;
          switch (column.key) {
            case 'code':
              return <span className="font-mono text-xs">{meeting.code}</span>;
            case 'host':
              return (
                <div className="flex flex-col">
                  <span className="text-sm">{meeting.hostName}</span>
                  <span className="text-xs text-muted-foreground">{meeting.hostEmail}</span>
                </div>
              );
            case 'status':
              return (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                    statusClasses(meeting.status),
                  )}
                >
                  {t(`status.${meeting.status.toLowerCase()}`)}
                </span>
              );
            case 'participantCount':
              return <span className="block text-end tabular-nums">{meeting.participantCount}</span>;
            case 'durationMinutes':
              return (
                <span className="block text-end tabular-nums">
                  {meeting.durationMinutes !== null ? `${meeting.durationMinutes}m` : '-'}
                </span>
              );
            case 'startedAt':
              return (
                <span className="block text-end text-muted-foreground">
                  {formatRelative(meeting.startedAt)}
                </span>
              );
            default:
              return undefined;
          }
        }}
      />
    </section>
  );
}
