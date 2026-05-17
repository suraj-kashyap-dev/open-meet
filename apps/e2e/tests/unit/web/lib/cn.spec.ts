import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins simple class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('skips falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('expands conditional objects', () => {
    expect(cn('a', { b: true, c: false }, 'd')).toBe('a b d');
  });

  it('flattens arrays', () => {
    expect(cn(['a', ['b', 'c']], 'd')).toBe('a b c d');
  });

  it('lets later tailwind classes override earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm text-red-500', 'text-blue-500')).toBe('text-sm text-blue-500');
  });
});
