'use client';

import type { DatagridActionDto, DatagridColumnDto } from '@open-meet/types';

import { Checkbox } from '../checkbox';

import { ActionButton } from './action-button';
import { Cell } from './cell';
import { columnClass } from './styles';
import type { RenderCell, RowData } from './types';

export interface RowProps {
  row: RowData;
  columns: DatagridColumnDto[];
  selectable: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  rowActions: DatagridActionDto[];
  onRowAction?: (key: string, row: RowData) => void;
  renderCell?: RenderCell;
}

export function Row({
  row,
  columns,
  selectable,
  isSelected,
  onToggleSelect,
  rowActions,
  onRowAction,
  renderCell,
}: RowProps) {
  return (
    <tr className="border-b border-border last:border-0">
      {selectable ? (
        <td className="w-10 px-4 py-3 align-middle">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label="Select row" />
        </td>
      ) : null}
      {columns.map((column) => (
        <td key={column.key} className={columnClass(column, 'px-4 py-3 align-middle')}>
          {renderCell?.(column, row) ?? <Cell column={column} row={row} />}
        </td>
      ))}
      {rowActions.length > 0 ? (
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center justify-end gap-1">
            {rowActions.map((action) => (
              <ActionButton
                key={action.key}
                action={action}
                onClick={() => onRowAction?.(action.key, row)}
              />
            ))}
          </div>
        </td>
      ) : null}
    </tr>
  );
}
