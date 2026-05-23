import { afterEach, describe, expect, it, vi } from 'vitest';

import { elapsedSeconds, formatDuration } from '../src/duration';

describe('formatDuration()', () => {
  it('should format mm:ss under an hour', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(59)).toBe('00:59');
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('should format hh:mm:ss at and beyond an hour', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('should floor fractional seconds', () => {
    expect(formatDuration(90.9)).toBe('01:30');
  });

  it('should clamp invalid input to 00:00', () => {
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00');
    expect(formatDuration(Number.NaN)).toBe('00:00');
  });
});

describe('elapsedSeconds()', () => {
  afterEach(() => vi.useRealTimers());

  it('should return seconds since the start, never negative', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T00:00:10Z'));
    expect(elapsedSeconds(new Date('2026-05-01T00:00:00Z'))).toBe(10);
    expect(elapsedSeconds('2026-05-01T00:00:10Z')).toBe(0);
    // a start in the future clamps to 0
    expect(elapsedSeconds(new Date('2026-05-01T00:00:20Z'))).toBe(0);
  });
});
