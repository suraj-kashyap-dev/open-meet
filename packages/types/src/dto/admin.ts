import type { RoleSummaryDto } from './rbac';

export interface AdminDto {
  id: string;
  email: string;
  name: string;
  role: RoleSummaryDto | null;
  avatar: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUpdateProfileDto {
  name?: string;
}

export interface AdminChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AdminLoginRequestDto {
  email: string;
  password: string;
}

export interface AdminLoginResponseDto {
  admin: AdminDto;
}

export interface AdminMeResponseDto {
  admin: AdminDto;
  role: RoleSummaryDto | null;
  grantedSet: string[];
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

export interface AdminUpcomingMeetingDto {
  id: string;
  code: string;
  title: string | null;
  hostName: string;
  hostEmail: string;
  scheduledFor: string;
  durationMin: number | null;
  recurrence: string | null;
  inviteeCount: number;
}

export interface AdminStatsOverviewDto {
  totals: {
    users: number;
    meetings: number;
    activeMeetings: number;
    messagesLast24h: number;
    groups: number;
  };
  trends: {
    signups: DailyCountPoint[];
    meetings: DailyCountPoint[];
  };
  recentMeetings: RecentMeetingDto[];
  upcomingMeetings: AdminUpcomingMeetingDto[];
}

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  language: string;
  bio: string | null;
  chatDisabled: boolean;
  canCreateGroups: boolean;
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
  chatDisabled?: boolean;
  canCreateGroups?: boolean;
}

export interface AdminCreateUserDto {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  language?: string;
  bio?: string | null;
  canCreateGroups?: boolean;
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
  role: RoleSummaryDto | null;
  avatar: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminAccountListResponseDto {
  items: AdminAccountDto[];
}

export interface AdminUpdateAccountDto {
  name?: string;
  roleId?: string;
}

export interface AdminCreateAccountDto {
  email: string;
  name: string;
  password: string;
  roleId?: string;
}

export const AdminInviteStatus = {
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
} as const;

export type AdminInviteStatus = (typeof AdminInviteStatus)[keyof typeof AdminInviteStatus];

export interface AdminCreateInviteDto {
  email: string;
  name: string;
  roleId?: string;
}

export interface AdminInviteDto {
  id: string;
  email: string;
  name: string;
  role: RoleSummaryDto | null;
  status: AdminInviteStatus;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AdminInviteListResponseDto {
  items: AdminInviteDto[];
}

export interface AdminInviteLookupDto {
  email: string;
  name: string;
  role: RoleSummaryDto | null;
  expiresAt: string;
}

export interface AdminAcceptInviteDto {
  token: string;
  password: string;
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
