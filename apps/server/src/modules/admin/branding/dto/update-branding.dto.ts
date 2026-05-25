import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBrandingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  appName!: string;
}
