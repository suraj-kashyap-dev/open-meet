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

  // `null` clears the cap (no limit); otherwise a sane minutes range.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(5)
  @Max(1440)
  maxMeetingMinutes?: number | null;
}
