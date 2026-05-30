import { IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptUserInviteDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
