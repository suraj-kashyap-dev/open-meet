import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { LiveKitModule } from '../../integrations/livekit/livekit.module';
import { MailModule } from '../../integrations/mail/mail.module';
import { MessagingModule } from '../client/messaging/messaging.module';
import { AppConfigModule } from '../config/config.module';

import { AdminAuthController } from './auth/controllers/auth.controller';
import { AdminAuthService } from './auth/services/auth.service';
import { AdminAvatarsService } from './auth/services/admin-avatars.service';
import { AdminJwtStrategy } from './auth/strategies/admin-jwt.strategy';
import { AdminAnalyticsController } from './analytics/controllers/analytics.controller';
import { AdminAnalyticsService } from './analytics/services/analytics.service';
import { AdminAnalyticsRepository } from './analytics/repositories/analytics.repository';
import { AdminMeetingsController } from './meetings/controllers/meetings.controller';
import { AdminMeetingsService } from './meetings/services/meetings.service';
import { AdminMeetingsRepository } from './meetings/repositories/meetings.repository';
import { AdminAccountsController } from './accounts/controllers/accounts.controller';
import { AdminInviteController } from './accounts/controllers/invite.controller';
import { AdminAccountsService } from './accounts/services/accounts.service';
import { AdminInviteRepository } from './accounts/repositories/admin-invite.repository';
import { AdminUsersController } from './users/controllers/users.controller';
import { AdminUsersService } from './users/services/users.service';
import { AdminUsersRepository } from './users/repositories/users.repository';
import { AdminUserInviteService } from './users/services/user-invite.service';
import { AdminUserInviteRepository } from './users/repositories/user-invite.repository';
import { AdminGroupsController } from './groups/controllers/groups.controller';
import { AdminGroupsService } from './groups/services/groups.service';
import { AdminGroupsRepository } from './groups/repositories/groups.repository';
import { AdminBrandingController } from './branding/controllers/branding.controller';
import { AdminConfigurationController } from './configuration/controllers/configuration.controller';
import { AdminRepository } from './repositories/admin.repository';
import { AdminBootstrapService } from './services/bootstrap.service';
import { AdminRbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    LiveKitModule,
    MailModule,
    MessagingModule,
    AppConfigModule,
    AdminRbacModule,
  ],
  controllers: [
    AdminAuthController,
    AdminAnalyticsController,
    AdminMeetingsController,
    AdminAccountsController,
    AdminInviteController,
    AdminUsersController,
    AdminGroupsController,
    AdminBrandingController,
    AdminConfigurationController,
  ],
  providers: [
    AdminAuthService,
    AdminAvatarsService,
    AdminRepository,
    AdminJwtStrategy,
    AdminAnalyticsService,
    AdminAnalyticsRepository,
    AdminMeetingsService,
    AdminMeetingsRepository,
    AdminAccountsService,
    AdminInviteRepository,
    AdminUsersService,
    AdminUsersRepository,
    AdminUserInviteService,
    AdminUserInviteRepository,
    AdminGroupsService,
    AdminGroupsRepository,
    AdminBootstrapService,
  ],
})
export class AdminModule {}
