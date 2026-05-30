import type {
  AdminAccountListResponseDto,
  AdminBrandingDto,
  AdminDeepAnalyticsDto,
  AdminDto,
  AdminGroupDetailDto,
  AdminGroupListResponseDto,
  AdminInviteListResponseDto,
  AdminInviteLookupDto,
  AdminLoginResponseDto,
  AdminMeResponseDto,
  AdminMeetingListResponseDto,
  AdminStatsOverviewDto,
  AdminTeamDetailDto,
  AdminTeamListResponseDto,
  AdminUserListResponseDto,
  PermissionCatalogResponseDto,
  RoleListResponseDto,
  UserInviteListResponseDto,
  WorkspaceConfigDto,
} from '@open-meet/types';
import {
  ADMIN_PERMISSION_KEYS,
  PERMISSION_TREE_ADMIN,
  PERMISSION_TREE_USER,
  USER_PERMISSION_KEYS,
  buildCatalogTree,
} from '@open-meet/types';

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
  totals: { users: 128, meetings: 342, activeMeetings: 3, messagesLast24h: 87 },
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
      createdAt: '2026-03-01T11:30:00.000Z',
      meetingsHosted: 4,
      meetingsAttended: 9,
    },
  ],
};

export const meetingsList: AdminMeetingListResponseDto = {
  page: 1,
  pageSize: 20,
  total: 1,
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

export const accounts: AdminAccountListResponseDto = {
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
  userCanCreateGroups: false,
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

export const teamsList: AdminTeamListResponseDto = {
  items: [
    { id: 't-1', name: 'Engineering', memberCount: 2, createdAt: '2026-02-01T09:00:00.000Z' },
    { id: 't-2', name: 'Marketing', memberCount: 1, createdAt: '2026-02-05T09:00:00.000Z' },
  ],
};

export const teamDetail: AdminTeamDetailDto = {
  id: 't-1',
  name: 'Engineering',
  memberCount: 2,
  createdAt: '2026-02-01T09:00:00.000Z',
  members: [
    {
      userId: 'u-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar: null,
      joinedAt: '2026-02-01T09:05:00.000Z',
    },
    {
      userId: 'u-2',
      name: 'Alan Turing',
      email: 'alan@example.com',
      avatar: null,
      joinedAt: '2026-02-02T09:05:00.000Z',
    },
  ],
};

export const groupsList: AdminGroupListResponseDto = {
  items: [
    { id: 'g-1', title: 'Product launch', memberCount: 2, createdAt: '2026-02-10T09:00:00.000Z' },
    { id: 'g-2', title: 'Design crit', memberCount: 1, createdAt: '2026-02-12T09:00:00.000Z' },
  ],
};

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
      description: 'Full access — grants every permission.',
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
      permissions: ['users.view', 'meetings.view', 'teams.view', 'groups.view', 'analytics.view'],
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

export const userRoles: RoleListResponseDto = {
  items: [
    {
      id: 'urole_sys_member',
      name: 'Member',
      description: 'Standard active user.',
      permissionType: 'CUSTOM',
      permissions: [
        'meetings.create',
        'meetings.schedule',
        'meetings.host',
        'chat.send',
        'chat.react',
        'chat.upload',
      ],
      isSystem: true,
      memberCount: 12,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'urole_custom_facilitator',
      name: 'Facilitator',
      description: 'Hosts and runs polls.',
      permissionType: 'CUSTOM',
      permissions: [
        'meetings.create',
        'meetings.schedule',
        'meetings.host',
        'chat.send',
        'chat.react',
        'chat.upload',
        'chat.polls.create',
      ],
      isSystem: false,
      memberCount: 3,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
};

export const userPermissionCatalog: PermissionCatalogResponseDto = {
  tree: buildCatalogTree(PERMISSION_TREE_USER, 'rbac.user-permissions'),
  keys: [...USER_PERMISSION_KEYS],
};
