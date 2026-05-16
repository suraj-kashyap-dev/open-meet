import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminStatsOverviewDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminAnalyticsService } from './analytics.service';

@ApiTags('admin-analytics')
@Controller('admin/analytics')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Aggregate counts + trend lines + recent meetings' })
  overview(): Promise<AdminStatsOverviewDto> {
    return this.analytics.overview();
  }
}
