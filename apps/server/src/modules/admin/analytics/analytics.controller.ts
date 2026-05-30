import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminDeepAnalyticsDto, AdminStatsOverviewDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminPermissionsGuard } from '../rbac/admin-permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AdminAnalyticsService } from './analytics.service';

@ApiTags('admin-analytics')
@Controller('admin/analytics')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get('overview')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Aggregate counts + trend lines + recent meetings' })
  overview(): Promise<AdminStatsOverviewDto> {
    return this.analytics.overview();
  }

  @Get('deep')
  @RequirePermissions('analytics.view-deep')
  @ApiOperation({ summary: 'Deeper analytics: avg duration, top hosts, hourly peak, DAU' })
  deep(): Promise<AdminDeepAnalyticsDto> {
    return this.analytics.deep();
  }
}
