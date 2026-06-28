import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import {
  CurrentUser,
  type RequestUser,
} from '../../../../common/decorators/current-user.decorator';
import { ApiErrorCode } from '@open-meet/types';

import {
  AddGroupMembersBodyDto,
  CreateGroupBodyDto,
  TransferGroupOwnershipBodyDto,
  UpdateGroupBodyDto,
  UpdateGroupMemberRoleBodyDto,
} from '../dto/groups.dto';
import { GroupsService } from '../services/groups.service';

@ApiTags('messaging-groups')
@Controller('messaging/groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateGroupBodyDto) {
    return this.groups.create(user.id, {
      title: body.title,
      description: body.description ?? null,
      memberIds: body.memberIds,
    });
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateGroupBodyDto,
  ) {
    return this.groups.update(id, user.id, body);
  }

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Upload or replace a group profile image' })
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
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

    return this.groups.uploadAvatar(id, user.id, {
      buffer: await part.toBuffer(),
      mime: part.mimetype || 'application/octet-stream',
    });
  }

  @Delete(':id/avatar')
  @ApiOperation({ summary: 'Remove a group profile image' })
  removeAvatar(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.groups.removeAvatar(id, user.id);
  }

  @Post(':id/members')
  addMembers(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: AddGroupMembersBodyDto,
  ) {
    return this.groups.addMembers(id, user.id, body.userIds, body.history);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.groups.removeMember(id, user.id, userId);
  }

  @Post(':id/members/:userId/role')
  updateMemberRole(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateGroupMemberRoleBodyDto,
  ) {
    return this.groups.updateMemberRole(id, user.id, userId, body.role);
  }

  @Post(':id/transfer-ownership')
  transferOwnership(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: TransferGroupOwnershipBodyDto,
  ) {
    return this.groups.transferOwnership(id, user.id, body.ownerUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    await this.groups.delete(id, user.id);
  }
}
