import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { PublicConfigDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';
import { BrandingService } from '../services/branding.service';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly branding: BrandingService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public app config (name + logo) consumed by the web and admin apps' })
  getPublic(): Promise<PublicConfigDto> {
    return this.branding.getPublicConfig();
  }
}
