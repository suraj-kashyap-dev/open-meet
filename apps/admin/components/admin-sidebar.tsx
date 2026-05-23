'use client';

import { cn } from '@open-meet/ui/cn';

import { AdminSidebarContent } from './admin-sidebar-content';

interface Props {
  open: boolean;
}

export function AdminSidebar({ open }: Props) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 ease-out lg:flex',
        open ? 'translate-x-0' : 'pointer-events-none -translate-x-full',
      )}
    >
      <AdminSidebarContent />
    </aside>
  );
}
