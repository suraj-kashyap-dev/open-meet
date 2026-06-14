import { Module } from '@nestjs/common';

import { AdminAccountsModule } from './accounts/accounts.module';
import { AdminAnalyticsModule } from './analytics/analytics.module';
import { AdminAuthModule } from './auth/auth.module';
import { AdminBrandingModule } from './branding/branding.module';
import { AdminConfigurationModule } from './configuration/configuration.module';
import { AdminCoreModule } from './core/core.module';
import { AdminGroupsModule } from './groups/groups.module';
import { AdminMeetingsModule } from './meetings/meetings.module';
import { AdminRbacModule } from './rbac/rbac.module';
import { AdminUsersModule } from './users/users.module';

@Module({
  imports: [
    AdminCoreModule,
    AdminAuthModule,
    AdminRbacModule,
    AdminAccountsModule,
    AdminUsersModule,
    AdminGroupsModule,
    AdminMeetingsModule,
    AdminAnalyticsModule,
    AdminBrandingModule,
    AdminConfigurationModule,
  ],
})
export class AdminModule {}
