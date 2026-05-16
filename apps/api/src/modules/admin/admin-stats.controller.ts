import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminStatsOverviewDto } from '@open-meet/types';

import { Public } from '../../common/decorators/public.decorator';

import { AdminAuthGuard } from './admin-auth.guard';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('admin-stats')
@Controller('admin/stats')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Aggregate counts + trend lines + recent meetings' })
  overview(): Promise<AdminStatsOverviewDto> {
    return this.stats.overview();
  }
}
