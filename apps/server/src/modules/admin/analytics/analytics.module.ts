import { Module } from '@nestjs/common';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminAnalyticsController } from './controllers/analytics.controller';
import { AdminAnalyticsService } from './services/analytics.service';
import { AdminAnalyticsRepository } from './repositories/analytics.repository';

@Module({
  imports: [AdminRbacModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, AdminAnalyticsRepository],
})
export class AdminAnalyticsModule {}
