import type {
  AdminAccountDto,
  AdminBrandingDto,
  AdminDeepAnalyticsDto,
  AdminDto,
  AdminGroupDetailDto,
  AdminGroupDto,
  DatagridResponseDto,
  AdminInviteListResponseDto,
  AdminInviteLookupDto,
  AdminLoginResponseDto,
  AdminMeResponseDto,
  AdminMeetingDto,
  AdminStatsOverviewDto,
  AdminUserListResponseDto,
  PermissionCatalogResponseDto,
  RoleListResponseDto,
  UserInviteListResponseDto,
  WorkspaceConfigDto,
} from '@open-meet/types';
import { ADMIN_PERMISSION_KEYS, PERMISSION_TREE_ADMIN, buildCatalogTree } from '@open-meet/types';

function dailySeries(days: number): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date('2026-05-20T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: (i * 3) % 11 });
  }

  return out;
}

function hourlySeries(): { hour: number; count: number }[] {
  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour % 6 }));
}

export const currentAdmin: AdminDto = {
  id: 'admin-root',
  email: 'root@admin.test',
  name: 'Root Admin',
  role: { id: 'role_sys_admin', name: 'Administrator', permissionType: 'ALL' },
  avatar: null,
  createdAt: '2026-01-02T09:00:00.000Z',
  lastLoginAt: '2026-05-20T08:30:00.000Z',
};

export const currentAdminMe: AdminMeResponseDto = {
  admin: currentAdmin,
  role: { id: 'role_sys_admin', name: 'Administrator', permissionType: 'ALL' },
  grantedSet: [],
};

export const loginResponse: AdminLoginResponseDto = { admin: currentAdmin };

export const overview: AdminStatsOverviewDto = {
  totals: { users: 128, meetings: 342, activeMeetings: 3, messagesLast24h: 87, groups: 9 },
  trends: { signups: dailySeries(14), meetings: dailySeries(14) },
  recentMeetings: [
    {
      id: 'm-1',
      code: 'abcd-efgh-ijkl',
      title: 'Quarterly review',
      hostName: 'Ada Lovelace',
      hostEmail: 'ada@example.com',
      status: 'ENDED',
      startedAt: '2026-05-19T14:00:00.000Z',
      endedAt: '2026-05-19T14:45:00.000Z',
      durationMinutes: 45,
      participantCount: 6,
    },
  ],
  upcomingMeetings: [],
};

export const usersList: AdminUserListResponseDto = {
  page: 1,
  pageSize: 20,
  total: 2,
  items: [
    {
      id: 'u-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar: null,
      timezone: 'UTC',
      language: 'en',
      bio: null,
      chatDisabled: false,
      canCreateGroups: true,
      createdAt: '2026-02-10T10:00:00.000Z',
      meetingsHosted: 12,
      meetingsAttended: 30,
    },
    {
      id: 'u-2',
      name: 'Alan Turing',
      email: 'alan@example.com',
      avatar: null,
      timezone: 'Europe/London',
      language: 'en',
      bio: 'Codebreaker',
      chatDisabled: false,
      canCreateGroups: true,
      createdAt: '2026-03-01T11:30:00.000Z',
      meetingsHosted: 4,
      meetingsAttended: 9,
    },
  ],
};

export const meetingsList: { items: AdminMeetingDto[] } = {
  items: [
    {
      id: 'm-1',
      code: 'abcd-efgh-ijkl',
      title: 'Quarterly review',
      status: 'ACTIVE',
      hostId: 'u-1',
      hostName: 'Ada Lovelace',
      hostEmail: 'ada@example.com',
      startedAt: '2026-05-20T09:00:00.000Z',
      endedAt: null,
      createdAt: '2026-05-20T08:55:00.000Z',
      durationMinutes: null,
      participantCount: 5,
      activeParticipantCount: 5,
      messageCount: 23,
    },
  ],
};

export const deepAnalytics: AdminDeepAnalyticsDto = {
  averageMeetingMinutes: 27,
  totalCompletedMeetings: 210,
  topHosts: [
    {
      id: 'u-3',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      hostedCount: 41,
      totalDurationMinutes: 980,
    },
  ],
  peakConcurrencyByHour: hourlySeries(),
  dailyActiveUsers: dailySeries(30),
};

export const accounts: { items: AdminAccountDto[] } = {
  items: [
    {
      id: 'a-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      role: { id: 'role_sys_admin', name: 'Administrator', permissionType: 'ALL' },
      avatar: null,
      createdAt: '2026-01-05T09:00:00.000Z',
      lastLoginAt: '2026-05-19T18:00:00.000Z',
    },
    {
      id: 'a-2',
      email: 'bob@example.com',
      name: 'Bob Admin',
      role: { id: 'role_sys_member', name: 'Member', permissionType: 'CUSTOM' },
      avatar: null,
      createdAt: '2026-02-15T09:00:00.000Z',
      lastLoginAt: null,
    },
  ],
};

export const invites: AdminInviteListResponseDto = { items: [] };

export const branding: AdminBrandingDto = {
  appName: 'Acme Meet',
  logoUrl: null,
  accentColor: 'indigo',
};

export const configuration: WorkspaceConfigDto = {
  defaultMeetingTitle: 'Team Sync',
  allowGuestJoin: true,
  maxMeetingMinutes: 60,
};

export const inviteLookup: AdminInviteLookupDto = {
  email: 'invitee@example.com',
  name: 'New Admin',
  role: { id: 'role_sys_member', name: 'Member', permissionType: 'CUSTOM' },
  expiresAt: '2026-06-01T00:00:00.000Z',
};

export const groupsList: { items: AdminGroupDto[] } = {
  items: [
    { id: 'g-1', title: 'Product launch', memberCount: 2, createdAt: '2026-02-10T09:00:00.000Z' },
    { id: 'g-2', title: 'Design crit', memberCount: 1, createdAt: '2026-02-12T09:00:00.000Z' },
  ],
};

export const meetingDetail = {
  ...meetingsList.items[0],
  participants: [
    {
      id: 'p-1',
      userId: 'u-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar: null,
      role: 'HOST' as const,
      joinedAt: '2026-05-20T09:00:00.000Z',
      leftAt: null,
    },
  ],
};

export function meetingsDatagrid(items: AdminMeetingDto[]): DatagridResponseDto {
  return {
    resource: 'meetings',
    columns: [
      { key: 'title', label: 'Title', type: 'text', sortable: true },
      { key: 'host', label: 'Host', type: 'text', sortable: true },
      {
        key: 'participants',
        label: 'Participants',
        type: 'number',
        sortable: true,
        align: 'right',
      },
      { key: 'messages', label: 'Messages', type: 'number', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', type: 'badge', sortable: false },
      { key: 'startedAt', label: 'Started', type: 'datetime', sortable: true },
      { key: 'actions', label: 'Actions', type: 'custom', sortable: false, align: 'right' },
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'WAITING', label: 'Waiting' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'ENDED', label: 'Ended' },
        ],
      },
    ],
    actions: [
      { key: 'view', label: 'View', scope: 'row', permission: 'meetings.view' },
      { key: 'end', label: 'End meeting', scope: 'row', permission: 'meetings.force-end' },
      {
        key: 'delete',
        label: 'Delete',
        icon: 'trash',
        style: 'danger',
        confirm: true,
        scope: 'row',
        permission: 'meetings.delete',
      },
      {
        key: 'end-all',
        label: 'End all active',
        style: 'danger',
        confirm: true,
        scope: 'bulk',
        permission: 'meetings.force-end',
      },
    ],
    rows: items.map((m) => ({
      ...m,
      host: m.hostName,
      participants: m.participantCount,
      messages: m.messageCount,
    })),
    pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    sort: { key: 'startedAt', dir: 'desc' },
    searchable: true,
    searchPlaceholder: 'Search meetings',
  };
}

export function accountsDatagrid(items: AdminAccountDto[]): DatagridResponseDto {
  return {
    resource: 'administrators',
    columns: [
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'email', label: 'Email', type: 'text', sortable: true },
      { key: 'roleName', label: 'Role', type: 'text', sortable: false },
      { key: 'lastLogin', label: 'Last login', type: 'datetime', sortable: true },
      { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
      { key: 'actions', label: 'Actions', type: 'custom', sortable: false, align: 'right' },
    ],
    filters: [],
    actions: [
      {
        key: 'invite',
        label: 'Invite admin',
        icon: 'mail',
        style: 'primary',
        scope: 'toolbar',
        permission: 'admin-accounts.invite',
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: 'pencil',
        scope: 'row',
        permission: 'admin-accounts.update',
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: 'trash',
        style: 'danger',
        confirm: true,
        scope: 'row',
        permission: 'admin-accounts.delete',
      },
    ],
    rows: items.map((a) => ({ ...a, roleName: a.role?.name ?? null, lastLogin: a.lastLoginAt })),
    pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    sort: { key: 'createdAt', dir: 'desc' },
    searchable: true,
    searchPlaceholder: 'Search admins',
  };
}

export function rolesDatagrid(items: RoleListResponseDto['items']): DatagridResponseDto {
  return {
    resource: 'roles',
    columns: [
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'permissions', label: 'Permissions', type: 'number', sortable: false, align: 'right' },
      { key: 'members', label: 'Members', type: 'number', sortable: false, align: 'right' },
      { key: 'system', label: 'Type', type: 'badge', sortable: false },
      { key: 'actions', label: 'Actions', type: 'custom', sortable: false, align: 'right' },
    ],
    filters: [],
    actions: [
      {
        key: 'create',
        label: 'Create role',
        icon: 'plus',
        style: 'primary',
        scope: 'toolbar',
        permission: 'roles.create',
      },
      { key: 'edit', label: 'Edit', icon: 'pencil', scope: 'row', permission: 'roles.update' },
      {
        key: 'delete',
        label: 'Delete',
        icon: 'trash',
        style: 'danger',
        confirm: true,
        scope: 'row',
        permission: 'roles.delete',
      },
    ],
    rows: items.map((r) => ({ ...r, members: r.memberCount, system: r.isSystem })),
    pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    sort: { key: 'name', dir: 'asc' },
    searchable: true,
    searchPlaceholder: 'Search roles',
  };
}

export function usersDatagrid(items: AdminUserListResponseDto['items']): DatagridResponseDto {
  return {
    resource: 'users',
    columns: [
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'email', label: 'Email', type: 'text', sortable: true },
      { key: 'meetingsHosted', label: 'Hosted', type: 'number', sortable: true, align: 'right' },
      { key: 'createdAt', label: 'Joined', type: 'datetime', sortable: true },
      { key: 'actions', label: 'Actions', type: 'custom', sortable: false, align: 'right' },
    ],
    filters: [],
    actions: [
      {
        key: 'create',
        label: 'New user',
        icon: 'plus',
        style: 'primary',
        scope: 'toolbar',
        permission: 'users.create',
      },
      {
        key: 'invite',
        label: 'Invite user',
        icon: 'mail',
        scope: 'toolbar',
        permission: 'users.invite',
      },
      { key: 'edit', label: 'Edit', icon: 'pencil', scope: 'row', permission: 'users.update' },
      {
        key: 'toggle-chat',
        label: 'Toggle chat',
        icon: 'message',
        scope: 'row',
        permission: 'users.update',
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: 'trash',
        style: 'danger',
        confirm: true,
        scope: 'row',
        permission: 'users.delete',
      },
    ],
    rows: items.map((u) => ({ ...u })),
    pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    sort: { key: 'createdAt', dir: 'desc' },
    searchable: true,
    searchPlaceholder: 'Search users',
  };
}

export function groupsDatagrid(items: AdminGroupDto[]): DatagridResponseDto {
  return {
    resource: 'groups',
    columns: [
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'members', label: 'Members', type: 'number', sortable: true, align: 'right' },
      { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
      { key: 'actions', label: 'Actions', type: 'custom', sortable: false, align: 'right' },
    ],
    filters: [],
    actions: [
      {
        key: 'create',
        label: 'New group',
        icon: 'plus',
        style: 'primary',
        scope: 'toolbar',
        permission: 'groups.create',
      },
      { key: 'edit', label: 'Edit', icon: 'pencil', scope: 'row', permission: 'groups.update' },
      {
        key: 'delete',
        label: 'Delete',
        icon: 'trash',
        style: 'danger',
        confirm: true,
        scope: 'row',
        permission: 'groups.delete',
      },
    ],
    rows: items.map((g) => ({ ...g, name: g.title, members: g.memberCount })),
    pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
    sort: { key: 'createdAt', dir: 'desc' },
    searchable: true,
    searchPlaceholder: 'Search groups',
  };
}

export const groupDetail: AdminGroupDetailDto = {
  id: 'g-1',
  title: 'Product launch',
  memberCount: 2,
  createdAt: '2026-02-10T09:00:00.000Z',
  members: [
    { userId: 'u-1', name: 'Ada Lovelace', email: 'ada@example.com', avatar: null },
    { userId: 'u-2', name: 'Alan Turing', email: 'alan@example.com', avatar: null },
  ],
};

export const userInvites: UserInviteListResponseDto = {
  items: [
    {
      id: 'ui-1',
      email: 'newbie@example.com',
      name: 'Nina Newbie',
      status: 'PENDING',
      invitedByName: 'Root Admin',
      expiresAt: '2026-06-10T00:00:00.000Z',
      createdAt: '2026-05-20T09:00:00.000Z',
    },
  ],
};

export const adminRoles: RoleListResponseDto = {
  items: [
    {
      id: 'role_sys_admin',
      name: 'Administrator',
      description: 'Full access - grants every permission.',
      permissionType: 'ALL',
      permissions: [],
      isSystem: true,
      memberCount: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'role_sys_member',
      name: 'Member',
      description: 'Read-only baseline access.',
      permissionType: 'CUSTOM',
      permissions: ['users.view', 'meetings.view', 'groups.view', 'analytics.view'],
      isSystem: true,
      memberCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'role_custom_analyst',
      name: 'Analyst',
      description: 'Read everything plus deep analytics.',
      permissionType: 'CUSTOM',
      permissions: ['users.view', 'meetings.view', 'analytics.view', 'analytics.view-deep'],
      isSystem: false,
      memberCount: 1,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
};

export const permissionCatalog: PermissionCatalogResponseDto = {
  tree: buildCatalogTree(PERMISSION_TREE_ADMIN, 'rbac.permissions'),
  keys: [...ADMIN_PERMISSION_KEYS],
};
