import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendMessageGatewayDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  meetingCode!: string;

  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class JoinRoomGatewayDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  meetingCode!: string;
}

export class ReactionGatewayDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  meetingCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji!: string;
}

export class KnockRespondGatewayDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  meetingCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId!: string;

  @IsBoolean()
  admit!: boolean;
}
