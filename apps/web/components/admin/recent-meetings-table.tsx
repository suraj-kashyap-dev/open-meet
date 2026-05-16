import type { RecentMeetingDto } from '@open-meet/types';

import { cn } from '@/lib/cn';

interface Props {
  meetings: RecentMeetingDto[];
}

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
  if (! iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecentMeetingsTable({ meetings }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight">Recent meetings</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>

      {meetings.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No meetings yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 font-medium">Code</th>
                <th className="px-5 py-2.5 font-medium">Host</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Participants</th>
                <th className="px-5 py-2.5 font-medium text-right">Duration</th>
                <th className="px-5 py-2.5 font-medium text-right">Started</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-mono text-xs">{m.code}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm">{m.hostName}</span>
                      <span className="text-xs text-muted-foreground">{m.hostEmail}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                        statusClasses(m.status),
                      )}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{m.participantCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {m.durationMinutes !== null ? `${m.durationMinutes}m` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {formatRelative(m.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
