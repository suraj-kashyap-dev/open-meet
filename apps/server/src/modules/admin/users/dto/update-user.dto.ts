import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminUpdateUserBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
