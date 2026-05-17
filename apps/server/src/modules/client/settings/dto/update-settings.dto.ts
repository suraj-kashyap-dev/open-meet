import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';

import { MeetingDefaultView, ProfileVisibility } from '@open-meet/types';

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
}
