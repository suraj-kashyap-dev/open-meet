'use client';

import type { DatagridActionDto, DatagridFilterDto } from '@open-meet/types';

import { Input } from '../input';

import { ActionButton } from './action-button';
import { Filter } from './filter';

export interface ToolbarProps {
  searchable?: boolean;
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  filters: DatagridFilterDto[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  actions: DatagridActionDto[];
  onAction?: (key: string) => void;
}

export function Toolbar({
  searchable,
  searchPlaceholder,
  search,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  actions,
  onAction,
}: ToolbarProps) {
  if (!searchable && filters.length === 0 && actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchable ? (
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search…'}
            className="h-9 w-full max-w-xs"
          />
        ) : null}
        {filters.map((filter) => (
          <Filter
            key={filter.key}
            filter={filter}
            value={filterValues[filter.key] ?? ''}
            onChange={(v) => onFilterChange(filter.key, v)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <ActionButton key={action.key} action={action} onClick={() => onAction?.(action.key)} />
        ))}
      </div>
    </div>
  );
}
