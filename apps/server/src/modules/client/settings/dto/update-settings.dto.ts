import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, Matches, ValidateIf, ValidateNested } from 'class-validator';

import { MeetingDefaultView, ProfileVisibility } from '@open-meet/types';

const ACCENT_VALUE_PATTERN = /^(indigo|blue|green|purple|rose|amber|teal|#[0-9a-fA-F]{6})$/;

export class MeetingPreferencesInputDto {
  @IsOptional()
  @IsBoolean()
  defaultMicMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultCameraOff?: boolean;

  @IsOptional()
  @IsEnum(MeetingDefaultView)
  defaultView?: MeetingDefaultView;

  @IsOptional()
  @IsBoolean()
  enableJoinSound?: boolean;

  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;
}

export class PrivacySettingsInputDto {
  @IsOptional()
  @IsBoolean()
  showEmailToParticipants?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDirectMessages?: boolean;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @IsOptional()
  @IsBoolean()
  shareUsageData?: boolean;
}

export class AppearanceSettingsInputDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(ACCENT_VALUE_PATTERN, {
    message: 'accentColorOverride must be a preset slug or a #RRGGBB hex',
  })
  accentColorOverride?: string | null;
}

export class UpdateUserSettingsBodyDto {
  @ApiProperty({ type: () => MeetingPreferencesInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingPreferencesInputDto)
  meetingPreferences?: MeetingPreferencesInputDto;

  @ApiProperty({ type: () => PrivacySettingsInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacySettingsInputDto)
  privacySettings?: PrivacySettingsInputDto;

  @ApiProperty({ type: () => AppearanceSettingsInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppearanceSettingsInputDto)
  appearance?: AppearanceSettingsInputDto;
}
