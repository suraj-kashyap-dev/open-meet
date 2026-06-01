import type { RoleSummaryDto } from './rbac';

export interface AdminDto {
  id: string;
  email: string;
  name: string;
  /** Admin's RBAC role summary. Null only during the transition window for legacy data. */
  role: RoleSummaryDto | null;
  avatar: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Fields the authenticated admin may change on their own profile. */
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

/**
 * Returned by `GET /api/admin/auth/me`. Bundles identity + RBAC context so the
 * admin frontend can drive `useCan(...)` without a second round-trip.
 */
export interface AdminMeResponseDto {
  admin: AdminDto;
  /** Mirrors `admin.role` for convenience; `null` when the admin has no role assigned. */
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
    departments: number;
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
  /** Whether this user may create group conversations (admin-set). */
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

/** Fields an authorised admin may change on an existing admin account. */
export interface AdminUpdateAccountDto {
  name?: string;
  /** Reassign the admin to a different RBAC role. */
  roleId?: string;
}

export interface AdminCreateAccountDto {
  email: string;
  name: string;
  password: string;
  /** RBAC role for the new admin. Defaults to the seeded Member role. */
  roleId?: string;
}

export const AdminInviteStatus = {
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
} as const;

export type AdminInviteStatus = (typeof AdminInviteStatus)[keyof typeof AdminInviteStatus];

/** Payload to invite a new admin by email (no password - they set their own). */
export interface AdminCreateInviteDto {
  email: string;
  name: string;
  /** RBAC role the invitee will receive when they accept. Defaults to Member. */
  roleId?: string;
}

/** A pending admin invite, as shown in the console. */
export interface AdminInviteDto {
  id: string;
  email: string;
  name: string;
  /** RBAC role the invitee will receive on accept. */
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

/** Payload the invitee submits to claim an invite and set their password. */
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
