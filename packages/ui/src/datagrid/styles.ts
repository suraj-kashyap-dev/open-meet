import type { DatagridColumnAlign, DatagridResponsiveHide } from '@open-meet/types';

import { cn } from '../cn';

export const HIDE_BELOW: Record<DatagridResponsiveHide, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

export const ALIGN: Record<DatagridColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function columnClass(
  column: { align?: DatagridColumnAlign; hideBelow?: DatagridResponsiveHide },
  ...extra: Array<string | false | undefined>
): string {
  return cn(
    column.align && ALIGN[column.align],
    column.hideBelow && HIDE_BELOW[column.hideBelow],
    ...extra,
  );
}
