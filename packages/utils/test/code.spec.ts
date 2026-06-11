import { describe, expect, it } from 'vitest';

import { generateMeetingCode, isValidMeetingCode, normalizeMeetingCode } from '../src/code';

describe('generateMeetingCode()', () => {
  it('should map bytes through the alphabet into a grouped xxxx-xxxx-xxxx code', () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const code = generateMeetingCode(() => bytes);

    expect(code).toBe('abcd-efgh-ijkm');

    expect(isValidMeetingCode(code)).toBe(true);
  });

  it('should wrap byte values modulo the alphabet length', () => {
    const code = generateMeetingCode(() => new Uint8Array(12).fill(32));

    expect(code).toBe('aaaa-aaaa-aaaa');
  });
});

describe('isValidMeetingCode()', () => {
  it('should accept a well-formed lowercase code', () => {
    expect(isValidMeetingCode('abcd-efgh-ijkm')).toBe(true);
  });

  it('should reject uppercase, ambiguous chars, wrong length, and missing groups', () => {
    expect(isValidMeetingCode('ABCD-EFGH-IJKM')).toBe(false);

    expect(isValidMeetingCode('ab1d-efgh-ijkm')).toBe(false);

    expect(isValidMeetingCode('abc-efgh-ijkm')).toBe(false);

    expect(isValidMeetingCode('abcdefghijkm')).toBe(false);
  });
});

describe('normalizeMeetingCode()', () => {
  it('should trim surrounding whitespace and lowercase', () => {
    expect(normalizeMeetingCode('  ABCD-EFGH-IJKM ')).toBe('abcd-efgh-ijkm');
  });
});
