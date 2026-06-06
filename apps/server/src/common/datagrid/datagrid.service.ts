import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';

import type { DatagridResponseDto } from '@open-meet/types';

import type { DatagridDefinition } from './datagrid-definition';
import { buildDatagrid, type DatagridQueryInput } from './datagrid.util';

@Injectable()
export class DatagridService {
  constructor(private readonly i18n: I18nService) {}

  private get lang(): string {
    return I18nContext.current()?.lang ?? 'en';
  }

  build<TRow>(
    def: DatagridDefinition,
    data: { rows: TRow[]; total: number; query: DatagridQueryInput },
  ): DatagridResponseDto<TRow> {
    const lang = this.lang;

    return buildDatagrid(def, data, (key) => this.i18n.translate(key, { lang }) as string);
  }
}
