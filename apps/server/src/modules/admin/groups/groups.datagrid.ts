import type { DatagridDefinition } from '../../../common/datagrid';

export const GROUPS_DATAGRID: DatagridDefinition = {
  resource: 'groups',
  searchable: true,
  searchPlaceholderKey: 'datagrid.groups.search',
  defaultSort: { key: 'createdAt', dir: 'desc' },
  columns: [
    {
      key: 'name',
      labelKey: 'datagrid.groups.columns.name',
      type: 'text',
      sortable: true,
      sortField: 'title',
      field: 'title',
    },
    {
      key: 'members',
      labelKey: 'datagrid.groups.columns.members',
      type: 'number',
      sortable: true,
      sortField: 'members._count',
      field: 'memberCount',
      align: 'right',
      hideBelow: 'md',
    },
    {
      key: 'createdAt',
      labelKey: 'datagrid.groups.columns.createdAt',
      type: 'datetime',
      sortable: true,
      sortField: 'createdAt',
      hideBelow: 'sm',
    },
    {
      key: 'actions',
      labelKey: 'datagrid.groups.columns.actions',
      type: 'custom',
      sortable: false,
      align: 'right',
    },
  ],
  actions: [
    {
      key: 'create',
      labelKey: 'datagrid.groups.actions.create',
      icon: 'plus',
      style: 'primary',
      scope: 'toolbar',
      permission: 'groups.create',
    },
    {
      key: 'edit',
      labelKey: 'datagrid.groups.actions.edit',
      icon: 'pencil',
      scope: 'row',
      permission: 'groups.update',
    },
    {
      key: 'delete',
      labelKey: 'datagrid.groups.actions.delete',
      icon: 'trash',
      style: 'danger',
      confirm: true,
      scope: 'row',
      permission: 'groups.delete',
    },
  ],
};
