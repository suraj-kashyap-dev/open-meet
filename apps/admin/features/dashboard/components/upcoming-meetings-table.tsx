'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { AdminUpcomingMeetingDto, DatagridResponseDto } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';

import { StaticDataGrid } from '@/components/datagrid/static-data-grid';

function formatScheduled(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
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

type RecurrenceKey = 'repeats' | 'daily' | 'weekly' | 'monthly' | 'yearly';

function recurrenceKey(rrule: string | null): RecurrenceKey | null {
  if (!rrule) {
    return null;
  }

  const freq = rrule.match(/FREQ=([A-Z]+)/);

  if (!freq) {
    return 'repeats';
  }

  switch (freq[1]) {
    case 'DAILY':
      return 'daily';
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'YEARLY':
      return 'yearly';
    default:
      return 'repeats';
  }
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

export function UpcomingMeetingsTable({ meetings }: { meetings: AdminUpcomingMeetingDto[] }) {
  const t = useTranslations('dashboard');

  const data = useMemo<DatagridResponseDto<AdminUpcomingMeetingDto>>(
    () => ({
      resource: 'dashboard-upcoming-meetings',
      columns: [
        { key: 'code', label: t('upcoming.columns.code'), type: 'text', sortable: false },
        { key: 'title', label: t('upcoming.columns.title'), type: 'custom', sortable: false },
        { key: 'host', label: t('upcoming.columns.host'), type: 'custom', sortable: false },
        {
          key: 'inviteeCount',
          label: t('upcoming.columns.invitees'),
          type: 'number',
          sortable: false,
          align: 'right',
        },
        {
          key: 'durationMin',
          label: t('upcoming.columns.duration'),
          type: 'number',
          sortable: false,
          align: 'right',
        },
        {
          key: 'scheduledFor',
          label: t('upcoming.columns.when'),
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
        <h3 className="text-sm font-semibold tracking-tight">{t('upcoming.title')}</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>
      <StaticDataGrid
        data={data as unknown as DatagridResponseDto}
        emptyMessage={t('upcoming.empty')}
        renderCell={(column, row) => {
          const meeting = row as unknown as AdminUpcomingMeetingDto;

          switch (column.key) {
            case 'code':
              return <span className="font-mono text-xs">{meeting.code}</span>;

            case 'title': {
              const repeats = recurrenceKey(meeting.recurrence);

              return (
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm">
                    {meeting.title ??
                      t('upcoming.untitled', { date: formatScheduled(meeting.scheduledFor) })}
                  </span>
                  {repeats ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t(`upcoming.recurrence.${repeats}`)}
                    </span>
                  ) : null}
                </div>
              );
            }

            case 'host':
              return (
                <div className="flex flex-col">
                  <span className="text-sm">{meeting.hostName}</span>
                  <span className="text-xs text-muted-foreground">{meeting.hostEmail}</span>
                </div>
              );
            case 'inviteeCount':
              return <span className="block text-end tabular-nums">{meeting.inviteeCount}</span>;
            case 'durationMin':
              return (
                <span className="block text-end tabular-nums">
                  {formatDuration(meeting.durationMin)}
                </span>
              );

            case 'scheduledFor': {
              const startsIn = minutesUntil(meeting.scheduledFor);
              const isStartingSoon = startsIn >= 0 && startsIn <= 15;

              return (
                <span
                  className={cn(
                    'block text-end text-muted-foreground',
                    isStartingSoon && 'font-medium text-accent',
                  )}
                >
                  {formatScheduled(meeting.scheduledFor)}
                </span>
              );
            }

            default:
              return undefined;
          }
        }}
      />
    </section>
  );
}
