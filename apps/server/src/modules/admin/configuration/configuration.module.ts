import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/config.module';

import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminConfigurationController } from './controllers/configuration.controller';

@Module({
  imports: [AppConfigModule, AdminRbacModule],
  controllers: [AdminConfigurationController],
})
export class AdminConfigurationModule {}
