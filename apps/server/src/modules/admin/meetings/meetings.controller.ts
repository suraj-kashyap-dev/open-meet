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
  AdminMeetingListResponseDto,
} from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminListMeetingsQueryDto } from './dto/list-meetings-query.dto';
import { AdminMeetingsService } from './meetings.service';

@ApiTags('admin-meetings')
@Controller('admin/meetings')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminMeetingsController {
  constructor(private readonly meetings: AdminMeetingsService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of meetings with optional search + status filter' })
  list(@Query() query: AdminListMeetingsQueryDto): Promise<AdminMeetingListResponseDto> {
    return this.meetings.list(query);
  }

  @Post('end-all-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-end every meeting currently in ACTIVE state' })
  bulkEnd(): Promise<AdminBulkEndResponseDto> {
    return this.meetings.bulkEndActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single meeting with full participant list' })
  getOne(@Param('id') id: string): Promise<AdminMeetingDetailDto> {
    return this.meetings.getById(id);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-end a single meeting and close its LiveKit room' })
  forceEnd(@Param('id') id: string): Promise<AdminMeetingDto> {
    return this.meetings.forceEnd(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hard-delete a meeting and cascade chat/participants' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.meetings.delete(id);
  }

  @Post(':id/participants/:userId/kick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a single participant from a live LiveKit room' })
  kick(@Param('id') id: string, @Param('userId') userId: string): Promise<{ kicked: true }> {
    return this.meetings.kickParticipant(id, userId);
  }
}
