import type { ReactNode } from 'react';

import type { DatagridColumnDto } from '@open-meet/types';

import type { RowData } from './types';

/** Default cell rendering by column type. Reuse inside a custom `renderCell` to keep formatting consistent. */
export function Cell({ column, row }: { column: DatagridColumnDto; row: RowData }): ReactNode {
  const value = row[column.key];

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (column.type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      return new Date(String(value)).toLocaleDateString();
    case 'datetime':
      return new Date(String(value)).toLocaleString();
    case 'badge':
      return (
        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {String(value)}
        </span>
      );
    default:
      return String(value);
  }
}
