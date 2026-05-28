import { describe, expect, it } from 'vitest';

import { isRailActive } from '@/components/web/shell/rail-active';

describe('isRailActive()', () => {
  it('should be active when the pathname equals the item href', () => {
    expect(isRailActive('/chat', '/chat')).toBe(true);
    expect(isRailActive('/meet', '/meet')).toBe(true);
  });

  it('should be active for nested routes under the item href', () => {
    expect(isRailActive('/chat/conversation-123', '/chat')).toBe(true);
    expect(isRailActive('/chat/new', '/chat')).toBe(true);
    expect(isRailActive('/history/abc123', '/history')).toBe(true);
  });

  it('should not be active for a different section', () => {
    expect(isRailActive('/meet', '/chat')).toBe(false);
    expect(isRailActive('/teams', '/chat')).toBe(false);
  });

  it('should not match a sibling href that merely shares a prefix', () => {
    expect(isRailActive('/teams-archive', '/teams')).toBe(false);
    expect(isRailActive('/chatter', '/chat')).toBe(false);
  });
});
