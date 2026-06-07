import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { WorkspaceConfigDto } from '@open-meet/types';

import { Public } from '../../../../common/decorators/public.decorator';
import { WorkspaceConfigService } from '../../../config/services/workspace-config.service';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { AdminPermissionsGuard } from '../../rbac/admin-permissions.guard';
import { RequirePermissions } from '../../rbac/decorators/require-permissions.decorator';
import { UpdateConfigurationDto } from '../dto/update-configuration.dto';

@ApiTags('admin-configuration')
@Controller('admin/configuration')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminConfigurationController {
  constructor(private readonly config: WorkspaceConfigService) {}

  @Get()
  @RequirePermissions('configuration.view')
  @ApiOperation({ summary: 'Get workspace configuration' })
  getConfig(): Promise<WorkspaceConfigDto> {
    return this.config.getConfig();
  }

  @Patch()
  @RequirePermissions('configuration.update')
  @ApiOperation({ summary: 'Update workspace configuration' })
  update(@Body() dto: UpdateConfigurationDto): Promise<WorkspaceConfigDto> {
    return this.config.updateConfig(dto);
  }
}
