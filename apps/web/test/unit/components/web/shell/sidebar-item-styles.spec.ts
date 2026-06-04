import { describe, expect, it } from 'vitest';

import {
  getSidebarCollapsedNavItemClass,
  getSidebarNavIconClass,
  getSidebarNavItemClass,
  getSidebarNavLabelClass,
} from '@/components/web/shell/sidebar-item-styles';

describe('sidebar item styles', () => {
  it('should give active expanded items the same selected-card treatment as chat rows', () => {
    expect(getSidebarNavItemClass(true)).toContain('border-border/70');
    expect(getSidebarNavItemClass(true)).toContain('bg-muted/80');
    expect(getSidebarNavItemClass(true)).toContain('shadow-sm');
    expect(getSidebarNavLabelClass(true)).toContain('text-foreground');
    expect(getSidebarNavIconClass(true)).toContain('bg-background');
  });

  it('should keep inactive expanded items on the softer hover treatment', () => {
    expect(getSidebarNavItemClass(false)).toContain('hover:border-border/60');
    expect(getSidebarNavItemClass(false)).toContain('hover:bg-muted/50');
    expect(getSidebarNavIconClass(false)).toContain('bg-muted/70');
  });

  it('should apply the same card-like active state to collapsed rail items', () => {
    expect(getSidebarCollapsedNavItemClass(true)).toContain('border-border/70');
    expect(getSidebarCollapsedNavItemClass(true)).toContain('bg-muted/80');
    expect(getSidebarCollapsedNavItemClass(true)).toContain('shadow-sm');
  });
});
