import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ConversationMemberRole } from '@open-meet/types';

import { ShareHistoryInputDto } from '../../../../common/dto/share-history.dto';

const TITLE_MIN = 1;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 280;
const MEMBER_LIMIT = 100;

export class CreateGroupBodyDto {
  @IsString()
  @MinLength(TITLE_MIN)
  @MaxLength(TITLE_MAX)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX)
  description?: string | null;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(MEMBER_LIMIT)
  @IsString({ each: true })
  memberIds!: string[];
}

export class UpdateGroupBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(TITLE_MIN)
  @MaxLength(TITLE_MAX)
  title?: string;

  @IsOptional()
  @MaxLength(DESCRIPTION_MAX)
  description?: string | null;
}

export class AddGroupMembersBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MEMBER_LIMIT)
  @IsString({ each: true })
  userIds!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ShareHistoryInputDto)
  history?: ShareHistoryInputDto;
}

export class UpdateGroupMemberRoleBodyDto {
  @IsEnum(ConversationMemberRole)
  role!: ConversationMemberRole;
}
