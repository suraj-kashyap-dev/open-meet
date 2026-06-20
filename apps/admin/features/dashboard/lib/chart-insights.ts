import type { AdminConcurrencyPointDto, AdminTopHostDto, DailyCountPoint } from '@open-meet/types';

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function getSeriesTotal(series: DailyCountPoint[]): number {
  return series.reduce((sum, point) => sum + point.count, 0);
}

export function getSeriesLastValue(series: DailyCountPoint[]): number {
  return series.at(-1)?.count ?? 0;
}

export function getSeriesDelta(series: DailyCountPoint[]): number {
  if (series.length < 2) {
    return 0;
  }

  const last = series.at(-1);
  const previous = series.at(-2);

  if (!last || !previous) {
    return 0;
  }

  return last.count - previous.count;
}

export function pickPeakHour(series: AdminConcurrencyPointDto[]): string {
  let peak = -1;
  let hour = -1;

  for (const point of series) {
    if (point.count > peak) {
      peak = point.count;

      hour = point.hour;
    }
  }

  if (peak <= 0 || hour < 0) {
    return '-';
  }

  return formatHourLabel(hour);
}

export function sortTopHosts(hosts: AdminTopHostDto[]): AdminTopHostDto[] {
  return [...hosts].sort((left, right) => right.hostedCount - left.hostedCount);
}
