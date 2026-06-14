import { Module } from '@nestjs/common';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminGroupsController } from './controllers/groups.controller';
import { AdminGroupsService } from './services/groups.service';
import { AdminGroupsRepository } from './repositories/groups.repository';

@Module({
  imports: [AdminRbacModule],
  controllers: [AdminGroupsController],
  providers: [AdminGroupsService, AdminGroupsRepository],
})
export class AdminGroupsModule {}
