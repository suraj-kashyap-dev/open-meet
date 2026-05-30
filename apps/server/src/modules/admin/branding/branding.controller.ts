import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { ApiErrorCode, type AdminBrandingDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';
import { BrandingService } from '../../config/branding.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminPermissionsGuard } from '../rbac/admin-permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@ApiTags('admin-branding')
@Controller('admin/branding')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminBrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get()
  @RequirePermissions('branding.view')
  @ApiOperation({ summary: 'Get the current application branding' })
  getBranding(): Promise<AdminBrandingDto> {
    return this.branding.getBranding();
  }

  @Patch()
  @RequirePermissions('branding.update')
  @ApiOperation({ summary: 'Update branding (app name, accent color, group policy)' })
  async update(@Body() dto: UpdateBrandingDto): Promise<AdminBrandingDto> {
    if (dto.appName !== undefined) {
      await this.branding.updateAppName(dto.appName);
    }
    if (dto.accentColor !== undefined) {
      await this.branding.updateAccentColor(dto.accentColor);
    }
    if (dto.userCanCreateGroups !== undefined) {
      await this.branding.updateUserCanCreateGroups(dto.userCanCreateGroups);
    }
    return this.branding.getBranding();
  }

  @Post('logo')
  @RequirePermissions('branding.manage-logo')
  @ApiOperation({ summary: 'Upload a new application logo (multipart/form-data, field "file")' })
  async uploadLogo(@Req() req: FastifyRequest): Promise<AdminBrandingDto> {
    if (!req.isMultipart()) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Expected multipart/form-data',
      });
    }

    const part = await req.file();

    if (!part) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'No file provided',
      });
    }

    const buffer = await part.toBuffer();

    return this.branding.setLogo({
      buffer,
      mime: part.mimetype || 'application/octet-stream',
    });
  }

  @Delete('logo')
  @RequirePermissions('branding.manage-logo')
  @ApiOperation({ summary: 'Remove the application logo' })
  removeLogo(): Promise<AdminBrandingDto> {
    return this.branding.clearLogo();
  }
}
