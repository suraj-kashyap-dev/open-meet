import { describe, expect, it } from 'vitest';

import { shouldHideMobileBottomNav } from '@/components/web/shell/mobile-nav-visibility';

describe('shouldHideMobileBottomNav', () => {
  it('should keep the mobile bottom nav visible on top-level shell destinations', () => {
    for (const pathname of ['/chat', '/meet', '/activity', '/saved', '/history']) {
      expect(shouldHideMobileBottomNav(pathname)).toBe(false);
    }
  });

  it('should hide the mobile bottom nav on focused chat detail routes', () => {
    for (const pathname of ['/chat/conversation-dm', '/chat/new']) {
      expect(shouldHideMobileBottomNav(pathname)).toBe(true);
    }
  });
});
