import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ApiEnv } from '@open-meet/config';
import type { VapidPublicKeyDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../../../common/decorators/current-user.decorator';
import { SubscribePushDto, UnsubscribePushDto } from './dto/subscribe-push.dto';
import { PushService } from './push.service';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(
    private readonly push: PushService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  @Get('vapid-public-key')
  @Public()
  @ApiOperation({ summary: 'Public VAPID key for the browser push subscription' })
  vapidPublicKey(): VapidPublicKeyDto {
    return { publicKey: this.config.get('VAPID_PUBLIC_KEY', { infer: true }) ?? '' };
  }

  @Post('subscribe')
  @HttpCode(204)
  @ApiOperation({ summary: 'Register a browser web-push subscription for the current user' })
  async subscribe(
    @CurrentUser() user: RequestUser,
    @Body() body: SubscribePushDto,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
  ): Promise<void> {
    const ua = req.headers['user-agent'];
    await this.push.subscribe({
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: Array.isArray(ua) ? ua[0] : (ua ?? null),
    });
  }

  @Post('unsubscribe')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a browser web-push subscription for the current user' })
  async unsubscribe(
    @CurrentUser() user: RequestUser,
    @Body() body: UnsubscribePushDto,
  ): Promise<void> {
    await this.push.unsubscribe(user.id, body.endpoint);
  }
}
