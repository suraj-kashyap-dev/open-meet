'use client';

import { type ReactNode } from 'react';

import type { DatagridColumnDto, DatagridResponseDto } from '@open-meet/types';

import { DataGridView } from '@open-meet/ui/datagrid/data-grid';

type Row = Record<string, unknown>;

const noop = () => {};

export interface StaticDataGridProps {
  data: DatagridResponseDto;
  renderCell?: (column: DatagridColumnDto, row: Row) => ReactNode | undefined;
  emptyMessage?: ReactNode;
}

export function StaticDataGrid({ data, renderCell, emptyMessage }: StaticDataGridProps) {
  return (
    <DataGridView
      data={data}
      isLoading={false}
      search=""
      filters={{}}
      page={1}
      onSearchChange={noop}
      onFilterChange={noop}
      onPageChange={noop}
      onToggleSort={noop}
      renderCell={renderCell}
      emptyMessage={emptyMessage}
    />
  );
}
