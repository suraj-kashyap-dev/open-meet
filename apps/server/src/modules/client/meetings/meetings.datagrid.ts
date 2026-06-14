import type { DatagridDefinition } from '@/common/datagrid';

export const HISTORY_DATAGRID: DatagridDefinition = {
  resource: 'history',
  searchable: false,
  defaultSort: { key: 'startedAt', dir: 'desc' },
  columns: [
    {
      key: 'meeting',
      labelKey: 'datagrid.history.columns.meeting',
      type: 'custom',
      sortable: false,
    },
    {
      key: 'startedAt',
      labelKey: 'datagrid.history.columns.started',
      type: 'datetime',
      sortable: false,
      hideBelow: 'sm',
    },
    {
      key: 'durationMinutes',
      labelKey: 'datagrid.history.columns.duration',
      type: 'number',
      sortable: false,
      hideBelow: 'md',
    },
    {
      key: 'participants',
      labelKey: 'datagrid.history.columns.participants',
      type: 'custom',
      sortable: false,
      hideBelow: 'md',
    },
    {
      key: 'activity',
      labelKey: 'datagrid.history.columns.activity',
      type: 'custom',
      sortable: false,
      align: 'right',
      hideBelow: 'lg',
    },
    { key: 'status', labelKey: 'datagrid.history.columns.status', type: 'badge', sortable: false },
  ],
  actions: [{ key: 'open', labelKey: 'datagrid.history.actions.open', icon: 'eye', scope: 'row' }],
};
