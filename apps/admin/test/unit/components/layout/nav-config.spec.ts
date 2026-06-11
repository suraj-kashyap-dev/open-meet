import { describe, expect, it } from 'vitest';

import { isActive } from '@/components/layout/nav-config';

describe('isActive()', () => {
  it('should match the dashboard only on the exact root path', () => {
    expect(isActive('/', '/')).toBe(true);

    expect(isActive('/users', '/')).toBe(false);
  });

  it('should match a section on its exact path', () => {
    expect(isActive('/users', '/users')).toBe(true);
  });

  it('should match nested paths under a section', () => {
    expect(isActive('/users/abc-123', '/users')).toBe(true);
  });

  it('should not match a sibling section that merely shares a prefix', () => {
    expect(isActive('/meetings', '/users')).toBe(false);

    expect(isActive('/users-archive', '/users')).toBe(false);
  });
});
