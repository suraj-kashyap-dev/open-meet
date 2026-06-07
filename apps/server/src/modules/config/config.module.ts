import { Module } from '@nestjs/common';

import { BrandingRepository } from './repositories/branding.repository';
import { BrandingService } from './services/branding.service';
import { ConfigController } from './controllers/config.controller';
import { WorkspaceConfigRepository } from './repositories/workspace-config.repository';
import { WorkspaceConfigService } from './services/workspace-config.service';

@Module({
  controllers: [ConfigController],
  providers: [
    BrandingService,
    BrandingRepository,
    WorkspaceConfigService,
    WorkspaceConfigRepository,
  ],
  exports: [BrandingService, WorkspaceConfigService],
})
export class AppConfigModule {}
