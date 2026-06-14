import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  AdminBulkEndResponseDto,
  AdminMeetingDetailDto,
  AdminMeetingDto,
  DatagridResponseDto,
} from '@open-meet/types';

import { Public } from '@/common/decorators/public.decorator';

import { AdminAuthGuard } from '@/modules/admin/auth/guards/admin-auth.guard';
import { AdminPermissionsGuard } from '@/modules/admin/rbac/admin-permissions.guard';
import { RequirePermissions } from '@/modules/admin/rbac/decorators/require-permissions.decorator';
import { AdminMeetingsDatagridQueryDto } from '@/modules/admin/meetings/dto/meetings-datagrid-query.dto';
import { AdminMeetingsService } from '@/modules/admin/meetings/services/meetings.service';

@ApiTags('admin-meetings')
@Controller('admin/meetings')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminMeetingsController {
  constructor(private readonly meetings: AdminMeetingsService) {}

  @Get('datagrid')
  @RequirePermissions('meetings.view')
  @ApiOperation({ summary: 'Server-driven datagrid (schema + rows) for meetings' })
  datagrid(
    @Query() query: AdminMeetingsDatagridQueryDto,
  ): Promise<DatagridResponseDto<AdminMeetingDto>> {
    return this.meetings.datagrid(query);
  }

  @Post('end-all-active')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('meetings.force-end')
  @ApiOperation({ summary: 'Force-end every meeting currently in ACTIVE state' })
  bulkEnd(): Promise<AdminBulkEndResponseDto> {
    return this.meetings.bulkEndActive();
  }

  @Get(':id')
  @RequirePermissions('meetings.view')
  @ApiOperation({ summary: 'Single meeting with full participant list' })
  getOne(@Param('id') id: string): Promise<AdminMeetingDetailDto> {
    return this.meetings.getById(id);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('meetings.force-end')
  @ApiOperation({ summary: 'Force-end a single meeting and close its LiveKit room' })
  forceEnd(@Param('id') id: string): Promise<AdminMeetingDto> {
    return this.meetings.forceEnd(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('meetings.delete')
  @ApiOperation({ summary: 'Hard-delete a meeting and cascade chat/participants' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.meetings.delete(id);
  }

  @Post(':id/participants/:userId/kick')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('meetings.kick')
  @ApiOperation({ summary: 'Remove a single participant from a live LiveKit room' })
  kick(@Param('id') id: string, @Param('userId') userId: string): Promise<{ kicked: true }> {
    return this.meetings.kickParticipant(id, userId);
  }
}
