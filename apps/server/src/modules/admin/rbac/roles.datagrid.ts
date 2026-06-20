import type { DatagridDefinition } from '../../../common/datagrid';

export const ROLES_DATAGRID: DatagridDefinition = {
  resource: 'roles',
  searchable: true,
  searchPlaceholderKey: 'datagrid.roles.search',
  defaultSort: { key: 'name', dir: 'asc' },
  columns: [
    {
      key: 'name',
      labelKey: 'datagrid.roles.columns.name',
      type: 'text',
      sortable: true,
      sortField: 'name',
    },
    {
      key: 'permissions',
      labelKey: 'datagrid.roles.columns.permissions',
      type: 'number',
      sortable: false,
      align: 'right',
      hideBelow: 'md',
    },
    {
      key: 'members',
      field: 'memberCount',
      labelKey: 'datagrid.roles.columns.members',
      type: 'number',
      sortable: false,
      align: 'right',
      hideBelow: 'lg',
    },
    {
      key: 'system',
      field: 'isSystem',
      labelKey: 'datagrid.roles.columns.system',
      type: 'badge',
      sortable: false,
    },
    {
      key: 'actions',
      labelKey: 'datagrid.roles.columns.actions',
      type: 'custom',
      sortable: false,
      align: 'right',
    },
  ],
  actions: [
    {
      key: 'create',
      labelKey: 'datagrid.roles.actions.create',
      icon: 'plus',
      style: 'primary',
      scope: 'toolbar',
      permission: 'roles.create',
    },
    {
      key: 'edit',
      labelKey: 'datagrid.roles.actions.edit',
      icon: 'pencil',
      scope: 'row',
      permission: 'roles.update',
    },
    {
      key: 'delete',
      labelKey: 'datagrid.roles.actions.delete',
      icon: 'trash',
      style: 'danger',
      confirm: true,
      scope: 'row',
      permission: 'roles.delete',
    },
  ],
};
