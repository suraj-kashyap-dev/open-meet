import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/config.module';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminBrandingController } from './controllers/branding.controller';

@Module({
  imports: [AppConfigModule, AdminRbacModule],
  controllers: [AdminBrandingController],
})
export class AdminBrandingModule {}
