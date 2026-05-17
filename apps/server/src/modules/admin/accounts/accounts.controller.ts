import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminAccountDto, AdminAccountListResponseDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { type AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';

import { AdminAccountsService } from './accounts.service';
import { AdminInviteAccountBodyDto } from './dto/invite-admin.dto';

@ApiTags('admin-accounts')
@Controller('admin/accounts')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminAccountsController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List every admin account' })
  list(): Promise<AdminAccountListResponseDto> {
    return this.accounts.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin account' })
  invite(@Body() dto: AdminInviteAccountBodyDto): Promise<AdminAccountDto> {
    return this.accounts.invite(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an admin account (cannot delete self or last superadmin)' })
  remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminRequestUser,
  ): Promise<{ deleted: true }> {
    return this.accounts.delete(admin.id, id);
  }
}
