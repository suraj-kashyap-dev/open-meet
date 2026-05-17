import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { LiveKitModule } from '../../integrations/livekit/livekit.module';

import { AdminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { AdminJwtStrategy } from './auth/strategies/admin-jwt.strategy';
import { AdminAnalyticsController } from './analytics/analytics.controller';
import { AdminAnalyticsService } from './analytics/analytics.service';
import { AdminAnalyticsRepository } from './analytics/analytics.repository';
import { AdminMeetingsController } from './meetings/meetings.controller';
import { AdminMeetingsService } from './meetings/meetings.service';
import { AdminMeetingsRepository } from './meetings/meetings.repository';
import { AdminAccountsController } from './accounts/accounts.controller';
import { AdminAccountsService } from './accounts/accounts.service';
import { AdminUsersController } from './users/users.controller';
import { AdminUsersService } from './users/users.service';
import { AdminUsersRepository } from './users/users.repository';
import { AdminRepository } from './admin.repository';
import { AdminBootstrapService } from './bootstrap.service';

@Module({
  imports: [PassportModule, JwtModule.register({}), LiveKitModule],
  controllers: [
    AdminAuthController,
    AdminAnalyticsController,
    AdminMeetingsController,
    AdminAccountsController,
    AdminUsersController,
  ],
  providers: [
    AdminAuthService,
    AdminRepository,
    AdminJwtStrategy,
    AdminAnalyticsService,
    AdminAnalyticsRepository,
    AdminMeetingsService,
    AdminMeetingsRepository,
    AdminAccountsService,
    AdminUsersService,
    AdminUsersRepository,
    AdminBootstrapService,
  ],
})
export class AdminModule {}
