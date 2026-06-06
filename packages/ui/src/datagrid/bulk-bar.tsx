'use client';

import type { DatagridActionDto } from '@open-meet/types';

import { ActionButton } from './action-button';

export interface BulkBarProps {
  count: number;
  actions: DatagridActionDto[];
  onAction: (key: string) => void;
}

export function BulkBar({ count, actions, onAction }: BulkBarProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm">
      <span>{count} selected</span>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <ActionButton key={action.key} action={action} onClick={() => onAction(action.key)} />
        ))}
      </div>
    </div>
  );
}
