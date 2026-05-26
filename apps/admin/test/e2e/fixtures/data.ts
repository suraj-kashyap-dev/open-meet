import type {
  AdminAccountListResponseDto,
  AdminBrandingDto,
  AdminDeepAnalyticsDto,
  AdminDto,
  AdminInviteListResponseDto,
  AdminInviteLookupDto,
  AdminLoginResponseDto,
  AdminMeetingListResponseDto,
  AdminStatsOverviewDto,
  AdminUserListResponseDto,
  WorkspaceConfigDto,
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
  role: 'SUPERADMIN',
  avatar: null,
  createdAt: '2026-01-02T09:00:00.000Z',
  lastLoginAt: '2026-05-20T08:30:00.000Z',
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
      role: 'SUPERADMIN',
      avatar: null,
      createdAt: '2026-01-05T09:00:00.000Z',
      lastLoginAt: '2026-05-19T18:00:00.000Z',
    },
    {
      id: 'a-2',
      email: 'bob@example.com',
      name: 'Bob Admin',
      role: 'ADMIN',
      avatar: null,
      createdAt: '2026-02-15T09:00:00.000Z',
      lastLoginAt: null,
    },
  ],
};

export const invites: AdminInviteListResponseDto = { items: [] };

export const branding: AdminBrandingDto = { appName: 'Acme Meet', logoUrl: null };

export const configuration: WorkspaceConfigDto = {
  defaultMeetingTitle: 'Team Sync',
  allowGuestJoin: true,
  maxMeetingMinutes: 60,
};

export const inviteLookup: AdminInviteLookupDto = {
  email: 'invitee@example.com',
  name: 'New Admin',
  role: 'ADMIN',
  expiresAt: '2026-06-01T00:00:00.000Z',
};
