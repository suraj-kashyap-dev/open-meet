import { Module } from '@nestjs/common';

import { MailModule } from '../../../integrations/mail/mail.module';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminUsersController } from './controllers/users.controller';
import { AdminUsersService } from './services/users.service';
import { AdminUsersRepository } from './repositories/users.repository';
import { AdminUserInviteService } from './services/user-invite.service';
import { AdminUserInviteRepository } from './repositories/user-invite.repository';

@Module({
  imports: [MailModule, AdminRbacModule],
  controllers: [AdminUsersController],
  providers: [
    AdminUsersService,
    AdminUsersRepository,
    AdminUserInviteService,
    AdminUserInviteRepository,
  ],
})
export class AdminUsersModule {}
