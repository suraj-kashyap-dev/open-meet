import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import type { LiveKitTokenResponseDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { SkipTransform } from '@/common/decorators/skip-transform.decorator';

import { LiveKitTokenDto } from '@/integrations/livekit/dto/livekit-token.dto';
import { LiveKitService } from '@/integrations/livekit/services/livekit.service';

@ApiTags('livekit')
@Controller('livekit')
export class LiveKitController {
  constructor(private readonly livekit: LiveKitService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mint a short-lived LiveKit room token' })
  async token(
    @Body() dto: LiveKitTokenDto,
    @CurrentUser() user: RequestUser,
  ): Promise<LiveKitTokenResponseDto> {
    return this.livekit.mintToken({
      meetingCode: dto.meetingCode,
      userId: user.id,
      name: user.name,
      isGuest: user.isGuest,
      guestMeetingCode: user.guestMeetingCode,
    });
  }

  @Public()
  @SkipTransform()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  @ApiOperation({ summary: 'Receive LiveKit server webhook events' })
  async webhook(
    @Req() req: FastifyRequest,
    @Headers('authorization') auth: string | undefined,
  ): Promise<{ ok: true }> {
    const raw =
      typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : JSON.stringify(req.body ?? {});

    await this.livekit.receiveWebhook(raw, auth);

    return { ok: true };
  }
}
