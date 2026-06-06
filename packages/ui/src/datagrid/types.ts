import type { ReactNode } from 'react';

import type { DatagridColumnDto } from '@open-meet/types';

export type RowData = Record<string, unknown>;

export type RenderCell = (column: DatagridColumnDto, row: RowData) => ReactNode | undefined;

export type Can = (permission: string) => boolean;
