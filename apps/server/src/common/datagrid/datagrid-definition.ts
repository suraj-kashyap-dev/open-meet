import type {
  DatagridActionScope,
  DatagridActionStyle,
  DatagridColumnAlign,
  DatagridColumnType,
  DatagridFilterType,
  DatagridResponsiveHide,
  DatagridSortDir,
} from '@open-meet/types';

export interface DatagridColumnDef {
  key: string;
  labelKey: string;
  type: DatagridColumnType;
  sortable?: boolean;
  /** Prisma orderBy field path (supports dot notation for relations). Defaults to `key`. */
  sortField?: string;
  field?: string;
  align?: DatagridColumnAlign;
  hideBelow?: DatagridResponsiveHide;
}

export interface DatagridFilterOptionDef {
  value: string;
  labelKey: string;
}

export interface DatagridFilterDef {
  key: string;
  labelKey: string;
  type: DatagridFilterType;
  options?: DatagridFilterOptionDef[];
  placeholderKey?: string;
}

export interface DatagridActionDef {
  key: string;
  labelKey: string;
  icon?: string;
  style?: DatagridActionStyle;
  scope: DatagridActionScope;
  confirm?: boolean;
  permission?: string;
}

export interface DatagridDefinition {
  resource: string;
  defaultSort: { key: string; dir: DatagridSortDir };
  columns: DatagridColumnDef[];
  filters?: DatagridFilterDef[];
  actions?: DatagridActionDef[];
  searchable?: boolean;
  searchPlaceholderKey?: string;
}
