import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMeetingDto {
  @ApiPropertyOptional({ example: 'Weekly sync' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
