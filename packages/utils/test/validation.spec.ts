import { describe, expect, it } from 'vitest';

import { clamp, isEmail, isStrongPassword } from '../src/validation';

describe('isEmail()', () => {
  it('should accept a normal address and reject malformed ones', () => {
    expect(isEmail('a@b.com')).toBe(true);
    expect(isEmail('bad')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a b@c.com')).toBe(false);
  });
});

describe('isStrongPassword()', () => {
  it('should require at least 8 characters', () => {
    expect(isStrongPassword('12345678')).toBe(true);
    expect(isStrongPassword('1234567')).toBe(false);
  });
});

describe('clamp()', () => {
  it('should bound the value within [min, max]', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });
});
