import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminInviteDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  /** RBAC role id the invitee will receive when they accept. Defaults to Member. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  roleId?: string;
}
