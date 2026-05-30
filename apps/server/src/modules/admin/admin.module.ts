import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { LiveKitModule } from '../../integrations/livekit/livekit.module';
import { MailModule } from '../../integrations/mail/mail.module';
import { AppConfigModule } from '../config/config.module';

import { AdminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { AdminAvatarsService } from './auth/admin-avatars.service';
import { AdminJwtStrategy } from './auth/strategies/admin-jwt.strategy';
import { AdminAnalyticsController } from './analytics/analytics.controller';
import { AdminAnalyticsService } from './analytics/analytics.service';
import { AdminAnalyticsRepository } from './analytics/analytics.repository';
import { AdminMeetingsController } from './meetings/meetings.controller';
import { AdminMeetingsService } from './meetings/meetings.service';
import { AdminMeetingsRepository } from './meetings/meetings.repository';
import { AdminAccountsController } from './accounts/accounts.controller';
import { AdminInviteController } from './accounts/invite.controller';
import { AdminAccountsService } from './accounts/accounts.service';
import { AdminInviteRepository } from './accounts/admin-invite.repository';
import { AdminUsersController } from './users/users.controller';
import { AdminUsersService } from './users/users.service';
import { AdminUsersRepository } from './users/users.repository';
import { AdminUserInviteService } from './users/user-invite.service';
import { AdminUserInviteRepository } from './users/user-invite.repository';
import { AdminTeamsController } from './teams/teams.controller';
import { AdminTeamsService } from './teams/teams.service';
import { AdminTeamsRepository } from './teams/teams.repository';
import { AdminChannelsService } from './teams/channels.service';
import { AdminChannelsRepository } from './teams/channels.repository';
import { AdminGroupsController } from './groups/groups.controller';
import { AdminGroupsService } from './groups/groups.service';
import { AdminGroupsRepository } from './groups/groups.repository';
import { AdminBrandingController } from './branding/branding.controller';
import { AdminConfigurationController } from './configuration/configuration.controller';
import { AdminRepository } from './admin.repository';
import { AdminBootstrapService } from './bootstrap.service';
import { AdminRbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    LiveKitModule,
    MailModule,
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
    AdminTeamsController,
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
    AdminTeamsService,
    AdminTeamsRepository,
    AdminChannelsService,
    AdminChannelsRepository,
    AdminGroupsService,
    AdminGroupsRepository,
    AdminBootstrapService,
  ],
})
export class AdminModule {}
