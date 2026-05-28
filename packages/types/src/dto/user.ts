export const MeetingDefaultView = {
  GALLERY: 'GALLERY',
  SPEAKER: 'SPEAKER',
} as const;

export type MeetingDefaultView = (typeof MeetingDefaultView)[keyof typeof MeetingDefaultView];

export const ProfileVisibility = {
  PUBLIC: 'PUBLIC',
  PARTICIPANTS_ONLY: 'PARTICIPANTS_ONLY',
  PRIVATE: 'PRIVATE',
} as const;

export type ProfileVisibility = (typeof ProfileVisibility)[keyof typeof ProfileVisibility];

export interface MeetingPreferencesDto {
  defaultMicMuted: boolean;
  defaultCameraOff: boolean;
  defaultView: MeetingDefaultView;
  enableJoinSound: boolean;
  enableNotifications: boolean;
}

export interface PrivacySettingsDto {
  showEmailToParticipants: boolean;
  allowDirectMessages: boolean;
  profileVisibility: ProfileVisibility;
  shareUsageData: boolean;
}

export interface AppearanceSettingsDto {
  /** Preset slug ("indigo", "blue", "green", "purple", "rose", "amber", "teal")
   *  or `#RRGGBB` hex. `null` falls back to the workspace default. */
  accentColorOverride: string | null;
}

export interface UserSettingsDto {
  meetingPreferences: MeetingPreferencesDto;
  privacySettings: PrivacySettingsDto;
  appearance: AppearanceSettingsDto;
}

export const DEFAULT_MEETING_PREFERENCES: MeetingPreferencesDto = {
  defaultMicMuted: false,
  defaultCameraOff: false,
  defaultView: MeetingDefaultView.GALLERY,
  enableJoinSound: true,
  enableNotifications: true,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsDto = {
  showEmailToParticipants: true,
  allowDirectMessages: true,
  profileVisibility: ProfileVisibility.PARTICIPANTS_ONLY,
  shareUsageData: false,
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettingsDto = {
  accentColorOverride: null,
};

export const DEFAULT_USER_SETTINGS: UserSettingsDto = {
  meetingPreferences: DEFAULT_MEETING_PREFERENCES,
  privacySettings: DEFAULT_PRIVACY_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS,
};

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  language: string;
  bio: string | null;
  createdAt: string;
}

export interface UpdateProfileDto {
  name?: string;
  timezone?: string;
  language?: string;
  bio?: string | null;
}

export interface UpdateUserSettingsDto {
  meetingPreferences?: Partial<MeetingPreferencesDto>;
  privacySettings?: Partial<PrivacySettingsDto>;
  appearance?: Partial<AppearanceSettingsDto>;
}

/** A peer-visible profile. Email is gated by the target's profileVisibility. */
export interface PublicUserDto {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  email: string | null;
  /** ISO timestamp when the account joined. Hidden for PRIVATE visibility. */
  joinedAt: string | null;
  /** Effective visibility level the server applied to compute this DTO. */
  visibility: ProfileVisibility;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UploadAvatarResponseDto {
  user: UserDto;
}
