/**
 * Public application config served (unauthenticated) at `GET /api/config/public`.
 * Both the web and admin apps fetch this to render the live app name + logo.
 */
export interface PublicConfigDto {
  appName: string;
  logoUrl: string | null;
  /** Whether the GIF picker is available (Tenor configured on the server). */
  gifsEnabled: boolean;
  /** Brand accent — preset slug ("indigo", "blue", ...) or `#RRGGBB` hex. */
  accentColor: string;
  /** Workspace policy: when true, any user can create groups via the chat UI. */
  userCanCreateGroups: boolean;
}

/** Branding as seen by the admin console (`GET /api/admin/branding`). */
export interface AdminBrandingDto {
  appName: string;
  logoUrl: string | null;
  accentColor: string;
  userCanCreateGroups: boolean;
}

/** Request body for updating branding + workspace flags (`PATCH /api/admin/branding`). */
export interface UpdateBrandingInput {
  appName?: string;
  accentColor?: string;
  userCanCreateGroups?: boolean;
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
