/**
 * Public application config served (unauthenticated) at `GET /api/config/public`.
 * Both the web and admin apps fetch this to render the live app name + logo.
 */
export interface PublicConfigDto {
  appName: string;
  logoUrl: string | null;
  /** Whether the GIF picker is available (Tenor configured on the server). */
  gifsEnabled: boolean;
}

/** Branding as seen by the admin console (`GET /api/admin/branding`). */
export interface AdminBrandingDto {
  appName: string;
  logoUrl: string | null;
}

/** Request body for updating the application name (`PATCH /api/admin/branding`). */
export interface UpdateBrandingInput {
  appName: string;
}

/** Workspace configuration managed by admins (`GET /api/admin/configuration`). */
export interface WorkspaceConfigDto {
  defaultMeetingTitle: string;
  allowGuestJoin: boolean;
  maxMeetingMinutes: number | null;
}

/** Request body for updating workspace configuration (`PATCH /api/admin/configuration`). */
export interface UpdateWorkspaceConfigInput {
  defaultMeetingTitle?: string;
  allowGuestJoin?: boolean;
  maxMeetingMinutes?: number | null;
}
