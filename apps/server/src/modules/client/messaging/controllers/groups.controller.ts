import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  type RequestUser,
} from '../../../../common/decorators/current-user.decorator';

import {
  AddGroupMembersBodyDto,
  CreateGroupBodyDto,
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

  @Post(':id/members')
  addMembers(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: AddGroupMembersBodyDto,
  ) {
    return this.groups.addMembers(id, user.id, body.userIds);
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    await this.groups.delete(id, user.id);
  }
}
