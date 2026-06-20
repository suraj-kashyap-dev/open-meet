import { describe, expect, it } from 'vitest';

import {
  formatHourLabel,
  getSeriesDelta,
  getSeriesLastValue,
  getSeriesTotal,
  pickPeakHour,
  sortTopHosts,
} from '@/features/dashboard/lib/chart-insights';

describe('chart insight helpers', () => {
  it('should summarize a daily series', () => {
    const series = [
      { date: '2026-05-18', count: 2 },
      { date: '2026-05-19', count: 5 },
      { date: '2026-05-20', count: 7 },
    ];

    expect(getSeriesTotal(series)).toBe(14);

    expect(getSeriesLastValue(series)).toBe(7);

    expect(getSeriesDelta(series)).toBe(2);
  });

  it('should pad hours and pick the busiest slot', () => {
    const series = [
      { hour: 1, count: 1 },
      { hour: 9, count: 8 },
      { hour: 18, count: 4 },
    ];

    expect(formatHourLabel(1)).toBe('01:00');

    expect(pickPeakHour(series)).toBe('09:00');
  });

  it('should sort top hosts by hosted count descending', () => {
    const hosts = [
      {
        id: 'host-2',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        hostedCount: 8,
        totalDurationMinutes: 240,
      },
      {
        id: 'host-1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        hostedCount: 14,
        totalDurationMinutes: 320,
      },
    ];

    expect(sortTopHosts(hosts).map((host) => host.id)).toEqual(['host-1', 'host-2']);
  });
});
