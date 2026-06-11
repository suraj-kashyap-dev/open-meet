'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import type { DatagridColumnDto, DatagridSortDto } from '@open-meet/types';

import { Checkbox } from '../checkbox';

import { columnClass } from './styles';

export interface HeaderProps {
  columns: DatagridColumnDto[];
  sort: DatagridSortDto | null;
  onToggleSort: (key: string) => void;
  selectable: boolean;
  isAllSelected: boolean;
  onToggleAll: () => void;
  hasRowActions: boolean;
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) {
    return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
  }

  return dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

export function Header({
  columns,
  sort,
  onToggleSort,
  selectable,
  isAllSelected,
  onToggleAll,
  hasRowActions,
}: HeaderProps) {
  return (
    <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
      <tr>
        {selectable ? (
          <th className="w-10 px-4 py-2.5">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onToggleAll}
              aria-label="Select all"
            />
          </th>
        ) : null}
        {columns.map((column) => (
          <th
            key={column.key}
            className={columnClass(column, 'whitespace-nowrap px-4 py-2.5 font-medium')}
          >
            {column.sortable ? (
              <button
                type="button"
                onClick={() => onToggleSort(column.key)}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                {column.label}
                <SortIcon active={sort?.key === column.key} dir={sort?.dir ?? 'asc'} />
              </button>
            ) : (
              column.label
            )}
          </th>
        ))}
        {hasRowActions ? <th className="px-4 py-2.5" /> : null}
      </tr>
    </thead>
  );
}
