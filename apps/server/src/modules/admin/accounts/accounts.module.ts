import { Module } from '@nestjs/common';

import { MailModule } from '../../../integrations/mail/mail.module';

import { AdminCoreModule } from '../core/core.module';
import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminAccountsController } from './controllers/accounts.controller';
import { AdminInviteController } from './controllers/invite.controller';
import { AdminAccountsService } from './services/accounts.service';
import { AdminInviteRepository } from './repositories/admin-invite.repository';

@Module({
  imports: [MailModule, AdminCoreModule, AdminRbacModule],
  controllers: [AdminAccountsController, AdminInviteController],
  providers: [AdminAccountsService, AdminInviteRepository],
})
export class AdminAccountsModule {}
