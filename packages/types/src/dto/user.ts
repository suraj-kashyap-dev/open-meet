export const MeetingDefaultView = {
  GALLERY: 'GALLERY',
  SPEAKER: 'SPEAKER',
} as const;

export type MeetingDefaultView =
  (typeof MeetingDefaultView)[keyof typeof MeetingDefaultView];

export const ProfileVisibility = {
  PUBLIC: 'PUBLIC',
  PARTICIPANTS_ONLY: 'PARTICIPANTS_ONLY',
  PRIVATE: 'PRIVATE',
} as const;

export type ProfileVisibility =
  (typeof ProfileVisibility)[keyof typeof ProfileVisibility];

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

export interface UserSettingsDto {
  meetingPreferences: MeetingPreferencesDto;
  privacySettings: PrivacySettingsDto;
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

export const DEFAULT_USER_SETTINGS: UserSettingsDto = {
  meetingPreferences: DEFAULT_MEETING_PREFERENCES,
  privacySettings: DEFAULT_PRIVACY_SETTINGS,
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
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UploadAvatarResponseDto {
  user: UserDto;
}
