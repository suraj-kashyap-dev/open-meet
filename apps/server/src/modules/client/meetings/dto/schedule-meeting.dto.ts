import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ScheduleMeetingApiDto {
  @ApiProperty({ example: 'Weekly sync' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: '2026-05-20T15:00:00.000Z' })
  @IsISO8601()
  scheduledFor!: string;

  @ApiPropertyOptional({ example: 30, minimum: 5, maximum: 480 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMin?: number;

  @ApiPropertyOptional({ example: 'FREQ=WEEKLY;BYDAY=MO' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrence?: string;

  @ApiPropertyOptional({ type: [String], example: ['alice@example.com'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  invitees?: string[];
}
