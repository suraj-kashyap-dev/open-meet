import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { WorkspaceConfigDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';
import { WorkspaceConfigService } from '../../config/workspace-config.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@ApiTags('admin-configuration')
@Controller('admin/configuration')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminConfigurationController {
  constructor(private readonly config: WorkspaceConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace configuration' })
  getConfig(): Promise<WorkspaceConfigDto> {
    return this.config.getConfig();
  }

  @Patch()
  @ApiOperation({ summary: 'Update workspace configuration' })
  update(@Body() dto: UpdateConfigurationDto): Promise<WorkspaceConfigDto> {
    return this.config.updateConfig(dto);
  }
}
