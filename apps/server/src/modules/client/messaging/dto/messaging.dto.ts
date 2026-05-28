import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ChatMessagePriority } from '@open-meet/types';

export class OpenDirectBodyDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;
}

export class ListConversationsQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  includeHidden?: boolean;
}

export class MessagesHistoryQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SendMessageBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  attachmentIds?: string[];

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsIn(Object.values(ChatMessagePriority))
  priority?: ChatMessagePriority;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientNonce?: string;
}

export class EditMessageBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;
}

export class ForwardMessageBodyDto {
  @IsString()
  @MinLength(1)
  targetConversationId!: string;
}

export class ReactionBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji!: string;
}

export class CreatePollBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options!: string[];

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;
}

export class VotePollBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  optionIds!: string[];
}

export class MarkReadBodyDto {
  @IsOptional()
  @IsString()
  messageId?: string;
}

export class TeammatesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class ConversationStateBodyDto {
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsBoolean()
  manualUnread?: boolean;
}

export class GifsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
