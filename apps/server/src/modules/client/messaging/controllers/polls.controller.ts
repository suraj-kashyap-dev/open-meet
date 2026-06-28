import { Body, Controller, Param, Post } from '@nestjs/common';

import {
  CurrentUser,
  type RequestUser,
} from '../../../../common/decorators/current-user.decorator';

import { VotePollBodyDto } from '../dto/messaging.dto';
import { PollsService } from '../services/polls.service';

@Controller('messaging/polls')
export class PollsController {
  constructor(private readonly polls: PollsService) {}

  @Post(':id/vote')
  vote(
    @CurrentUser() user: RequestUser,
    @Param('id') pollId: string,
    @Body() body: VotePollBodyDto,
  ) {
    return this.polls.vote(pollId, user.id, body.optionIds);
  }
}
