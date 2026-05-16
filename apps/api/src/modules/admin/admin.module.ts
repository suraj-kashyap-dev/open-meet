import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AdminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { AdminJwtStrategy } from './auth/strategies/admin-jwt.strategy';
import { AdminAnalyticsController } from './analytics/analytics.controller';
import { AdminAnalyticsService } from './analytics/analytics.service';
import { AdminAnalyticsRepository } from './analytics/analytics.repository';
import { AdminRepository } from './admin.repository';
import { AdminBootstrapService } from './bootstrap.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController, AdminAnalyticsController],
  providers: [
    AdminAuthService,
    AdminRepository,
    AdminJwtStrategy,
    AdminAnalyticsService,
    AdminAnalyticsRepository,
    AdminBootstrapService,
  ],
})
export class AdminModule {}
