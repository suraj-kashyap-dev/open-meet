import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminAccountDto, AdminInviteLookupDto } from '@open-meet/types';

import { Public } from '../../../../common/decorators/public.decorator';

import { AdminAccountsService } from '../services/accounts.service';
import { AcceptAdminInviteDto } from '../dto/accept-invite.dto';

@ApiTags('admin-invites')
@Controller('admin/invite')
@Public()
export class AdminInviteController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Look up a pending invite by its token' })
  lookup(@Param('token') token: string): Promise<AdminInviteLookupDto> {
    return this.accounts.lookupInvite(token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invite by setting a password' })
  accept(@Body() dto: AcceptAdminInviteDto): Promise<AdminAccountDto> {
    return this.accounts.acceptInvite(dto);
  }
}
