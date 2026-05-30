import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeamBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateTeamBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;
}

export class AddTeamMembersBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  userIds!: string[];
}
