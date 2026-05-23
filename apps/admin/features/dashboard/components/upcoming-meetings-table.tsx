'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import type { AdminUpcomingMeetingDto } from '@open-meet/types';

import { DataTable } from '@open-meet/ui/data-table';
import { cn } from '@open-meet/ui/cn';

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
    return '—';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function recurrenceLabel(rrule: string | null): string | null {
  if (!rrule) {
    return null;
  }

  const freq = rrule.match(/FREQ=([A-Z]+)/);

  if (!freq) {
    return 'Repeats';
  }

  switch (freq[1]) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'YEARLY':
      return 'Yearly';
    default:
      return 'Repeats';
  }
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

const column = createColumnHelper<AdminUpcomingMeetingDto>();

export function UpcomingMeetingsTable({ meetings }: { meetings: AdminUpcomingMeetingDto[] }) {
  const columns = useMemo(
    () => [
      column.accessor('code', {
        header: 'Code',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      column.display({
        id: 'title',
        header: 'Title',
        cell: ({ row }) => {
          const repeats = recurrenceLabel(row.original.recurrence);

          return (
            <div className="flex items-center gap-2">
              <span className="truncate text-sm">
                {row.original.title ?? `Meeting on ${formatScheduled(row.original.scheduledFor)}`}
              </span>

              {repeats ? (
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {repeats}
                </span>
              ) : null}
            </div>
          );
        },
      }),
      column.display({
        id: 'host',
        header: 'Host',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.hostName}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostEmail}</span>
          </div>
        ),
      }),
      column.accessor('inviteeCount', {
        header: () => <span className="block text-right">Invitees</span>,
        cell: (info) => <span className="block text-right tabular-nums">{info.getValue()}</span>,
      }),
      column.accessor('durationMin', {
        header: () => <span className="block text-right">Duration</span>,
        cell: (info) => (
          <span className="block text-right tabular-nums">{formatDuration(info.getValue())}</span>
        ),
      }),
      column.accessor('scheduledFor', {
        header: () => <span className="block text-right">When</span>,
        cell: (info) => {
          const startsIn = minutesUntil(info.getValue());
          const isStartingSoon = startsIn >= 0 && startsIn <= 15;

          return (
            <span
              className={cn(
                'block text-right text-muted-foreground',
                isStartingSoon && 'font-medium text-accent',
              )}
            >
              {formatScheduled(info.getValue())}
            </span>
          );
        },
      }),
    ],
    [],
  );

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Coming up</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>
      <DataTable data={meetings} columns={columns} emptyMessage="No scheduled meetings." />
    </section>
  );
}
