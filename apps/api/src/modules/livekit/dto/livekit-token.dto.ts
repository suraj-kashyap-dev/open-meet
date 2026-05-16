import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LiveKitTokenDto {
  @ApiProperty({ example: 'abcd-efgh-ijkl' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  meetingCode!: string;
}
