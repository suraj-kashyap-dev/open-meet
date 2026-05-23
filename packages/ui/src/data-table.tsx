'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { type ReactNode } from 'react';

import { cn } from './cn';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyColumnDef<TData> = ColumnDef<TData, any>;

interface ColumnMeta {
  headerClassName?: string;
  cellClassName?: string;
}

interface Props<TData> {
  data: TData[];
  columns: AnyColumnDef<TData>[];
  isLoading?: boolean;
  emptyMessage?: ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  className?: string;
  tableClassName?: string;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  emptyMessage = 'No results',
  onRowClick,
  className,
  tableClassName,
}: Props<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card', className)}>
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm', tableClassName)}>
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as ColumnMeta | undefined;

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'whitespace-nowrap px-4 py-2.5 font-medium',
                        meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-border last:border-0',
                    onRowClick ? 'cursor-pointer hover:bg-muted/40' : 'hover:bg-muted/30',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColumnMeta | undefined;

                    return (
                      <td
                        key={cell.id}
                        className={cn('px-4 py-3 align-middle', meta?.cellClassName)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
