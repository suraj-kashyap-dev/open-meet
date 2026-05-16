import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
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

export class UpdateProfileDto {
  @ApiProperty({ example: 'Ada Lovelace', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'https://cdn.example.com/u/abc.png', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatar?: string | null;

  @ApiProperty({ example: 'America/New_York', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiProperty({ example: 'en', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  language?: string;

  @ApiProperty({ example: 'I build things.', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

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
