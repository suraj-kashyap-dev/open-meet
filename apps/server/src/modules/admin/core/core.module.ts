import { Module } from '@nestjs/common';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminRepository } from './repositories/admin.repository';
import { AdminBootstrapService } from './services/bootstrap.service';

@Module({
  imports: [AdminRbacModule],
  providers: [AdminRepository, AdminBootstrapService],
  exports: [AdminRepository],
})
export class AdminCoreModule {}
