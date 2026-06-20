import { IsEnum, IsOptional } from 'class-validator';

import { DatagridQueryDto } from '../../../../common/datagrid';
import { AdminMeetingStatusFilter } from './meeting-status.enum';

export class AdminMeetingsDatagridQueryDto extends DatagridQueryDto {
  @IsOptional()
  @IsEnum(AdminMeetingStatusFilter)
  status?: AdminMeetingStatusFilter;
}
