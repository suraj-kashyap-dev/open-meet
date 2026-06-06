import { Global, Module } from '@nestjs/common';

import { DatagridService } from './datagrid.service';

@Global()
@Module({
  providers: [DatagridService],
  exports: [DatagridService],
})
export class DatagridModule {}
