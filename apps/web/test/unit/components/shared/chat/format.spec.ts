import { describe, expect, it } from 'vitest';

import { byteSize, formatTime } from '@/components/shared/chat/format';

describe('byteSize()', () => {
  it('should report bytes below 1 KiB', () => {
    expect(byteSize(0)).toEqual({ unit: 'B', bytes: 0 });

    expect(byteSize(1023)).toEqual({ unit: 'B', bytes: 1023 });
  });

  it('should switch to KB at 1024 bytes and round to whole units', () => {
    expect(byteSize(1024)).toEqual({ unit: 'KB', kb: '1' });

    expect(byteSize(1536)).toEqual({ unit: 'KB', kb: '2' });
  });

  it('should switch to MB at 1 MiB with one decimal place', () => {
    expect(byteSize(1024 * 1024)).toEqual({ unit: 'MB', mb: '1.0' });

    expect(byteSize(1.5 * 1024 * 1024)).toEqual({ unit: 'MB', mb: '1.5' });
  });
});

describe('formatTime()', () => {
  it('should render an ISO timestamp as a 2-digit clock time', () => {
    const formatted = formatTime('2026-05-27T13:05:00.000Z');

    expect(formatted).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});
