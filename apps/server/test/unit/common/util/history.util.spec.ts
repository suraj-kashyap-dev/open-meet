import { describe, expect, it } from 'vitest';

import { ShareHistoryMode } from '@open-meet/types';

import { laterDate, resolveHistoryCutoff } from '@/common/util/history.util';

describe('laterDate()', () => {
  const early = new Date('2026-01-01T00:00:00.000Z');
  const late = new Date('2026-06-01T00:00:00.000Z');

  it('should return the other value when one side is null', () => {
    expect(laterDate(null, late)).toBe(late);

    expect(laterDate(early, null)).toBe(early);
  });

  it('should return null when both are null', () => {
    expect(laterDate(null, null)).toBeNull();
  });

  it('should return the later of two dates', () => {
    expect(laterDate(early, late)).toBe(late);

    expect(laterDate(late, early)).toBe(late);
  });
});

describe('resolveHistoryCutoff()', () => {
  const now = new Date('2026-06-11T12:00:00.000Z');

  it('should return null (full history) when history is omitted', () => {
    expect(resolveHistoryCutoff(undefined, now)).toBeNull();
  });

  it('should return null (full history) for ALL', () => {
    expect(resolveHistoryCutoff({ mode: ShareHistoryMode.ALL }, now)).toBeNull();
  });

  it('should return now (join time) for NONE', () => {
    expect(resolveHistoryCutoff({ mode: ShareHistoryMode.NONE }, now)).toEqual(now);
  });

  it('should back-date by the given number of days for DAYS', () => {
    const cutoff = resolveHistoryCutoff({ mode: ShareHistoryMode.DAYS, days: 7 }, now);

    expect(cutoff).toEqual(new Date('2026-06-04T12:00:00.000Z'));
  });

  it('should treat a missing/zero day count as the current instant', () => {
    expect(resolveHistoryCutoff({ mode: ShareHistoryMode.DAYS }, now)).toEqual(now);
  });
});
