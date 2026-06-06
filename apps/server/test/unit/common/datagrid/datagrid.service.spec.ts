import { I18nContext } from 'nestjs-i18n';
import type { I18nService } from 'nestjs-i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatagridDefinition } from '@/common/datagrid';
import { DatagridService } from '@/common/datagrid';

const DEF: DatagridDefinition = {
  resource: 'widgets',
  searchable: true,
  searchPlaceholderKey: 'datagrid.widgets.search',
  defaultSort: { key: 'name', dir: 'asc' },
  columns: [
    { key: 'name', labelKey: 'datagrid.widgets.columns.name', type: 'text', sortable: true },
  ],
  actions: [{ key: 'edit', labelKey: 'datagrid.widgets.actions.edit', scope: 'row' }],
};

describe('DatagridService', () => {
  let i18n: { translate: ReturnType<typeof vi.fn> };
  let service: DatagridService;

  beforeEach(() => {
    i18n = { translate: vi.fn((key: string, opts: { lang: string }) => `${key}@${opts.lang}`) };
    service = new DatagridService(i18n as unknown as I18nService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves every label through i18n using the active request locale', () => {
    vi.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'fr' } as never);

    const res = service.build(DEF, { rows: [{ id: '1' }], total: 1, query: {} });

    expect(res.columns[0].label).toBe('datagrid.widgets.columns.name@fr');
    expect(res.actions[0].label).toBe('datagrid.widgets.actions.edit@fr');
    expect(res.searchPlaceholder).toBe('datagrid.widgets.search@fr');
    expect(i18n.translate).toHaveBeenCalledWith('datagrid.widgets.columns.name', { lang: 'fr' });
  });

  it('falls back to "en" when there is no active i18n context', () => {
    vi.spyOn(I18nContext, 'current').mockReturnValue(undefined as never);

    const res = service.build(DEF, { rows: [], total: 0, query: {} });

    expect(res.columns[0].label).toBe('datagrid.widgets.columns.name@en');
  });

  it('passes rows, resource and pagination straight through from buildDatagrid', () => {
    vi.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as never);
    const rows = [{ id: 'a' }, { id: 'b' }];

    const res = service.build(DEF, { rows, total: 7, query: { page: 1, pageSize: 5 } });

    expect(res.rows).toEqual(rows);
    expect(res.resource).toBe('widgets');
    expect(res.pagination).toEqual({ page: 1, pageSize: 5, total: 7, totalPages: 2 });
  });
});
