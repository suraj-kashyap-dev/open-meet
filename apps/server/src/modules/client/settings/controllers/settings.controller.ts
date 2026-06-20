import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { UserSettingsDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../../../common/decorators/current-user.decorator';

import { SettingsService } from '../services/settings.service';
import { UpdateUserSettingsBodyDto } from '../dto/update-settings.dto';

@ApiTags('auth')
@Controller('auth/me/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Read the current user's meeting + privacy settings" })
  async get(@CurrentUser() user: RequestUser): Promise<UserSettingsDto> {
    return this.settings.getForUser(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Partially update meeting + privacy settings' })
  async update(
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateUserSettingsBodyDto,
  ): Promise<UserSettingsDto> {
    return this.settings.update(user.id, body);
  }
}
