import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PermissionType } from '@open-meet/types';

export class CreateRoleBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string | null;

  @IsOptional()
  @IsEnum(PermissionType)
  permissionType?: PermissionType;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string | null;

  @IsOptional()
  @IsEnum(PermissionType)
  permissionType?: PermissionType;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}

export class AssignRoleBodyDto {
  @IsString()
  @MinLength(1)
  roleId!: string;
}
