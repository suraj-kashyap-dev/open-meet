import { describe, expect, it } from 'vitest';

import {
  getSidebarCollapsedNavItemClass,
  getSidebarNavIconClass,
  getSidebarNavItemClass,
  getSidebarNavLabelClass,
} from '@/components/web/shell/sidebar-item-styles';

describe('sidebar item styles', () => {
  it('should give active expanded items the accent treatment', () => {
    expect(getSidebarNavItemClass(true)).toContain('border-accent/20');

    expect(getSidebarNavItemClass(true)).toContain('bg-accent/10');

    expect(getSidebarNavItemClass(true)).toContain('text-accent');

    expect(getSidebarNavItemClass(true)).toContain('shadow-sm');

    expect(getSidebarNavLabelClass(true)).toContain('text-accent');

    expect(getSidebarNavIconClass(true)).toContain('bg-accent/15');
  });

  it('should keep inactive expanded items on the softer hover treatment', () => {
    expect(getSidebarNavItemClass(false)).toContain('hover:border-border/60');

    expect(getSidebarNavItemClass(false)).toContain('hover:bg-muted/50');

    expect(getSidebarNavIconClass(false)).toContain('bg-muted/70');
  });

  it('should apply the same accent active state to collapsed rail items', () => {
    expect(getSidebarCollapsedNavItemClass(true)).toContain('border-accent/20');

    expect(getSidebarCollapsedNavItemClass(true)).toContain('bg-accent/10');

    expect(getSidebarCollapsedNavItemClass(true)).toContain('text-accent');

    expect(getSidebarCollapsedNavItemClass(true)).toContain('shadow-sm');
  });
});
