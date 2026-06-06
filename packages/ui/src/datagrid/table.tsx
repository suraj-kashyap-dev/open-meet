'use client';

import { type ReactNode } from 'react';

import type { DatagridActionDto, DatagridColumnDto, DatagridSortDto } from '@open-meet/types';

import { Header } from './header';
import { Row } from './row';
import type { RenderCell, RowData } from './types';

export interface TableProps {
  columns: DatagridColumnDto[];
  rows: RowData[];
  isLoading: boolean;
  sort: DatagridSortDto | null;
  onToggleSort: (key: string) => void;
  rowActions: DatagridActionDto[];
  onRowAction?: (key: string, row: RowData) => void;
  renderCell?: RenderCell;
  emptyMessage?: ReactNode;
  selectable: boolean;
  isAllSelected: boolean;
  isSelected: (id: string) => boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  getRowId: (row: RowData, index: number) => string;
}

function StatusRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

export function Table({
  columns,
  rows,
  isLoading,
  sort,
  onToggleSort,
  rowActions,
  onRowAction,
  renderCell,
  emptyMessage,
  selectable,
  isAllSelected,
  isSelected,
  onToggleAll,
  onToggleOne,
  getRowId,
}: TableProps) {
  const colSpan = columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <Header
            columns={columns}
            sort={sort}
            onToggleSort={onToggleSort}
            selectable={selectable}
            isAllSelected={isAllSelected}
            onToggleAll={onToggleAll}
            hasRowActions={rowActions.length > 0}
          />
          <tbody>
            {isLoading ? (
              <StatusRow colSpan={colSpan}>Loading…</StatusRow>
            ) : rows.length === 0 ? (
              <StatusRow colSpan={colSpan}>{emptyMessage ?? 'No results'}</StatusRow>
            ) : (
              rows.map((row, i) => {
                const id = getRowId(row, i);
                return (
                  <Row
                    key={id}
                    row={row}
                    columns={columns}
                    selectable={selectable}
                    isSelected={isSelected(id)}
                    onToggleSelect={() => onToggleOne(id)}
                    rowActions={rowActions}
                    onRowAction={onRowAction}
                    renderCell={renderCell}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
