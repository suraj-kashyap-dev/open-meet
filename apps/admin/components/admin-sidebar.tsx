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
        'fixed inset-y-0 start-0 z-40 hidden shrink-0 flex-col border-e border-border bg-card transition-[width] duration-200 ease-out lg:flex',
        open ? 'w-64' : 'w-16',
      )}
    >
      <AdminSidebarContent collapsed={!open} />
    </aside>
  );
}
