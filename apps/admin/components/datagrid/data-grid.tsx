'use client';

import { type ReactNode } from 'react';

import type { DatagridColumnDto } from '@open-meet/types';

import { DataGridView } from '@open-meet/ui/datagrid/data-grid';

import { useCurrentAdminMe } from '@/features/auth/hooks/use-admin-auth';
import { useDatagrid } from '@/features/datagrid/hooks/use-datagrid';

type Row = Record<string, unknown>;

export interface DataGridProps {
  resource: string;
  renderCell?: (column: DatagridColumnDto, row: Row) => ReactNode | undefined;
  onAction?: (actionKey: string, row?: Row) => void;
  onBulkAction?: (actionKey: string, ids: string[]) => void;
  emptyMessage?: ReactNode;
}

export function DataGrid({ resource, ...rest }: DataGridProps) {
  const { data, isLoading, search, setSearch, filters, setFilter, page, setPage, toggleSort } =
    useDatagrid(resource);
  const { data: me } = useCurrentAdminMe();

  const can = (permission: string) => {
    if (!me) {
      return false;
    }

    if (me.role?.permissionType === 'ALL') {
      return true;
    }

    return me.grantedSet.includes(permission as never);
  };

  return (
    <DataGridView
      data={data}
      isLoading={isLoading}
      search={search}
      filters={filters}
      page={page}
      onSearchChange={setSearch}
      onFilterChange={setFilter}
      onPageChange={setPage}
      onToggleSort={toggleSort}
      can={can}
      {...rest}
    />
  );
}
