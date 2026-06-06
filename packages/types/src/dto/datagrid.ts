export type DatagridColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'badge'
  | 'avatar'
  | 'custom';

export type DatagridColumnAlign = 'left' | 'center' | 'right';

export type DatagridResponsiveHide = 'sm' | 'md' | 'lg';

export interface DatagridColumnDto {
  key: string;
  label: string;
  type: DatagridColumnType;
  sortable: boolean;
  align?: DatagridColumnAlign;
  hideBelow?: DatagridResponsiveHide;
}

export type DatagridFilterType = 'search' | 'select' | 'boolean';

export interface DatagridFilterOptionDto {
  value: string;
  label: string;
}

export interface DatagridFilterDto {
  key: string;
  label: string;
  type: DatagridFilterType;
  options?: DatagridFilterOptionDto[];
  placeholder?: string;
}

export type DatagridActionStyle = 'default' | 'primary' | 'danger';

export type DatagridActionScope = 'row' | 'bulk' | 'toolbar';

export interface DatagridActionDto {
  key: string;
  label: string;
  icon?: string;
  style?: DatagridActionStyle;
  scope: DatagridActionScope;
  confirm?: boolean;
  permission?: string;
}

export type DatagridSortDir = 'asc' | 'desc';

export interface DatagridSortDto {
  key: string;
  dir: DatagridSortDir;
}

export interface DatagridPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DatagridResponseDto<TRow = Record<string, unknown>> {
  resource: string;
  columns: DatagridColumnDto[];
  filters: DatagridFilterDto[];
  actions: DatagridActionDto[];
  rows: TRow[];
  pagination: DatagridPaginationDto;
  sort: DatagridSortDto | null;
  searchable: boolean;
  searchPlaceholder?: string;
}

export interface DatagridQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: DatagridSortDir;
  search?: string;
  [filterKey: string]: string | number | undefined;
}
