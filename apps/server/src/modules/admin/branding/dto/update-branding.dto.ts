import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const ACCENT_PATTERN = /^(indigo|blue|green|purple|rose|amber|teal|#[0-9a-fA-F]{6})$/;

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  appName?: string;

  @IsOptional()
  @IsString()
  @Matches(ACCENT_PATTERN, {
    message: 'accentColor must be a preset slug or a #RRGGBB hex',
  })
  accentColor?: string;
}
