import { Module } from '@nestjs/common';

import { UploadsController } from './uploads.controller';
import { UploadsRepository } from './uploads.repository';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRepository],
  exports: [UploadsService],
})
export class UploadsModule {}
