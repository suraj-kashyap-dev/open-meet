import type {
  DatagridActionDto,
  DatagridColumnDto,
  DatagridFilterDto,
  DatagridPaginationDto,
  DatagridResponseDto,
  DatagridSortDir,
  DatagridSortDto,
} from '@open-meet/types';

import type { DatagridDefinition } from './datagrid-definition';

/** The subset of query params the builder reads. Entity query DTOs are assignable to this. */
export interface DatagridQueryInput {
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: DatagridSortDir;
  search?: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function paginate(query: { page?: number; pageSize?: number }): Pagination {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Resolve the effective sort, allow-listed to sortable columns; falls back to the default. */
export function resolveSort(def: DatagridDefinition, query: DatagridQueryInput): DatagridSortDto {
  const dir: DatagridSortDir =
    query.dir === 'asc' || query.dir === 'desc' ? query.dir : def.defaultSort.dir;
  const requested = query.sort
    ? def.columns.find((c) => c.sortable && c.key === query.sort)
    : undefined;

  if (requested) {
    return { key: requested.key, dir };
  }

  return { ...def.defaultSort };
}

function toOrderBy(field: string, dir: DatagridSortDir): Record<string, unknown> {
  return field
    .split('.')
    .reverse()
    .reduce<Record<string, unknown> | DatagridSortDir>(
      (acc, key) => ({ [key]: acc }),
      dir,
    ) as Record<string, unknown>;
}

/** Build a Prisma `orderBy` object from the allow-listed sort. Never trusts raw `query.sort`. */
export function buildOrderBy(
  def: DatagridDefinition,
  query: DatagridQueryInput,
): Record<string, unknown> {
  const sort = resolveSort(def, query);
  const col = def.columns.find((c) => c.key === sort.key);
  const field = col?.sortField ?? col?.key ?? sort.key;

  return toOrderBy(field, sort.dir);
}

function valueAtPath(row: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

function projectRow<TRow>(def: DatagridDefinition, row: TRow): TRow {
  const source = row as Record<string, unknown>;
  const record: Record<string, unknown> = { ...source };

  for (const col of def.columns) {
    const field = col.field ?? col.key;
    if (field !== col.key) {
      record[col.key] = valueAtPath(source, field);
    }
  }

  return record as TRow;
}

export function buildDatagrid<TRow>(
  def: DatagridDefinition,
  data: { rows: TRow[]; total: number; query: DatagridQueryInput },
  translate: (key: string) => string,
): DatagridResponseDto<TRow> {
  const { page, pageSize } = paginate(data.query);
  const sort = resolveSort(def, data.query);

  const columns: DatagridColumnDto[] = def.columns.map((c) => ({
    key: c.key,
    label: translate(c.labelKey),
    type: c.type,
    sortable: Boolean(c.sortable),
    align: c.align,
    hideBelow: c.hideBelow,
  }));

  const filters: DatagridFilterDto[] = (def.filters ?? []).map((f) => ({
    key: f.key,
    label: translate(f.labelKey),
    type: f.type,
    options: f.options?.map((o) => ({ value: o.value, label: translate(o.labelKey) })),
    placeholder: f.placeholderKey ? translate(f.placeholderKey) : undefined,
  }));

  const actions: DatagridActionDto[] = (def.actions ?? []).map((a) => ({
    key: a.key,
    label: translate(a.labelKey),
    icon: a.icon,
    style: a.style,
    scope: a.scope,
    confirm: a.confirm,
    permission: a.permission,
  }));

  const pagination: DatagridPaginationDto = {
    page,
    pageSize,
    total: data.total,
    totalPages: Math.max(1, Math.ceil(data.total / pageSize)),
  };

  return {
    resource: def.resource,
    columns,
    filters,
    actions,
    rows: data.rows.map((row) => projectRow(def, row)),
    pagination,
    sort,
    searchable: Boolean(def.searchable),
    searchPlaceholder: def.searchPlaceholderKey ? translate(def.searchPlaceholderKey) : undefined,
  };
}
