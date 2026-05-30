import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminAccountDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  /** RBAC role id. When omitted the new admin is assigned the seeded Member role. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  roleId?: string;
}
