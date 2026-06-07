import { Global, Module } from '@nestjs/common';

import { DatagridService } from './services/datagrid.service';

@Global()
@Module({
  providers: [DatagridService],
  exports: [DatagridService],
})
export class DatagridModule {}
