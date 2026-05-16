import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'a-strong-password-1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
