import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ShareHistoryInputDto } from '../../../../common/dto/share-history.dto';

export class CreateGroupBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  memberIds!: string[];
}

export class UpdateGroupBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;
}

export class AddGroupMembersBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  userIds!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ShareHistoryInputDto)
  history?: ShareHistoryInputDto;
}
