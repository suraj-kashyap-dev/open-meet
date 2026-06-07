import { Controller, Get, Query } from '@nestjs/common';

import {
  CurrentUser,
  type RequestUser,
} from '../../../../common/decorators/current-user.decorator';

import { TeammatesQueryDto } from '../dto/messaging.dto';
import { TeammatesService } from '../services/teammates.service';

@Controller('messaging/teammates')
export class TeammatesController {
  constructor(private readonly teammates: TeammatesService) {}

  @Get()
  search(@CurrentUser() user: RequestUser, @Query() query: TeammatesQueryDto) {
    return this.teammates.search(user.id, query.search);
  }
}
