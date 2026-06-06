'use client';

import { type ReactNode } from 'react';

import type { DatagridActionDto, DatagridResponseDto } from '@open-meet/types';

import { BulkBar } from './bulk-bar';
import { Pagination } from './pagination';
import { Table } from './table';
import { Toolbar } from './toolbar';
import type { Can, RenderCell, RowData } from './types';
import { useRowSelection } from './use-row-selection';

export interface DataGridViewProps {
  data: DatagridResponseDto | undefined;
  isLoading: boolean;
  search: string;
  filters: Record<string, string>;
  page: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onPageChange: (page: number) => void;
  onToggleSort: (key: string) => void;
  can?: Can;
  renderCell?: RenderCell;
  onAction?: (actionKey: string, row?: RowData) => void;
  onBulkAction?: (actionKey: string, ids: string[]) => void;
  emptyMessage?: ReactNode;
}

export function DataGridView({
  data,
  isLoading,
  search,
  filters,
  page,
  onSearchChange,
  onFilterChange,
  onPageChange,
  onToggleSort,
  can,
  renderCell,
  onAction,
  onBulkAction,
  emptyMessage,
}: DataGridViewProps) {
  const allowed = (action: DatagridActionDto) =>
    !action.permission || (can ? can(action.permission) : true);

  const columns = (data?.columns ?? []).filter((c) => c.key !== 'actions');
  const rows = (data?.rows ?? []) as RowData[];
  const allActions = data?.actions ?? [];
  const toolbarActions = allActions.filter((a) => a.scope === 'toolbar' && allowed(a));
  const rowActions = allActions.filter((a) => a.scope === 'row' && allowed(a));
  const bulkActions = allActions.filter((a) => a.scope === 'bulk' && allowed(a));
  const selectable = bulkActions.length > 0;

  const getRowId = (row: RowData, i: number) => (row.id as string) ?? String(i);
  const visibleIds = rows.map(getRowId);
  const sortKey = data?.sort ? `${data.sort.key}:${data.sort.dir}` : '';
  const resetKey = `${page}|${search}|${JSON.stringify(filters)}|${sortKey}`;
  const selection = useRowSelection(visibleIds, resetKey);

  return (
    <div className="space-y-4">
      <Toolbar
        searchable={data?.searchable}
        searchPlaceholder={data?.searchPlaceholder}
        search={search}
        onSearchChange={onSearchChange}
        filters={data?.filters ?? []}
        filterValues={filters}
        onFilterChange={onFilterChange}
        actions={toolbarActions}
        onAction={onAction}
      />

      {selectable ? (
        <BulkBar
          count={selection.selected.size}
          actions={bulkActions}
          onAction={(key) => {
            onBulkAction?.(key, [...selection.selected]);
            selection.clear();
          }}
        />
      ) : null}

      <Table
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        sort={data?.sort ?? null}
        onToggleSort={onToggleSort}
        rowActions={rowActions}
        onRowAction={onAction}
        renderCell={renderCell}
        emptyMessage={emptyMessage}
        selectable={selectable}
        isAllSelected={selection.isAllSelected}
        isSelected={(id) => selection.selected.has(id)}
        onToggleAll={selection.toggleAll}
        onToggleOne={selection.toggleOne}
        getRowId={getRowId}
      />

      <Pagination pagination={data?.pagination} page={page} onPageChange={onPageChange} />
    </div>
  );
}
