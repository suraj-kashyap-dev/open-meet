'use client';

import type { DatagridActionDto } from '@open-meet/types';

import { Button } from '../button';
import { cn } from '../cn';

import { ACTION_ICONS } from './icons';

export interface ActionButtonProps {
  action: DatagridActionDto;
  onClick: () => void;
  className?: string;
}

export function ActionButton({ action, onClick, className }: ActionButtonProps) {
  const Icon = action.icon ? ACTION_ICONS[action.icon] : undefined;
  const danger = action.style === 'danger';

  return (
    <Button
      type="button"
      size="sm"
      variant={action.style === 'primary' ? 'default' : 'ghost'}
      aria-label={action.label}
      onClick={onClick}
      className={cn('gap-2', danger && 'text-destructive hover:text-destructive', className)}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span className={action.scope === 'row' ? 'hidden sm:inline' : undefined}>{action.label}</span>
    </Button>
  );
}
