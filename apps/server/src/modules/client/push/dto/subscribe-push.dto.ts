import { Type } from 'class-transformer';
import { IsObject, IsString, MinLength, ValidateNested } from 'class-validator';

export class PushKeysDto {
  @IsString()
  @MinLength(1)
  p256dh!: string;

  @IsString()
  @MinLength(1)
  auth!: string;
}

export class SubscribePushDto {
  @IsString()
  @MinLength(1)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class UnsubscribePushDto {
  @IsString()
  @MinLength(1)
  endpoint!: string;
}
