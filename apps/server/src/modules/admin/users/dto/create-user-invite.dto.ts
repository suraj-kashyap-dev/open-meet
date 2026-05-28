import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserInviteBodyDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
