import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;
}
