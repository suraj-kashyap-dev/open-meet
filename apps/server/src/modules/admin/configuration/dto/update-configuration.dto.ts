import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  defaultMeetingTitle?: string;

  @IsOptional()
  @IsBoolean()
  allowGuestJoin?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(5)
  @Max(1440)
  maxMeetingMinutes?: number | null;
}
