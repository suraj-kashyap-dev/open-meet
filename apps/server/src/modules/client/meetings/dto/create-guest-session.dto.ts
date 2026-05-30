import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateGuestSessionDto {
  @ApiProperty({ example: 'Guest user' })
  @IsString()
  @MaxLength(60)
  name!: string;
}
