import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type PublicUserDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../../common/decorators/current-user.decorator';
import { ChatPermissionsRepository } from '../messaging/chat-permissions.repository';

import { AuthService } from './auth.service';

/**
 * Peer-visible user data. Auth-required ("public" = visible to other workspace
 * users, not the open internet). Honors the target's profileVisibility.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly permissions: ChatPermissionsRepository,
  ) {}

  @Get(':id/public')
  @ApiOperation({ summary: "Get a peer's profile (honors profileVisibility)" })
  async publicProfile(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<PublicUserDto> {
    return this.auth.getPublicProfile(user.id, id, () =>
      this.permissions.haveSharedSurface(user.id, id),
    );
  }
}
