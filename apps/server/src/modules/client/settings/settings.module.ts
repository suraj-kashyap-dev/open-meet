import { Module } from '@nestjs/common';

import { SettingsController } from './controllers/settings.controller';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsService } from './services/settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService, SettingsRepository],
})
export class SettingsModule {}
