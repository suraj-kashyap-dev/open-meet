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
  avatar?: string | null;
  timezone?: string;
  language?: string;
  bio?: string | null;
  newPassword?: string;
}
