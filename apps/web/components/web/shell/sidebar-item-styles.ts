import { cn } from '@open-meet/ui/cn';

export function getSidebarNavItemClass(active: boolean) {
  return cn(
    'group relative flex items-center gap-2.5 rounded-2xl border border-transparent px-2.5 py-2 text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
    active
      ? 'border-border/70 bg-muted/80 text-foreground shadow-sm'
      : 'text-muted-foreground hover:border-border/60 hover:bg-muted/50 hover:text-foreground/80 focus-visible:border-border/60 focus-visible:bg-muted/50 focus-visible:text-foreground/80',
  );
}

export function getSidebarNavIconClass(active: boolean) {
  return cn(
    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-transparent transition-all',
    active
      ? 'border-border/70 bg-background text-foreground shadow-sm'
      : 'bg-muted/70 text-muted-foreground group-hover:bg-background group-hover:text-foreground/70 group-focus-visible:bg-background group-focus-visible:text-foreground/70',
  );
}

export function getSidebarNavLabelClass(active: boolean) {
  return cn(
    'truncate transition-colors',
    active
      ? 'font-semibold text-foreground'
      : 'group-hover:text-foreground/80 group-focus-visible:text-foreground/80',
  );
}

export function getSidebarCollapsedNavItemClass(active: boolean) {
  return cn(
    'group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
    active
      ? 'border-border/70 bg-muted/80 text-foreground shadow-sm'
      : 'text-muted-foreground hover:border-border/60 hover:bg-muted/50 hover:text-foreground/70 focus-visible:border-border/60 focus-visible:bg-muted/50 focus-visible:text-foreground/70',
  );
}
