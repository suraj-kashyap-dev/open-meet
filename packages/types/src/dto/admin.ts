export const AdminRole = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export interface AdminDto {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminLoginRequestDto {
  email: string;
  password: string;
}

export interface AdminLoginResponseDto {
  admin: AdminDto;
}

export interface DailyCountPoint {
  date: string;
  count: number;
}

export interface RecentMeetingDto {
  id: string;
  code: string;
  title: string | null;
  hostName: string;
  hostEmail: string;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  participantCount: number;
}

export interface AdminStatsOverviewDto {
  totals: {
    users: number;
    meetings: number;
    activeMeetings: number;
    messagesLast24h: number;
  };
  trends: {
    signups: DailyCountPoint[];
    meetings: DailyCountPoint[];
  };
  recentMeetings: RecentMeetingDto[];
}

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  language: string;
  bio: string | null;
  createdAt: string;
  meetingsHosted: number;
  meetingsAttended: number;
}

export interface AdminUserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AdminUserListResponseDto {
  items: AdminUserDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUpdateUserDto {
  name?: string;
  email?: string;
  timezone?: string;
  language?: string;
  bio?: string | null;
  newPassword?: string;
}

export interface AdminMeetingDto {
  id: string;
  code: string;
  title: string | null;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  hostId: string;
  hostName: string;
  hostEmail: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  durationMinutes: number | null;
  participantCount: number;
  activeParticipantCount: number;
  messageCount: number;
}

export interface AdminMeetingParticipantDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: 'HOST' | 'GUEST';
  joinedAt: string;
  leftAt: string | null;
}

export interface AdminMeetingDetailDto extends AdminMeetingDto {
  participants: AdminMeetingParticipantDto[];
}

export interface AdminMeetingListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'WAITING' | 'ACTIVE' | 'ENDED';
}

export interface AdminMeetingListResponseDto {
  items: AdminMeetingDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminBulkEndResponseDto {
  ended: number;
}

export interface AdminTopHostDto {
  id: string;
  name: string;
  email: string;
  hostedCount: number;
  totalDurationMinutes: number;
}

export interface AdminConcurrencyPointDto {
  hour: number;
  count: number;
}

export interface AdminDeepAnalyticsDto {
  averageMeetingMinutes: number;
  totalCompletedMeetings: number;
  topHosts: AdminTopHostDto[];
  peakConcurrencyByHour: AdminConcurrencyPointDto[];
  dailyActiveUsers: DailyCountPoint[];
}

export interface AdminAccountDto {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminInviteAccountDto {
  email: string;
  name: string;
  password: string;
  role?: AdminRole;
}

export interface AdminAccountListResponseDto {
  items: AdminAccountDto[];
}

export interface AdminWorkspaceSettingsDto {
  defaultMeetingTitle: string;
  allowGuestJoin: boolean;
  maxMeetingMinutes: number | null;
  banner: string | null;
}

export interface AdminUpdateWorkspaceSettingsDto {
  defaultMeetingTitle?: string;
  allowGuestJoin?: boolean;
  maxMeetingMinutes?: number | null;
  banner?: string | null;
}
