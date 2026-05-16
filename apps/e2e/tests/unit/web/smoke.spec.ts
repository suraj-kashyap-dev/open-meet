import { describe, expect, it } from 'vitest';

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('has jsdom globals', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('exposes env vars from setup', () => {
    expect(process.env.NEXT_PUBLIC_API_URL).toBe('http://localhost:3001');
  });
});
