import { Module } from '@nestjs/common';

import { UploadsController } from './controllers/uploads.controller';
import { UploadsRepository } from './repositories/uploads.repository';
import { UploadsService } from './services/uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRepository],
  exports: [UploadsService],
})
export class UploadsModule {}
