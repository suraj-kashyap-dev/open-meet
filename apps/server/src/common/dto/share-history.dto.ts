import { IsEnum, IsInt, Max, Min, ValidateIf } from 'class-validator';

import { ShareHistoryMode } from '@open-meet/types';

const DAYS_MAX = 3650;

export class ShareHistoryInputDto {
  @IsEnum(ShareHistoryMode)
  mode!: ShareHistoryMode;

  @ValidateIf((o: ShareHistoryInputDto) => o.mode === ShareHistoryMode.DAYS)
  @IsInt()
  @Min(1)
  @Max(DAYS_MAX)
  days?: number;
}
