import { describe, expect, it } from 'vitest';

import type { DatagridDefinition } from '@/common/datagrid';
import { buildDatagrid, buildOrderBy, paginate, resolveSort } from '@/common/datagrid';

const def: DatagridDefinition = {
  resource: 'widgets',
  defaultSort: { key: 'createdAt', dir: 'desc' },
  searchable: true,
  searchPlaceholderKey: 'datagrid.widgets.search',
  columns: [
    { key: 'name', labelKey: 'datagrid.widgets.columns.name', type: 'text', sortable: true },
    { key: 'email', labelKey: 'datagrid.widgets.columns.email', type: 'text', sortable: true },
    {
      key: 'owner',
      labelKey: 'datagrid.widgets.columns.owner',
      type: 'text',
      sortable: true,
      sortField: 'owner.name',
    },
    {
      key: 'createdAt',
      labelKey: 'datagrid.widgets.columns.createdAt',
      type: 'date',
      sortable: true,
    },
    {
      key: 'actions',
      labelKey: 'datagrid.widgets.columns.actions',
      type: 'custom',
      sortable: false,
    },
  ],
  filters: [
    {
      key: 'status',
      labelKey: 'datagrid.widgets.filters.status',
      type: 'select',
      options: [{ value: 'ACTIVE', labelKey: 'datagrid.widgets.filters.status.active' }],
    },
  ],
  actions: [
    { key: 'edit', labelKey: 'datagrid.widgets.actions.edit', icon: 'pencil', scope: 'row' },
    {
      key: 'delete',
      labelKey: 'datagrid.widgets.actions.delete',
      icon: 'trash',
      scope: 'row',
      style: 'danger',
      confirm: true,
    },
  ],
};

const translate = (key: string) => `t:${key}`;

describe('paginate()', () => {
  it('applies defaults when page/pageSize are absent', () => {
    expect(paginate({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('computes skip/take from page and pageSize', () => {
    expect(paginate({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it('clamps below 1 and above the max page size', () => {
    expect(paginate({ page: 0, pageSize: 0 })).toEqual({ page: 1, pageSize: 1, skip: 0, take: 1 });

    expect(paginate({ pageSize: 5000 }).pageSize).toBe(100);
  });
});

describe('resolveSort()', () => {
  it('falls back to the default sort when none requested', () => {
    expect(resolveSort(def, {})).toEqual({ key: 'createdAt', dir: 'desc' });
  });

  it('honours a sortable column and direction', () => {
    expect(resolveSort(def, { sort: 'name', dir: 'asc' })).toEqual({ key: 'name', dir: 'asc' });
  });

  it('ignores a non-sortable column and falls back to default', () => {
    expect(resolveSort(def, { sort: 'actions', dir: 'asc' })).toEqual({
      key: 'createdAt',
      dir: 'desc',
    });
  });

  it('ignores an unknown column (injection guard)', () => {
    expect(resolveSort(def, { sort: 'password', dir: 'asc' })).toEqual({
      key: 'createdAt',
      dir: 'desc',
    });
  });
});

describe('buildOrderBy()', () => {
  it('maps a column key to a scalar Prisma orderBy', () => {
    expect(buildOrderBy(def, { sort: 'email', dir: 'asc' })).toEqual({ email: 'asc' });
  });

  it('supports dot-path sortField for relations', () => {
    expect(buildOrderBy(def, { sort: 'owner', dir: 'desc' })).toEqual({ owner: { name: 'desc' } });
  });

  it('uses the default sort for unknown/unsortable requests', () => {
    expect(buildOrderBy(def, { sort: 'nope' })).toEqual({ createdAt: 'desc' });
  });
});

describe('buildDatagrid()', () => {
  const rows = [{ id: 'a' }, { id: 'b' }];
  const result = buildDatagrid(
    def,
    { rows, total: 42, query: { page: 2, pageSize: 20, sort: 'name', dir: 'asc' } },
    translate,
  );

  it('resolves every label through translate', () => {
    expect(result.columns[0]).toMatchObject({
      key: 'name',
      label: 't:datagrid.widgets.columns.name',
      sortable: true,
    });

    expect(result.filters[0].label).toBe('t:datagrid.widgets.filters.status');

    expect(result.filters[0].options?.[0]).toEqual({
      value: 'ACTIVE',
      label: 't:datagrid.widgets.filters.status.active',
    });

    expect(result.actions[1]).toMatchObject({ key: 'delete', style: 'danger', confirm: true });
  });

  it('computes pagination meta and echoes resource + sort + rows', () => {
    expect(result.resource).toBe('widgets');

    expect(result.rows).toEqual(rows);

    expect(result.sort).toEqual({ key: 'name', dir: 'asc' });

    expect(result.pagination).toEqual({ page: 2, pageSize: 20, total: 42, totalPages: 3 });

    expect(result.searchable).toBe(true);

    expect(result.searchPlaceholder).toBe('t:datagrid.widgets.search');
  });

  it('never reports fewer than one total page', () => {
    expect(
      buildDatagrid(def, { rows: [], total: 0, query: {} }, translate).pagination.totalPages,
    ).toBe(1);
  });

  it('projects rows so each record is keyed by the column key via its field accessor', () => {
    const projectionDef: DatagridDefinition = {
      resource: 'groups',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'name', labelKey: 'l.name', type: 'text', field: 'title' },
        { key: 'members', labelKey: 'l.members', type: 'number', field: 'count.value' },
        { key: 'createdAt', labelKey: 'l.createdAt', type: 'datetime' },
      ],
    };

    const out = buildDatagrid(
      projectionDef,
      {
        rows: [{ id: 'g1', title: 'Eng', count: { value: 7 }, createdAt: 'x' }],
        total: 1,
        query: {},
      },
      translate,
    );

    expect(out.rows[0]).toMatchObject({
      id: 'g1',
      name: 'Eng',
      members: 7,
      createdAt: 'x',
    });
  });
});
