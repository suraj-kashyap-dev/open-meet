import { IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptAdminInviteDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}
