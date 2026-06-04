export interface PublicConfigDto {
  appName: string;
  logoUrl: string | null;
  gifsEnabled: boolean;
  accentColor: string;
}

export interface AdminBrandingDto {
  appName: string;
  logoUrl: string | null;
  accentColor: string;
}

export interface UpdateBrandingInput {
  appName?: string;
  accentColor?: string;
}

export interface WorkspaceConfigDto {
  defaultMeetingTitle: string;
  allowGuestJoin: boolean;
  maxMeetingMinutes: number | null;
}

export interface UpdateWorkspaceConfigInput {
  defaultMeetingTitle?: string;
  allowGuestJoin?: boolean;
  maxMeetingMinutes?: number | null;
}
