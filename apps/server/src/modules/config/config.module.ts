import { Module } from '@nestjs/common';

import { BrandingRepository } from './branding.repository';
import { BrandingService } from './branding.service';
import { ConfigController } from './config.controller';
import { WorkspaceConfigRepository } from './workspace-config.repository';
import { WorkspaceConfigService } from './workspace-config.service';

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
